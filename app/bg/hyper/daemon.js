import { app } from 'electron'
import HyperdriveDaemon from 'hyperdrive-daemon'
import * as HyperdriveDaemonManager from 'hyperdrive-daemon/manager'
import { createMetadata } from 'hyperdrive-daemon/lib/metadata'
import constants from 'hyperdrive-daemon-client/lib/constants'
import { HyperdriveClient } from 'hyperdrive-daemon-client'
import datEncoding from 'dat-encoding'
import * as pda from 'pauls-dat-api2'
import pm2 from 'pm2'
import EventEmitter from 'events'
import { getEnvVar } from '../lib/env'

const SETUP_RETRIES = 100
const CHECK_DAEMON_INTERVAL = 5e3

// typedefs
// =

/**
* @typedef {Object} DaemonHyperdrive
* @prop {number} sessionId
* @prop {Buffer} key
* @prop {string} url
* @prop {string} domain
* @prop {boolean} writable
* @prop {Object} session
* @prop {Object} session.drive
* @prop {function(): Promise<void>} session.close
* @prop {function(Object): Promise<void>} session.configureNetwork
* @prop {function(): Promise<Object>} getInfo
* @prop {DaemonHyperdrivePDA} pda
*
* @typedef {Object} DaemonHyperdrivePDA
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
var isCheckingDaemon = false
var isDaemonActive = false
var isInitialSetup = true
var sessions = {} // map of keyStr => DaemonHyperdrive
var events = new EventEmitter()

// exported apis
// =

export const on = events.on.bind(events)

export function isActive () {
  if (isInitialSetup) {
    // the "inactive daemon" indicator during setup
    return true
  }
  return isDaemonActive
}

export async function setup () {
  if (!isCheckingDaemon) {
    // watch for the daemon process to die/revive
    let interval = setInterval(() => {
      pm2.list((err, processes) => {
        var processExists = !!processes.find(p => p.name === 'hyperdrive')
        if (processExists && !isDaemonActive) {
          isDaemonActive = true
          isInitialSetup = false
          events.emit('daemon-restored')
        } else if (!processExists && isDaemonActive) {
          isDaemonActive = false
          events.emit('daemon-stopped')
        }
      })
    }, CHECK_DAEMON_INTERVAL)
    interval.unref()
    isCheckingDaemon = true

    events.on('daemon-restored', async () => {
      console.log('Hyperdrive daemon has been restored')
    })
    events.on('daemon-stopped', async () => {
      console.log('Hyperdrive daemon has been lost')
    })
  }

  try {
    client = new HyperdriveClient()
    await client.ready()
    console.log('Connected to an external daemon.')
    reconnectAllDriveSessions()
    return
  } catch (err) {
    console.log('Failed to connect to an external daemon. Launching the daemon...')
    client = false
  }

  if (getEnvVar('EMBED_HYPERDRIVE_DAEMON')) {
    await createMetadata(`localhost:${constants.port}`)
    var daemon = new HyperdriveDaemon()
    await daemon.start()
    process.on('exit', () => daemon.stop())
  } else {
    await HyperdriveDaemonManager.start({
      interpreter: app.getPath('exe'),
      env: Object.assign({}, process.env, {ELECTRON_RUN_AS_NODE: 1}),
      memoryOnly: false,
      heapSize: 4096, // 4GB heap
      storage: constants.root
    })
  }

  await attemptConnect()
  reconnectAllDriveSessions()
}

/**
 * Creates a hyperdrives interface to the daemon for the given key
 *
 * @param {Object} opts
 * @param {Buffer} [opts.key]
 * @param {number} [opts.version]
 * @param {Buffer} [opts.hash]
 * @param {boolean} [opts.writable]
 * @returns {Promise<DaemonHyperdrive>}
 */
export async function getHyperdriveSession (opts) {
  if (opts.key) {
    let sessionKey = createSessionKey(opts)
    if (sessions[sessionKey]) return sessions[sessionKey]
  }

  const drive = await client.drive.get(opts)
  const key = opts.key = datEncoding.toStr(drive.key)
  var driveObj = {
    key: datEncoding.toBuf(key),
    url: `hyper://${key}`,
    writable: drive.writable,
    domain: undefined,

    session: {
      drive,
      opts,
      networkConfig: undefined,
      async close () {
        delete sessions[key]
        return this.drive.close()
      },
      async configureNetwork (cfg) {
        this.networkConfig = cfg
        return this.drive.configureNetwork(cfg)
      }
    },

    async getInfo () {
      var [version, stats] = await Promise.all([
        this.session.drive.version(),
        this.session.drive.stats()
      ])
      return {
        version,
        peers: stats.stats[0].metadata.peers,
        networkStats: {
          uploadTotal: stats.stats[0].metadata.uploadedBytes + stats.stats[0].content.uploadedBytes,
          downloadTotal: stats.stats[0].metadata.downloadedBytes + stats.stats[0].content.downloadedBytes
        }
      }
    },

    pda: createHyperdriveSessionPDA(drive)
  }
  sessions[createSessionKey(opts)] = driveObj
  return /** @type DaemonHyperdrive */(driveObj)
}

// internal methods
// =

function createSessionKey (opts) {
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
    } catch (e) {
      console.log('Failed to connect to daemon, retrying')
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
  if (driveObj.session.networkConfig) {
    driveObj.session.configureNetwork(driveObj.session.networkConfig)
  }
}

/**
 * Provides a pauls-dat-api2 object for the given drive
 * @param {Object} drive
 * @returns {DaemonHyperdrivePDA}
 */
function createHyperdriveSessionPDA (drive) {
  var obj = {}
  for (let k in pda) {
    if (typeof pda[k] === 'function') {
      if (getEnvVar('LOG_HYPERDRIVE_DAEMON_CALLS')) {
        obj[k] = async (...args) => {
          let t = Date.now()
          console.log('->', k, ...args)
          try {
            var res = await pda[k].call(pda, drive, ...args)
            console.log(`:: ${Date.now() - t} ms`, k, ...args)
            return res
          } catch (e) {
            console.log(`:: ${Date.now() - t} ms`, k, ...args)
            throw e
          }
        }
      } else {
        obj[k] = pda[k].bind(pda, drive)
      }
    }
  }
  return obj
}
