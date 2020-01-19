import emitStream from 'emit-stream'
import EventEmitter from 'events'
import datEncoding from 'dat-encoding'
import { parseDriveUrl } from '../../lib/urls'
import _debounce from 'lodash.debounce'
import pda from 'pauls-dat-api2'
import { wait } from '../../lib/functions'
import * as logLib from '../logger'
const baseLogger = logLib.get()
const logger = baseLogger.child({category: 'dat', subcategory: 'drives'})

// dbs
import * as settingsDb from '../dbs/settings'
import * as archivesDb from '../dbs/archives'
import * as datDnsDb from '../dbs/dat-dns'

// dat modules
import * as daemon from './daemon'
import * as datAssets from './assets'
import datDns from './dns'

// fs modules
import * as filesystem from '../filesystem/index'
import * as users from '../filesystem/users'

// constants
// =

import { DAT_HASH_REGEX, DRIVE_PRESERVED_FIELDS_ON_CLONE, DRIVE_MANIFEST_FILENAME } from '../../lib/const'

import { InvalidURLError, TimeoutError } from 'beaker-error-constants'

// typedefs
// =

/**
 * @typedef {import('./daemon').DaemonHyperdrive} DaemonHyperdrive
 */

// globals
// =

var drives = {} // in-memory cache of drive objects. key -> drive
var driveLoadPromises = {} // key -> promise
var driveSessionCheckouts = {} // key+version -> DaemonHyperdrive
var drivesEvents = new EventEmitter()

// var daemonEvents TODO

// exported API
// =

export const on = drivesEvents.on.bind(drivesEvents)

export const addListener = drivesEvents.addListener.bind(drivesEvents)
export const removeListener = drivesEvents.removeListener.bind(drivesEvents)

/**
 * @param {Object} opts
 * @return {Promise<void>}
 */
export async function setup () {
  // connect to the daemon
  await daemon.setup()

  datDnsDb.on('updated', ({key, name}) => {
    var drive = getDrive(key)
    if (drive) {
      drive.domain = name
    }
  })

  // re-export events
  // TODO
  // daemonEvents.on('network-changed', evt => drivesEvents.emit('network-changed', evt))

  // configure the bandwidth throttle
  // TODO
  // settingsDb.getAll().then(({dat_bandwidth_limit_up, dat_bandwidth_limit_down}) => {
  //   daemon.setBandwidthThrottle({
  //     up: dat_bandwidth_limit_up,
  //     down: dat_bandwidth_limit_down
  //   })
  // })
  // settingsDb.on('set:dat_bandwidth_limit_up', up => daemon.setBandwidthThrottle({up}))
  // settingsDb.on('set:dat_bandwidth_limit_down', down => daemon.setBandwidthThrottle({down}))

  logger.info('Initialized dat daemon')
};

/**
 * @returns {Promise<void>}
 */
export async function loadSavedDrives () {
  // load all saved drives
  var drives = [] // TODO uwg await datLibrary.list({isHosting: true})

  // HACK
  // load the drives one at a time and give 5 seconds between each
  // why: the purpose of loading saved drives is to seed them
  // loading them all at once can bog down the user's device
  // if the user tries to access an drive, Beaker will load it immediately
  // so spacing out the loads has no visible impact on the user
  // (except for reducing the overall load for the user)
  // -prf
  for (let a of drives) {
    loadDrive(a.key)
    await new Promise(r => setTimeout(r, 5e3)) // wait 5s
  }
};

/**
 * @returns {NodeJS.ReadableStream}
 */
export function createEventStream () {
  return emitStream.toStream(drivesEvents)
};

/**
 * @param {string} key
 * @returns {Promise<string>}
 */
export function getDebugLog (key) {
  return '' // TODO needed? daemon.getDebugLog(key)
};

/**
 * @returns {NodeJS.ReadableStream}
 */
export function createDebugStream () {
  // TODO needed?
  // return daemon.createDebugStream()
};

