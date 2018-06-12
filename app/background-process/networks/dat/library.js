import crypto from 'crypto'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import datEncoding from 'dat-encoding'
import pify from 'pify'
import pda from 'pauls-dat-api'
import signatures from 'sodium-signatures'
import parseDatURL from 'parse-dat-url'
import through from 'through2'
import split from 'split2'
import concat from 'concat-stream'
import CircularAppendFile from 'circular-append-file'
var debug = require('debug')('dat')
import * as siteData from '../../dbs/sitedata'
import * as settingsDb from '../../dbs/settings'
import {throttle, debounce} from '../../../lib/functions'

// dat modules
import * as archivesDb from '../../dbs/archives'
import * as datGC from './garbage-collector'
import * as folderSync from './folder-sync'
import {addArchiveSwarmLogging} from './logging-utils'
import * as datExtensions from './extensions'
import hypercoreProtocol from 'hypercore-protocol'
import hyperdrive from 'hyperdrive'


// network modules
import swarmDefaults from 'datland-swarm-defaults'
import discoverySwarm from 'discovery-swarm'

// file modules
import mkdirp from 'mkdirp'

// constants
// =

import {
  DAT_HASH_REGEX,
  DAT_URL_REGEX,
  DAT_SWARM_PORT,
  DAT_PRESERVED_FIELDS_ON_FORK
} from '../../../lib/const'
import {InvalidURLError} from 'beaker-error-constants'

// globals
// =

var networkId = crypto.randomBytes(32)
var archives = {} // in-memory cache of archive objects. key -> archive
var archivesByDKey = {} // same, but discoveryKey -> archive
var archiveLoadPromises = {} // key -> promise
var archivesEvents = new EventEmitter()
var debugEvents = new EventEmitter()
var debugLogFile
var archiveSwarm

// exported API
// =

export function setup ({logfilePath}) {
  debugLogFile = CircularAppendFile(logfilePath, {maxSize: 1024 /* 1kb */ * 1024 /* 1mb */ * 10 /* 10mb */ })

  // wire up event handlers
  archivesDb.on('update:archive-user-settings', async (key, userSettings, newUserSettings) => {
    // emit event
    var details = {
      url: 'dat://' + key,
      isSaved: userSettings.isSaved,
      networked: userSettings.networked,
      autoDownload: userSettings.autoDownload,
      autoUpload: userSettings.autoUpload,
      localSyncPath: userSettings.localSyncPath
    }
    if ('isSaved' in newUserSettings) {
      archivesEvents.emit(newUserSettings.isSaved ? 'added' : 'removed', {details})
    }

    // delete all perms for deleted archives
    if (!userSettings.isSaved) {
      siteData.clearPermissionAllOrigins('modifyDat:' + key)
    }

    // update the download based on these settings
    var archive = getArchive(key)
    if (archive) {
      configureNetwork(archive, userSettings)
      configureAutoDownload(archive, userSettings)
      configureLocalSync(archive, userSettings)
    }
  })
  folderSync.events.on('sync', (key, direction) => {
    archivesEvents.emit('folder-synced', {
      details: {
        url: `dat://${datEncoding.toStr(key)}`,
        direction
      }
    })
  })
  folderSync.events.on('error', (key, err) => {
    archivesEvents.emit('folder-sync-error', {
      details: {
        url: `dat://${datEncoding.toStr(key)}`,
        name: err.name,
        message: err.message
      }
    })
  })

  // setup extensions
  datExtensions.setup()

  // setup the archive swarm
  datGC.setup()
  archiveSwarm = discoverySwarm(swarmDefaults({
    id: networkId,
    hash: false,
    utp: true,
    tcp: true,
    dht: false,
    stream: createReplicationStream
  }))
  addArchiveSwarmLogging({archivesByDKey, log, archiveSwarm})
  archiveSwarm.once('error', () => archiveSwarm.listen(0))
  archiveSwarm.listen(DAT_SWARM_PORT)

  // load and configure all saved archives
  archivesDb.query(0, {isSaved: true}).then(
    archives => archives.forEach(a => loadArchive(a.key, a.userSettings)),
    err => console.error('Failed to load networked archives', err)
  )
}

export function createEventStream () {
  return emitStream(archivesEvents)
}

export function createDebugStream () {
  return emitStream(debugEvents)
}

export function getDebugLog (key) {
  return new Promise((resolve, reject) => {
    let rs = debugLogFile.createReadStream()
    rs
      .pipe(split())
      .pipe(through({encoding: 'utf8', decodeStrings: false}, (data, _, cb) => {
        if (data && data.startsWith(key)) {
          return cb(null, data.slice(key.length) + '\n')
        }
        cb()
      }))
      .pipe(concat({encoding: 'string'}, resolve))
    rs.on('error', reject)
  })
}

