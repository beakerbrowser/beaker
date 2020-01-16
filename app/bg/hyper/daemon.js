import { app } from 'electron'
import HyperdriveDaemon from 'hyperdrive-daemon'
import * as HyperdriveDaemonManager from 'hyperdrive-daemon/manager'
import { createMetadata } from 'hyperdrive-daemon/lib/metadata'
import constants from 'hyperdrive-daemon-client/lib/constants'
import { HyperdriveClient } from 'hyperdrive-daemon-client'
import datEncoding from 'dat-encoding'
import * as pda from 'pauls-dat-api2'
import { getEnvVar } from '../lib/env'

const SETUP_RETRIES = 100

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
* @prop {function(string=): Promise<void>} download
* @prop {function(string=): NodeJS.ReadableStream} watch
* @prop {function(): NodeJS.ReadableStream} createNetworkActivityStream
* @prop {function(): Promise<Object>} readManifest
* @prop {function(Object): Promise<void>} writeManifest
* @prop {function(Object): Promise<void>} updateManifest
*/

// globals
// =

var client // client object created by hyperdrive-daemon-client

// exported apis
// =

export const setup = async function () {
  // instantiate the daemon
  // TODO the daemon should be managed in an external process
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

  var connectBackoff = 100
  for (let i = 0; i < SETUP_RETRIES; i++) {
    try {
      client = new HyperdriveClient()
      await client.ready()
    } catch (e) {
      console.log('Failed to connect to daemon, retrying', e)
      await new Promise(r => setTimeout(r, connectBackoff))
      connectBackoff += 100
    }
  }

  // attach to the process for debugging
  process.hyperdriveDaemon = daemon
  process.hyperdriveDaemonClient = client
}

/**
 * Creates a hyperdrives interface to the daemon for the given key
 *
 * @param {Object} opts
 * @param {Buffer} opts.key
 * @param {number} [opts.version]
 * @param {Buffer} [opts.hash]
 * @param {boolean} [opts.writable]
 * @returns {Promise<DaemonHyperdrive>}
 */
export const createHyperdriveSession = async function (opts) {
  const drive = await client.drive.get(opts)
  const key = datEncoding.toStr(drive.key)
  var driveObj = {
    key: datEncoding.toBuf(key),
    url: `drive://${key}`,
    writable: drive.writable,
    domain: undefined,

    session: {
      drive,
      async close () {
        return drive.close()
      },
      async configureNetwork (opts) {
        return drive.configureNetwork(opts)
      }
    },

    async getInfo () {
      var [version, stats] = await Promise.all([
        drive.version(),
        drive.stats()
      ])
      return {
        version,
        peers: stats[0].metadata.peers,
        networkStats: {
          uploadTotal: stats[0].metadata.uploadedBytes + stats[0].content.uploadedBytes,
          downloadTotal: stats[0].metadata.downloadedBytes + stats[0].content.downloadedBytes
        }
      }
    },

    pda: createHyperdriveSessionPDA(drive)
  }
  return /** @type DaemonHyperdrive */(driveObj)
}

// internal methods
// =

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