// read metadata for the drive, and store it in the meta db
export async function pullLatestDriveMeta (drive, {updateMTime} = {}) {
  try {
    var key = drive.key.toString('hex')

    // trigger DNS update
    confirmDomain(key)

    // read the drive meta and size on disk
    var [manifest, oldMeta, size] = await Promise.all([
      drive.pda.readManifest().catch(_ => {}),
      archivesDb.getMeta(key),
      0//drive.pda.readSize('/')
    ])
    var {title, description, type, author} = (manifest || {})
    var writable = drive.writable
    var mtime = updateMTime ? Date.now() : oldMeta.mtime
    var details = {title, description, type, mtime, size, author, writable}

    // check for changes
    if (!hasMetaChanged(details, oldMeta)) {
      return
    }

    // write the record
    await archivesDb.setMeta(key, details)

    // emit the updated event
    details.url = 'drive://' + key
    drivesEvents.emit('updated', {key, details, oldMeta})
    return details
  } catch (e) {
    console.error('Error pulling meta', e)
  }
}

// drive creation
// =

/**
 * @returns {Promise<DaemonHyperdrive>}
 */
export async function createNewRootDrive () {
  var drive = await loadDrive(null, {visibility: 'private'})
  await pullLatestDriveMeta(drive)
  return drive
};

/**
 * @param {Object} [manifest]
 * @returns {Promise<DaemonHyperdrive>}
 */
export async function createNewDrive (manifest = {}) {
  // create the drive
  var drive = await loadDrive(null)

  // write the manifest and default datignore
  await Promise.all([
    drive.pda.writeManifest(manifest),
    drive.pda.writeFile('/.datignore', await settingsDb.get('default_dat_ignore'), 'utf8')
  ])

  // save the metadata
  await pullLatestDriveMeta(drive)

  return drive
}

/**
 * @param {string} srcDriveUrl
 * @param {Object} [manifest]
 * @returns {Promise<DaemonHyperdrive>}
 */
export async function cloneDrive (srcDriveUrl, manifest = {}) {
  srcDriveUrl = fromKeyToURL(srcDriveUrl)

  // get the source drive
  var srcDrive
  var downloadRes = await Promise.race([
    (async function () {
      srcDrive = await getOrLoadDrive(srcDriveUrl)
      if (!srcDrive) {
        throw new Error('Invalid drive key')
      }
      return srcDrive.pda.download('/')
    })(),
    new Promise(r => setTimeout(() => r('timeout'), 60e3))
  ])
  if (downloadRes === 'timeout') {
    throw new TimeoutError('Timed out while downloading source drive')
  }

  // fetch source drive meta
  var srcManifest = await srcDrive.pda.readManifest().catch(_ => {})
  srcManifest = srcManifest || {}

  // override any manifest data
  var dstManifest = {
    title: (manifest.title) ? manifest.title : srcManifest.title,
    description: (manifest.description) ? manifest.description : srcManifest.description,
    type: (manifest.type) ? manifest.type : srcManifest.type,
    author: manifest.author
  }
  DRIVE_PRESERVED_FIELDS_ON_CLONE.forEach(field => {
    if (srcManifest[field]) {
      dstManifest[field] = srcManifest[field]
    }
  })

  // create the new drive
  var dstDrive = await createNewDrive(dstManifest)

  // copy files
  var ignore = ['/.dat', '/.git', '/index.json']
  await pda.exportArchiveToArchive({
    srcArchive: srcDrive.session.drive,
    dstArchive: dstDrive.session.drive,
    skipUndownloadedFiles: true,
    ignore
  })

  return dstDrive
};

// drive management
// =

export async function loadDrive (key, settingsOverride) {
  // validate key
  if (key) {
    if (!Buffer.isBuffer(key)) {
      // existing dat
      key = await fromURLToKey(key, true)
      if (!DAT_HASH_REGEX.test(key)) {
        throw new InvalidURLError()
      }
      key = datEncoding.toBuf(key)
    }
  }

  // fallback to the promise, if possible
  var keyStr = key ? datEncoding.toStr(key) : null
  if (keyStr && keyStr in driveLoadPromises) {
    return driveLoadPromises[keyStr]
  }

  // run and cache the promise
  var p = loadDriveInner(key, settingsOverride)
  if (key) driveLoadPromises[keyStr] = p
  p.catch(err => {
    console.error('Failed to load drive', keyStr, err.toString())
  })

  // when done, clear the promise
  if (key) {
    const clear = () => delete driveLoadPromises[keyStr]
    p.then(clear, clear)
  }

  return p
}