// read metadata for the archive, and store it in the meta db
export async function pullLatestArchiveMeta (archive, {updateMTime} = {}) {
  try {
    var key = archive.key.toString('hex')

    // ready() just in case (we need .blocks)
    await pify(archive.ready.bind(archive))()

    // read the archive meta and size on disk
    var [manifest, oldMeta] = await Promise.all([
      pda.readManifest(archive).catch(_ => {}),
      archivesDb.getMeta(key),
      updateSizeTracking(archive)
    ])
    manifest = archive.manifest = manifest || {}
    var {title, description, type} = manifest
    var isOwner = archive.writable
    var size = archive.size || 0
    var mtime = updateMTime ? Date.now() : oldMeta.mtime

    // write the record
    var details = {title, description, type, mtime, size, isOwner}
    debug('Writing meta', details)
    await archivesDb.setMeta(key, details)

    // emit the updated event
    details.url = 'dat://' + key
    archivesEvents.emit('updated', {details})
    return details
  } catch (e) {
    console.error('Error pulling meta', e)
  }
}

// archive creation
// =

export async function createNewArchive (manifest = {}, settings = false) {
  var userSettings = {
    isSaved: true,
    networked: settings && settings.networked === false ? false : true
  }

  // create the archive
  var archive = await loadArchive(null, userSettings)
  var key = datEncoding.toStr(archive.key)

  // write the manifest and default datignore
  await Promise.all([
    pda.writeManifest(archive, manifest),
    pda.writeFile(archive, '/.datignore', await settingsDb.get('default_dat_ignore'), 'utf8')
  ])

  // write the user settings
  await archivesDb.setUserSettings(0, key, userSettings)

  // write the metadata
  await pullLatestArchiveMeta(archive)

  return `dat://${key}/`
}

export async function forkArchive (srcArchiveUrl, manifest = {}, settings = false) {
  srcArchiveUrl = fromKeyToURL(srcArchiveUrl)

  // get the old archive
  var srcArchive = getArchive(srcArchiveUrl)
  if (!srcArchive) {
    throw new Error('Invalid archive key')
  }

  // fetch old archive meta
  var srcManifest = await pda.readManifest(srcArchive).catch(_ => {})
  srcManifest = srcManifest || {}

  // override any manifest data
  var dstManifest = {
    title: (manifest.title) ? manifest.title : srcManifest.title,
    description: (manifest.description) ? manifest.description : srcManifest.description,
    type: (manifest.type) ? manifest.type : srcManifest.type,
    author: manifest.author
  }
  DAT_PRESERVED_FIELDS_ON_FORK.forEach(field => {
    if (srcManifest[field]) {
      dstManifest[field] = srcManifest[field]
    }
  })

  // create the new archive
  var dstArchiveUrl = await createNewArchive(dstManifest, settings)
  var dstArchive = getArchive(dstArchiveUrl)

  // copy files
  var ignore = ['/.dat', '/.git', '/dat.json']
  await pda.exportArchiveToArchive({
    srcArchive,
    dstArchive,
    skipUndownloadedFiles: true,
    ignore
  })

  // write a .datignore if DNE
  try {
    await pda.stat(dstArchive, '/.datignore')
  } catch (e) {
    await pda.writeFile(dstArchive, '/.datignore', await settingsDb.get('default_dat_ignore'), 'utf8')
  }

  return dstArchiveUrl
}

// archive management
// =

export async function loadArchive (key, userSettings = null) {
  // validate key
  var secretKey
  if (key) {
    if (!Buffer.isBuffer(key)) {
      // existing dat
      key = fromURLToKey(key)
      if (!DAT_HASH_REGEX.test(key)) {
        throw new InvalidURLError()
      }
      key = datEncoding.toBuf(key)
    }
  } else {
    // new dat, generate keys
    var kp = signatures.keyPair()
    key = kp.publicKey
    secretKey = kp.secretKey
  }

  // fallback to the promise, if possible
  var keyStr = datEncoding.toStr(key)
  if (keyStr in archiveLoadPromises) {
    return archiveLoadPromises[keyStr]
  }

  // run and cache the promise
  var p = loadArchiveInner(key, secretKey, userSettings)
  archiveLoadPromises[keyStr] = p
  p.catch(err => {
    console.error('Failed to load archive', err)
  })

  // when done, clear the promise
  const clear = () => delete archiveLoadPromises[keyStr]
  p.then(clear, clear)

  return p
}

