import { app } from 'electron'
import * as os from 'os'
import * as p from 'path'
import { promises as fs } from 'fs'
import * as childProcess from 'child_process'
import HyperdriveClient from 'hyperdrive-daemon-client'
import datEncoding from 'dat-encoding'
import * as pda from 'pauls-dat-api2'
import EventEmitter from 'events'
import * as logLib from '../logger'
const baseLogger = logLib.get()
const logger = baseLogger.child({category: 'hyper', subcategory: 'daemon'})

const SETUP_RETRIES = 100
const GARBAGE_COLLECT_SESSIONS_INTERVAL = 30e3
const MAX_SESSION_AGE = 300e3 // 5min
const HYPERSPACE_BIN_PATH = require.resolve('hyperspace/bin/index.js')
const HYPERSPACE_STORAGE_DIR = p.join(os.homedir(), '.hyperspace', 'storage')
const HYPERDRIVE_STORAGE_DIR = p.join(os.homedir(), '.hyperdrive', 'storage', 'cores')

// typedefs
// =

/**
* @typedef {Object} DaemonHyperdrive
* @prop {number} sessionId
* @prop {Buffer} key
* @prop {Buffer} discoveryKey
* @prop {string} url
* @prop {string} domain
* @prop {boolean} writable
* @prop {Boolean} persistSession
* @prop {Object} session
* @prop {Object} session.drive
* @prop {function(): Promise<void>} session.close
* @prop {function(Object): Promise<void>} session.configureNetwork
* @prop {function(): Promise<Object>} getInfo
* @prop {DaemonHyperdrivePDA} pda
*
* @typedef {Object} DaemonHyperdrivePDA
* @prop {Number} lastCallTime
* @prop {Number} numActiveStreams
* @prop {function(string): Promise<Object>} stat
* @prop {function(string, Object=): Promise<any>} readFile
* @prop {function(string, Object=): Promise<Array<Object>>} readdir
* @prop {function(string): Promise<number>} readSize
* @prop {function(number, string?): Promise<Array<Object>>} diff
* @prop {function(string, any, Object=): Promise<void>} writeFile
* @prop {function(string): Promise<void>} mkdir
* @prop {function(string, string): Promise<void>} copy
* @prop {function(string, string): Promise<void>} rename
* @prop {function(string, Object): Promise<void>} updateMetadata
* @prop {function(string, string|string[]): Promise<void>} deleteMetadata
* @prop {function(string): Promise<void>} unlink
* @prop {function(string, Object=): Promise<void>} rmdir
* @prop {function(string, string|Buffer): Promise<void>} mount
* @prop {function(string): Promise<void>} unmount
* @prop {function(string=): NodeJS.ReadableStream} watch
* @prop {function(): NodeJS.ReadableStream} createNetworkActivityStream
* @prop {function(): Promise<Object>} readManifest
* @prop {function(Object): Promise<void>} writeManifest
* @prop {function(Object): Promise<void>} updateManifest
*/

// globals
// =

var client // client object created by hyperdrive-daemon-client
var isControllingDaemonProcess = false // did we start the process?
var isSettingUp = true
var isShuttingDown = false
var isDaemonActive = false
var isFirstConnect = true
var daemonProcess = undefined
var sessions = {} // map of keyStr => DaemonHyperdrive
var events = new EventEmitter()

// exported apis
// =

export const on = events.on.bind(events)

export function getClient () {
  return client
}

export function getHyperspaceClient () {
  return client._client
}

export function isActive () {
  if (isFirstConnect) {
    // avoid the "inactive daemon" indicator during setup
    return true
  }
  return isDaemonActive
}

export async function getDaemonStatus () {
  if (isDaemonActive) {
    return Object.assign(await client.status(), {active: true})
  }
  return {active: false}
}