// main logic, separated out so we can capture the promise
async function loadDriveInner (key, settingsOverride) {
  // ensure the folders exist
  // TODO needed?
  // var metaPath = archivesDb.getArchiveMetaPath(key)
  // mkdirp.sync(metaPath)

  // create the drive session with the daemon
  var drive = await daemon.createHyperdriveSession({key})
  key = drive.key
  var keyStr = datEncoding.toStr(drive.key)

  // fetch library settings
  var userSettings = null // TODO uwg datLibrary.getConfig(keyStr)
  if (!userSettings) {
    if (users.isUser(drive.url)) {
      userSettings = {key: keyStr, isSaved: true, isHosting: true, visibility: 'unlisted', savedAt: null, meta: null}
    }
  }
  if (settingsOverride) {
    userSettings = Object.assign(userSettings || {}, settingsOverride)
  }

  // put the drive on the network
  if (!userSettings || userSettings.visibility !== 'private') {
    drive.session.configureNetwork({
      announce: true,
      lookup: true,
      remember: false
    })
  }

  // fetch dns name if known
  let dnsRecord = await datDnsDb.getCurrentByKey(datEncoding.toStr(key))
  drive.domain = dnsRecord ? dnsRecord.name : undefined

  // update db
  archivesDb.touch(drive.key).catch(err => console.error('Failed to update lastAccessTime for drive', drive.key, err))
  if (!drive.writable) {
    await downloadHack(drive, DRIVE_MANIFEST_FILENAME)
  }
  await pullLatestDriveMeta(drive)
  datAssets.update(drive)

  // wire up events
  drive.pullLatestDriveMeta = opts => pullLatestDriveMeta(drive, opts)
  // drive.fileActStream = drive.pda.watch('/')
  // drive.fileActStream.on('data',  _debounce(([event, {path}]) => {
  //   if (event !== 'changed') return
  //   drive.pullLatestDriveMeta({updateMTime: true})
  //   datAssets.update(drive)
  // }), 1e3)

  // now store in main drives listing, as loaded
  drives[keyStr] = drive
  return drive
}

/**
 * HACK to work around the incomplete daemon-client download() method -prf
 */
async function downloadHack (drive, path) {
  if (!(await drive.pda.stat(path).catch(err => undefined))) return
  let fileStats = (await drive.session.drive.fileStats(path)).get(path)
  if (fileStats.downloadedBlocks >= fileStats.blocks) return
  await drive.session.drive.download(path)
  for (let i = 0; i < 10; i++) {
    await wait(500)
    fileStats = (await drive.session.drive.fileStats(path)).get(path)
    if (fileStats.downloadedBlocks >= fileStats.blocks) {
      return
    }
  }
}

export function getDrive (key) {
  key = fromURLToKey(key)
  return drives[key]
}

export async function getDriveCheckout (drive, version) {
  var isHistoric = false
  var checkoutFS = drive
  if (typeof version !== 'undefined' && version !== null) {
    let seq = parseInt(version)
    if (Number.isNaN(seq)) {
      if (version === 'latest') {
        // ignore, we use latest by default
      } else {
        throw new Error('Invalid version identifier:' + version)
      }
    } else {
      let checkoutKey = `${drive.key}+${version}`
      if (!(checkoutKey in driveSessionCheckouts)) {
        driveSessionCheckouts[checkoutKey] = await daemon.createHyperdriveSession({
          key: drive.key,
          version,
          writable: false
        })
      }
      checkoutFS = driveSessionCheckouts[checkoutKey]
      checkoutFS.domain = drive.domain
      isHistoric = true
    }
  }
  return {isHistoric, checkoutFS}
};

export function getActiveDrives () {
  return drives
};

export async function getOrLoadDrive (key) {
  key = await fromURLToKey(key, true)
  var drive = getDrive(key)
  if (drive) return drive
  return loadDrive(key)
}