// main logic, separated out so we can capture the promise
async function loadArchiveInner (key, secretKey, userSettings = null) {
  // load the user settings as needed
  if (!userSettings) {
    try {
      userSettings = await archivesDb.getUserSettings(0, key)
    } catch (e) {
      userSettings = {networked: true}
    }
  }
  if (!('networked' in userSettings)) {
    userSettings.networked = true
  }

  // ensure the folders exist
  var metaPath = archivesDb.getArchiveMetaPath(key)
  mkdirp.sync(metaPath)

  // create the archive instance
  var archive = hyperdrive(metaPath, key, {
    sparse: true,
    secretKey,
    metadataStorageCacheSize: 0,
    contentStorageCacheSize: 0,
    treeCacheSize: 2048
  })
  archive.on('error', err => {
    console.error('Error in archive', key.toString('hex'), err)
    debug('Error in archive', key.toString('hex'), err)
  })
  archive.metadata.on('peer-add', () => onNetworkChanged(archive))
  archive.metadata.on('peer-remove', () => onNetworkChanged(archive))
  archive.replicationStreams = [] // list of all active replication streams
  archive.peerHistory = [] // samples of the peer count

  // wait for ready
  await new Promise((resolve, reject) => {
    archive.ready(err => {
      if (err) reject(err)
      else resolve()
    })
  })
  await updateSizeTracking(archive)
  archivesDb.touch(key).catch(err => console.error('Failed to update lastAccessTime for archive', key, err))

  // attach extensions
  datExtensions.attach(archive)

  // store in the discovery listing, so the swarmer can find it
  // but not yet in the regular archives listing, because it's not fully loaded
  archivesByDKey[datEncoding.toStr(archive.discoveryKey)] = archive

  // setup the archive based on current settings
  configureNetwork(archive, userSettings)
  configureAutoDownload(archive, userSettings)
  configureLocalSync(archive, userSettings)

  // await initial metadata sync if not the owner
  if (!archive.writable && !archive.metadata.length) {
    // wait to receive a first update
    await new Promise((resolve, reject) => {
      archive.metadata.update(err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
  if (!archive.writable) {
    // always download all metadata
    archive.metadata.download({start: 0, end: -1})
  }

  // pull meta
  await pullLatestArchiveMeta(archive)

  // wire up events
  archive.pullLatestArchiveMeta = debounce(opts => pullLatestArchiveMeta(archive, opts), 1e3)
  archive.syncArchiveToFolder = debounce((opts) => folderSync.syncArchiveToFolder(archive, opts), 1e3)
  archive.fileActStream = pda.watch(archive)
  archive.fileActStream.on('data', ([event, data]) => {
    if (event === 'changed') {
      archive.pullLatestArchiveMeta({updateMTime: true})
      archive.syncArchiveToFolder({shallow: false})
    }
  })
  archive.on('error', error => {
    log(archive.key.toString('hex'), {
      event: 'error',
      message: error.toString()
    })
  })

  // now store in main archives listing, as loaded
  archives[datEncoding.toStr(archive.key)] = archive
  return archive
}

export function getArchive (key) {
  key = fromURLToKey(key)
  return archives[key]
}

export function getActiveArchives () {
  return archives
}

export async function getOrLoadArchive (key, opts) {
  var archive = getArchive(key)
  if (archive) {
    return archive
  }
  return loadArchive(key, opts)
}

export async function unloadArchive (key) {
  key = fromURLToKey(key)
  const archive = archives[key]
  if (!archive) {
    return
  }

  // shutdown archive
  leaveSwarm(key)
  stopAutodownload(archive)
  if (archive.fileActStream) {
    archive.fileActStream.end()
    archive.fileActStream = null
  }
  datExtensions.detach(archive)
  await new Promise((resolve, reject) => {
    archive.close(err => {
      if (err) reject(err)
      else resolve()
    })
  })
  delete archivesByDKey[datEncoding.toStr(archive.discoveryKey)]
  delete archives[key]
}

export function isArchiveLoaded (key) {
  key = fromURLToKey(key)
  return key in archives
}

export async function updateSizeTracking (archive) {
  // fetch size
  archive.size = await pda.readSize(archive, '/')
}

// archive fetch/query
// =

export async function queryArchives (query) {
  // run the query
  var archiveInfos = await archivesDb.query(0, query)

  if (query && ('inMemory' in query)) {
    archiveInfos = archiveInfos.filter(archiveInfo => isArchiveLoaded(archiveInfo.key) === query.inMemory)
  }

  // attach some live data
  archiveInfos.forEach(archiveInfo => {
    var archive = getArchive(archiveInfo.key)
    if (archive) {
      archiveInfo.size = archive.size
      archiveInfo.peers = archive.metadata.peers.length
      archiveInfo.peerHistory = archive.peerHistory
    } else {
      archiveInfo.size = 0
      archiveInfo.peers = 0
      archiveInfo.peerHistory = []
    }
  })
  return archiveInfos
}

export async function getArchiveInfo (key) {
  // get the archive
  key = fromURLToKey(key)
  var archive = await getOrLoadArchive(key)

  // fetch archive data
  var [meta, userSettings] = await Promise.all([
    archivesDb.getMeta(key),
    archivesDb.getUserSettings(0, key)
  ])
  meta.key = key
  meta.url = `dat://${key}`
  meta.links = archive.manifest.links || {}
  meta.manifest = archive.manifest
  meta.version = archive.version
  meta.size = archive.size
  meta.userSettings = {
    isSaved: userSettings.isSaved,
    networked: userSettings.networked,
    autoDownload: userSettings.autoDownload,
    autoUpload: userSettings.autoUpload,
    expiresAt: userSettings.expiresAt,
    localSyncPath: userSettings.localSyncPath
  }
  meta.peers = archive.metadata.peers.length
  meta.peerInfo = getArchivePeerInfos(archive)
  meta.peerHistory = archive.peerHistory

  return meta
}

export async function clearFileCache (key) {
  var archive = await getOrLoadArchive(key)
  if (archive.writable) {
    return // abort, only clear the content cache of downloaded archives
  }

  // clear the cache
  await new Promise((resolve, reject) => {
    archive.content.clear(0, archive.content.length, err => {
      if (err) reject(err)
      else resolve()
    })
  })

  // force a reconfig of the autodownloader
  var userSettings = await archivesDb.getUserSettings(0, key)
  stopAutodownload(archive)
  configureAutoDownload(archive, userSettings)
}

// archive networking
// =

// set the networking of an archive based on settings
function configureNetwork (archive, settings) {
  if (!settings || settings.networked) {
    joinSwarm(archive)
  } else {
    leaveSwarm(archive)
  }
}

// put the archive into the network, for upload and download
export function joinSwarm (key, opts) {
  var archive = (typeof key === 'object' && key.key) ? key : getArchive(key)
  if (!archive || archive.isSwarming) return
  archiveSwarm.join(archive.discoveryKey)
  var keyStr = datEncoding.toStr(archive.key)
  log(keyStr, {
    event: 'swarming',
    discoveryKey: datEncoding.toStr(archive.discoveryKey)
  })
  archive.isSwarming = true
}

// take the archive out of the network
export function leaveSwarm (key) {
  var archive = (typeof key === 'object' && key.discoveryKey) ? key : getArchive(key)
  if (!archive || !archive.isSwarming) return

  var keyStr = datEncoding.toStr(archive.key)
  log(keyStr, {
    event: 'unswarming',
    message: `Disconnected ${archive.metadata.peers.length} peers`
  })

  archive.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
  archive.replicationStreams.length = 0
  archiveSwarm.leave(archive.discoveryKey)
  archive.isSwarming = false
}

// helpers
// =

export function fromURLToKey (url) {
  if (Buffer.isBuffer(url)) {
    return url
  }
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    return url
  }

  var urlp = parseDatURL(url)

  // validate
  if (urlp.protocol !== 'dat:') {
    throw new InvalidURLError('URL must be a dat: scheme')
  }
  if (!DAT_HASH_REGEX.test(urlp.host)) {
    // TODO- support dns lookup?
    throw new InvalidURLError('Hostname is not a valid hash')
  }

  return urlp.host
}

export function fromKeyToURL (key) {
  if (typeof key !== 'string') {
    key = datEncoding.toStr(key)
  }
  if (!key.startsWith('dat://')) {
    return `dat://${key}/`
  }
  return key
}

// internal methods
// =

function configureAutoDownload (archive, userSettings) {
  if (archive.writable) {
    return // abort, only used for unwritable
  }
  // HACK
  // mafintosh is planning to put APIs for this inside of hyperdrive
  // till then, we'll do our own inefficient downloader
  // -prf
  const isAutoDownloading = userSettings.isSaved && userSettings.autoDownload
  if (!archive._autodownloader && isAutoDownloading) {
    // setup the autodownload
    archive._autodownloader = {
      undownloadAll: () => {
        if (archive.content) {
          archive.content._selections.forEach(range => archive.content.undownload(range))
        }
      },
      onUpdate: throttle(() => {
        // cancel ALL previous, then prioritize ALL current
        archive._autodownloader.undownloadAll()
        pda.download(archive, '/').catch(e => { /* ignore cancels */ })
      }, 5e3)
    }
    archive.metadata.on('download', archive._autodownloader.onUpdate)
    pda.download(archive, '/').catch(e => { /* ignore cancels */ })
  } else if (archive._autodownloader && !isAutoDownloading) {
    stopAutodownload(archive)
  }
}

function configureLocalSync (archive, userSettings) {
  let old = archive.localSyncPath
  archive.localSyncPath = userSettings.isSaved ? userSettings.localSyncPath : false

  if (archive.localSyncPath !== old) {
    // configure the local folder watcher if a change occurred
    folderSync.configureFolderToArchiveWatcher(archive)
  }
}

function stopAutodownload (archive) {
  if (archive._autodownloader) {
    archive._autodownloader.undownloadAll()
    archive.metadata.removeListener('download', archive._autodownloader.onUpdate)
    archive._autodownloader = null
  }
}

function createReplicationStream (info) {
  // create the protocol stream
  var streamKeys = [] // list of keys replicated over the streamd
  var stream = hypercoreProtocol({
    id: networkId,
    live: true,
    encrypt: true,
    extensions: ['ephemeral', 'session-data']
  })
  stream.peerInfo = info

  // add the archive if the discovery network gave us any info
  if (info.channel) {
    add(info.channel)
  }

  // add any requested archives
  stream.on('feed', add)

  function add (dkey) {
    // lookup the archive
    var dkeyStr = datEncoding.toStr(dkey)
    var chan = dkeyStr.slice(0, 6) + '..' + dkeyStr.slice(-2)
    var archive = archivesByDKey[dkeyStr]
    if (!archive || !archive.isSwarming) {
      return
    }
    if (archive.replicationStreams.indexOf(stream) !== -1) {
      return // already replicating
    }

    // create the replication stream
    archive.replicate({stream, live: true})
    if (stream.destroyed) return // in case the stream was destroyed during setup

    // track the stream
    var keyStr = datEncoding.toStr(archive.key)
    streamKeys.push(keyStr)
    archive.replicationStreams.push(stream)
    function onend () {
      archive.replicationStreams = archive.replicationStreams.filter(s => (s !== stream))
    }
    stream.once('error', onend)
    stream.once('end', onend)
    stream.once('close', onend)
  }

  // debugging
  stream.on('error', err => {
    log(streamKeys, {
      event: 'connection-error',
      peer: `${info.host}:${info.port}`,
      connectionType: info.type,
      message: err.toString()
    })
  })
  return stream
}

function onNetworkChanged (archive) {
  var now = Date.now()
  var lastHistory = archive.peerHistory.slice(-1)[0]
  if (lastHistory && (now - lastHistory.ts) < 10e3) {
    // if the last datapoint was < 10s ago, just update it
    lastHistory.peers = archive.metadata.peers.length
  } else {
    archive.peerHistory.push({
      ts: Date.now(),
      peers: archive.metadata.peers.length
    })
  }

  // keep peerHistory from getting too long
  if (archive.peerHistory.length >= 500) {
    // downsize to 360 points, which at 10s intervals covers one hour
    archive.peerHistory = archive.peerHistory.slice(archive.peerHistory.length - 360)
  }

  // count # of peers
  var totalPeerCount = 0
  for (var k in archives) {
    totalPeerCount += archives[k].metadata.peers.length
  }
  archivesEvents.emit('network-changed', {
    details: {
      url: `dat://${datEncoding.toStr(archive.key)}`,
      peers: getArchivePeerInfos(archive),
      peerCount: archive.metadata.peers.length,
      totalPeerCount
    }
  })
}

function getArchivePeerInfos (archive) {
  // old way, more accurate?
  // archive.replicationStreams.map(s => ({host: s.peerInfo.host, port: s.peerInfo.port}))

  return archive.metadata.peers.map(peer => peer.stream.stream.peerInfo).filter(Boolean)
}

function log (key, data) {
  var keys = Array.isArray(key) ? key : [key]
  debug(Object.keys(data).reduce((str, key) => str + `${key}=${data[key]} `, '') + `key=${keys.join(',')}`)
  keys.forEach(k => debugEvents.emit(k, data))
  if (keys[0]) {
    debugLogFile.append(keys[0] + JSON.stringify(data) + '\n')
  }
}