export async function setup () {
  if (isSettingUp) {
    isSettingUp = false
    // periodically close sessions
    let interval2 = setInterval(() => {
      let numClosed = 0
      let now = Date.now()
      for (let key in sessions) {
        if (sessions[key].persistSession) continue
        if (sessions[key].pda.numActiveStreams > 0) continue
        if (now - sessions[key].pda.lastCallTime < MAX_SESSION_AGE) continue
        closeHyperdriveSession(key)
        numClosed++
      }
      if (numClosed > 0) {
        logger.debug(`Closed ${numClosed} session(s) due to inactivity`)
      }
    }, GARBAGE_COLLECT_SESSIONS_INTERVAL)
    interval2.unref()

    events.on('daemon-restored', async () => {
      logger.info('Hyperdrive daemon has been restored')
    })
    events.on('daemon-stopped', async () => {
      logger.info('Hyperdrive daemon has been lost')
      isControllingDaemonProcess = false
    })
  }

  try {
    client = new HyperdriveClient()
    await client.ready()
    logger.info('Connected to an external daemon.')
    isDaemonActive = true
    isFirstConnect = false
    events.emit('daemon-restored')
    reconnectAllDriveSessions()
    return
  } catch (err) {
    logger.info('Failed to connect to an external daemon. Launching the daemon...')
    client = false
  }

  isControllingDaemonProcess = true
  logger.info('Starting daemon process, assuming process control')

  // Check which storage directory to use.
  // If .hyperspace/storage exists, use that. Otherwise use .hyperdrive/storage/cores
  const storageDir = await getDaemonStorageDir()
  var daemonProcessArgs = [HYPERSPACE_BIN_PATH, '-s', storageDir, '--no-migrate']
  logger.info(`Daemon: spawn ${app.getPath('exe')} ${daemonProcessArgs.join(' ')}`)
  daemonProcess = childProcess.spawn(app.getPath('exe'), daemonProcessArgs, {
    // stdio: [process.stdin, process.stdout, process.stderr], // DEBUG
    env: Object.assign({}, process.env, {
      ELECTRON_RUN_AS_NODE: 1,
      ELECTRON_NO_ASAR: 1
    })
  })
  daemonProcess.stdout.on('data', data => logger.info(`Daemon: ${data}`))
  daemonProcess.stderr.on('data', data => logger.info(`Daemon (stderr): ${data}`))
  daemonProcess.on('error', (err) => logger.error(`Hyperspace Daemon error: ${err.toString()}`))
  daemonProcess.on('close', () => {
    logger.info(`Daemon process has closed`)
    isDaemonActive = false
    daemonProcess = undefined
    events.emit('daemon-stopped')
  })

  await attemptConnect()
  isDaemonActive = true
  isFirstConnect = false
  events.emit('daemon-restored')
  reconnectAllDriveSessions()
}

export function requiresShutdown () {
  return isControllingDaemonProcess && !isShuttingDown
}

export async function shutdown () {
  if (isControllingDaemonProcess) {
    isShuttingDown = true
    daemonProcess.kill()
    // HACK: the daemon has a bug that causes it to stay open sometimes, give it the double tap -prf
    let i = setInterval(() => {
      if (!isDaemonActive) {
        clearInterval(i)
      } else {
        daemonProcess.kill()
      }
    }, 5)
  }
}

/**
 * Gets a hyperdrives interface to the daemon for the given key
 *
 * @param {Object|string} opts
 * @param {Buffer} [opts.key]
 * @param {number} [opts.version]
 * @param {Buffer} [opts.hash]
 * @param {boolean} [opts.writable]
 * @returns {DaemonHyperdrive}
 */
export function getHyperdriveSession (opts) {
  return sessions[createSessionKey(opts)]
}

/**
 * Creates a hyperdrives interface to the daemon for the given key
 *
 * @param {Object} opts
 * @param {Buffer} [opts.key]
 * @param {number} [opts.version]
 * @param {Buffer} [opts.hash]
 * @param {boolean} [opts.writable]
 * @param {String} [opts.domain]
 * @returns {Promise<DaemonHyperdrive>}
 */