export async function unloadDrive (key) {
  key = await fromURLToKey(key, true)
  var drive = drives[key]
  if (!drive) return
  if (drive.fileActStream) {
    drive.fileActStream.close()
    drive.fileActStream = null
  }
  delete drives[key]
  drive.session.configureNetwork({
    announce: false,
    lookup: false,
    remember: false
  })
  drive.session.close()
};

export function isDriveLoaded (key) {
  key = fromURLToKey(key)
  return key in drives
}

// drive fetch/query
// =

export async function getDriveInfo (key) {
  // get the drive
  key = await fromURLToKey(key, true)
  var drive = await getOrLoadDrive(key)

  // fetch drive data
  await drive.pullLatestDriveMeta()
  var userSettings = null // TODO uwg datLibrary.getConfig(key)
  var [meta, manifest, driveInfo] = await Promise.all([
    archivesDb.getMeta(key),
    drive.pda.readManifest().catch(_ => {}),
    drive.getInfo()
  ])
  manifest = manifest || {}
  if (filesystem.isRootUrl(drive.url) && !meta.title) {
    meta.title = 'My Home Drive'
  }
  meta.key = key
  meta.url = drive.url
  meta.domain = drive.domain
  meta.links = manifest.links || {}
  meta.manifest = manifest
  meta.version = driveInfo.version
  meta.userSettings = {
    isSaved: userSettings ? true : false,
    isHosting: userSettings ? userSettings.isHosting : false,
    visibility: userSettings ? userSettings.visibility : undefined,
    savedAt: userSettings ? userSettings.savedAt : null
  }
  meta.peers = driveInfo.peers
  meta.networkStats = driveInfo.networkStats

  return meta
};

export async function getDriveNetworkStats (key) {
  key = await fromURLToKey(key, true)
  return {} // TODO daemon.getDriveNetworkStats(key)
};

export async function clearFileCache (key) {
  return {} // TODO daemon.clearFileCache(key, userSettings)
};

/**
 * @desc
 * Get the primary URL for a given dat URL
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function getPrimaryUrl (url) {
  var key = await fromURLToKey(url, true)
  var datDnsRecord = await datDnsDb.getCurrentByKey(key)
  if (!datDnsRecord) return `drive://${key}`
  return `drive://${datDnsRecord.name}`
}

/**
 * @desc
 * Check that the drive's index.json `domain` matches the current DNS
 * If yes, write the confirmed entry to the dat_dns table
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function confirmDomain (key) {
  // fetch the current domain from the manifest
  try {
    var drive = await getOrLoadDrive(key)
    var datJson = await drive.pda.readManifest()
  } catch (e) {
    return false
  }
  if (!datJson.domain) {
    await datDnsDb.unset(key)
    return false
  }

  // confirm match with current DNS
  var dnsKey = await datDns.resolveName(datJson.domain)
  if (key !== dnsKey) {
    await datDnsDb.unset(key)
    return false
  }

  // update mapping
  await datDnsDb.update({name: datJson.domain, key})
  return true
}

// helpers
// =

export function fromURLToKey (url, lookupDns = false) {
  if (Buffer.isBuffer(url)) {
    return url
  }
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    return url
  }

  var urlp = parseDriveUrl(url)
  if (urlp.protocol !== 'drive:' && urlp.protocol !== 'web:' && urlp.protocol !== 'dat:') {
    throw new InvalidURLError('URL must be a drive:, web:, or dat: scheme')
  }
  if (!DAT_HASH_REGEX.test(urlp.host)) {
    if (!lookupDns) {
      throw new InvalidURLError('Hostname is not a valid hash')
    }
    return datDns.resolveName(urlp.host)
  }

  return urlp.host
}

export function fromKeyToURL (key) {
  if (typeof key !== 'string') {
    key = datEncoding.toStr(key)
  }
  if (!key.startsWith('drive://')) {
    return `drive://${key}/`
  }
  return key
}

function hasMetaChanged (m1, m2) {
  for (let k of ['title', 'description', 'type', 'size', 'author', 'writable', 'mtime']) {
    if (!m1[k]) m1[k] = undefined
    if (!m2[k]) m2[k] = undefined
    if (m1[k] !== m2[k]) {
      return true
    }
  }
  return false
}