export async function createHyperdriveSession (opts) {
  if (opts.key) {
    let sessionKey = createSessionKey(opts)
    if (sessions[sessionKey]) return sessions[sessionKey]
  }

  const drive = await client.drive.get(opts)
  const key = opts.key = datEncoding.toStr(drive.key)
  var driveObj = {
    key: drive.key,
    discoveryKey: drive.discoveryKey,
    url: `hyper://${opts.domain || key}/`,
    writable: drive.writable,
    domain: opts.domain,
    persistSession: false,

    session: {
      drive,
      opts,
      async close () {
        delete sessions[key]
        return this.drive.close()
      }
    },

    async getInfo () {
      var version = await this.session.drive.version()
      return {version}
    },

    pda: createHyperdriveSessionPDA(drive)
  }
  var sessKey = createSessionKey(opts)
  logger.debug(`Opening drive-session ${sessKey}`)
  sessions[sessKey] = driveObj
  return /** @type DaemonHyperdrive */(driveObj)
}

/**
 * Closes a hyperdrives interface to the daemon for the given key
 *
 * @param {Object|string} opts
 * @param {Buffer} [opts.key]
 * @param {number} [opts.version]
 * @param {Buffer} [opts.hash]
 * @param {boolean} [opts.writable]
 * @returns {void}
 */
export function closeHyperdriveSession (opts) {
  var key = createSessionKey(opts)
  if (sessions[key]) {
    logger.debug(`Closing drive-session ${key}`)
    sessions[key].session.close()
    delete sessions[key]
  }
}

export function listPeerAddresses (key) {
  let peers = getHyperdriveSession({key})?.session?.drive?.metadata?.peers
  if (peers) return peers.map(p => ({type: p.type, remoteAddress: p.remoteAddress}))
}

// internal methods
// =

async function getDaemonStorageDir () {
  try {
    await fs.access(HYPERDRIVE_STORAGE_DIR)
    return HYPERDRIVE_STORAGE_DIR
  } catch (err) {
    return HYPERSPACE_STORAGE_DIR
  }
}

async function onInvalidAuthToken () {
  // TODO replaceme
  // if (!isConnectionActive) return
  // isConnectionActive = false
  // logger.info('A daemon reset was detected. Refreshing all drive sessions.')
  // // daemon is online but our connection is outdated, reset the connection
  // await attemptConnect()
  // reconnectAllDriveSessions()
  // logger.info('Connection re-established.')
}

function createSessionKey (opts) {
  if (typeof opts === 'string') {
    return opts // assume it's already a session key
  }
  var key = opts.key.toString('hex')
  if (opts.version) {
    key += `+${opts.version}`
  }
  if ('writable' in opts) {
    key += `+${opts.writable ? 'w' : 'ro'}`
  }
  return key
}

async function attemptConnect () {
  var connectBackoff = 100
  for (let i = 0; i < SETUP_RETRIES; i++) {
    try {
      client = new HyperdriveClient()
      await client.ready()
      break
    } catch (e) {
      logger.info('Failed to connect to daemon, retrying')
      await new Promise(r => setTimeout(r, connectBackoff))
      connectBackoff += 100
    }
  }
}

async function reconnectAllDriveSessions () {
  for (let sessionKey in sessions) {
    await reconnectDriveSession(sessions[sessionKey])
  }
}

async function reconnectDriveSession (driveObj) {
  const drive = await client.drive.get(driveObj.session.opts)
  driveObj.session.drive = drive
  driveObj.pda = createHyperdriveSessionPDA(drive)
}

/**
 * Provides a pauls-dat-api2 object for the given drive
 * @param {Object} drive
 * @returns {DaemonHyperdrivePDA}
 */
function createHyperdriveSessionPDA (drive) {
  var obj = {
    lastCallTime: Date.now(),
    numActiveStreams: 0
  }
  for (let k in pda) {
    if (typeof pda[k] === 'function') {
      obj[k] = async (...args) => {
        obj.lastCallTime = Date.now()
        if (k === 'watch') {
          obj.numActiveStreams++
          let stream = pda.watch.call(pda, drive, ...args)
          stream.on('close', () => {
            obj.numActiveStreams--
          })
          return stream
        }
        return pda[k].call(pda, drive, ...args)
      }
    }
  }
  return obj
}
