import {app} from 'electron'
import crypto from 'crypto'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import datEncoding from 'dat-encoding'
import pify from 'pify'
import pda from 'pauls-dat-api'
import signatures from 'sodium-signatures'
import slugify from 'slugify'
var debug = require('debug')('dat')
import {debounce} from '../../../lib/functions'
import {grantPermission} from '../../ui/permissions'

// dat modules
import * as archivesDb from '../../dbs/archives'
import * as datGC from './garbage-collector'
import beakerStorage from './storage'
import hypercore from 'hypercore'
import hypercoreProtocol from 'hypercore-protocol'
import hyperdrive from 'hyperdrive'
import hyperstaging from 'hyperdrive-staging-area'

// network modules
import swarmDefaults from 'datland-swarm-defaults'
import discoverySwarm from 'discovery-swarm'

// file modules
import path from 'path'
import mkdirp from 'mkdirp'
import jetpack from 'fs-jetpack'
const du = pify(require('du'))

// constants
// =

import {
  DAT_HASH_REGEX,
  DAT_URL_REGEX,
  DAT_SWARM_PORT,
  INVALID_SAVE_FOLDER_CHAR_REGEX
} from '../../../lib/const'
import {InvalidURLError} from 'beaker-error-constants'
const DEFAULT_DATS_FOLDER = process.env.beaker_sites_path
  ? process.env.beaker_sites_path
  : path.join(app.getPath('home'), 'Sites')

// globals
// =

var networkId = crypto.randomBytes(32)
var archives = {} // in-memory cache of archive objects. key -> archive
var archivesByDKey = {} // same, but discoveryKey -> archive
var archiveLoadPromises = {} // key -> promise
var archivesEvents = new EventEmitter()
var debugEvents = new EventEmitter()
var archiveSwarm

// exported API
// =

export function setup () {
  // make sure the default dats folder exists
  mkdirp.sync(DEFAULT_DATS_FOLDER)

  // wire up event handlers
  archivesDb.on('update:archive-user-settings', async (key, settings) => {
    // emit event
    var details = {
      url: 'dat://' + key,
      isSaved: settings.isSaved
    }
    archivesEvents.emit(settings.isSaved ? 'added' : 'removed', {details})

    // update the staging based on these settings
    var archive = getArchive(key)
    if (archive) {
      reconfigureStaging(archive, settings)
    }
  })

  // setup the archive swarm
  datGC.setup()
  archiveSwarm = discoverySwarm(swarmDefaults({
    id: networkId,
    hash: false,
    utp: true,
    tcp: true,
    stream: createReplicationStream
  }))
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

export async function generateCreatedBy (url) {
  // fetch some origin info
  var originTitle = null
  var origin = archivesDb.extractOrigin(url)
  try {
    var originKey = /dat:\/\/([^\/]*)/.exec(origin)[1]
    var originMeta = await archivesDb.getMeta(originKey)
    originTitle = originMeta.title || null
  } catch (e) {}

  // construct info
  if (originTitle) {
    return {url: origin, title: originTitle}
  }
  return {url: origin}
}

// read metadata for the archive, and store it in the meta db
export async function pullLatestArchiveMeta (archive) {
  try {
    var key = archive.key.toString('hex')

    // ready() just in case (we need .blocks)
    await pify(archive.ready.bind(archive))()

    // read the archive meta and size on disk
    var [manifest, _] = await Promise.all([
      pda.readManifest(archive).catch(err => {}),
      updateSizeTracking(archive)
    ])
    manifest = manifest || {}
    var {title, description, forkOf, createdBy} = manifest
    var mtime = Date.now() // use our local update time
    var isOwner = archive.writable
    var metaSize = archive.metaSize || 0
    var stagingSize = archive.stagingSize || 0
    var stagingSizeLessIgnored = archive.stagingSizeLessIgnored || 0

    // write the record
    var details = {title, description, forkOf, createdBy, mtime, metaSize, stagingSize, stagingSizeLessIgnored, isOwner}
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

export async function createNewArchive (manifest = {}) {
  var userSettings = {
    localPath: await selectDefaultLocalPath(manifest.title),
    isSaved: true
  }

  // create the archive
  var archive = await loadArchive(null, userSettings)
  var key = datEncoding.toStr(archive.key)
  manifest.url = `dat://${key}/`

  // write the manifest
  await pda.writeManifest(archive, manifest)

  // write the user settings
  await archivesDb.setUserSettings(0, key, userSettings)

  // write the metadata
  await pullLatestArchiveMeta(archive)

  // write the perms
  if (manifest.createdBy && manifest.createdBy.url) {
    grantPermission('modifyDat:' + key, manifest.createdBy.url)
  }

  return manifest.url
}

export async function forkArchive (srcArchiveUrl, manifest={}) {
  srcArchiveUrl = fromKeyToURL(srcArchiveUrl)

  // get the old archive
  var dstArchive
  var srcArchive = getArchive(srcArchiveUrl)
  if (!srcArchive) {
    throw new Error('Invalid archive key')
  }

  // fetch old archive meta
  var srcManifest = await pda.readManifest(srcArchive).catch(err => {})
  srcManifest = srcManifest || {}

  // fetch old archive ignore rules
  var ignore = ['/.dat', '/.git']
  try {
    let ignoreRaw = await pda.readFile(srcArchive.stagingFS, '/.datignore', 'utf8')
    let ignoreCustomRules = hyperstaging.parseIgnoreRules(ignoreRaw)
    ignore = ignore.concat(ignoreCustomRules)
  } catch (e) {
    // ignore
  }

  // override any manifest data
  var dstManifest = {
    title: (manifest.title) ? manifest.title : srcManifest.title,
    description: (manifest.description) ? manifest.description : srcManifest.description,
    createdBy: manifest.createdBy,
    forkOf: (srcManifest.forkOf || []).concat(srcArchiveUrl)
  }

  // create the new archive
  var dstArchiveUrl = await createNewArchive(dstManifest)
  var dstArchive = getArchive(dstArchiveUrl)

  // copy files
  await pda.exportArchiveToArchive({
    srcArchive: srcArchive.stagingFS,
    dstArchive: dstArchive.stagingFS,
    skipUndownloadedFiles: true,
    ignore
  })
  await pda.commit(dstArchive.staging)

  return dstArchiveUrl
}

// archive management
// =

export async function loadArchive (key, userSettings=null) {
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
async function loadArchiveInner (key, secretKey, userSettings=null) {
  // load the user settings as needed
  if (!userSettings) {
    try {
      userSettings = await archivesDb.getUserSettings(key)
    } catch (e) {
      userSettings = {}
    }
  }

  // ensure the folders exist
  var metaPath = archivesDb.getArchiveMetaPath(key)
  mkdirp.sync(metaPath)

  // create the archive instance
  var s = beakerStorage(metaPath, secretKey ? null : userSettings.localPath)
  var archive = hyperdrive(s, key, {sparse: true, secretKey})
  archive.replicationStreams = [] // list of all active replication streams
  archive.peerHistory = [] // samples of the peer count
  Object.defineProperty(archive, 'stagingFS', {
    get: () => archive.writable ? archive.staging : archive
  })

  // wait for ready
  await new Promise((resolve, reject) => {
    archive.ready(err => {
      if (err) reject(err)
      else resolve()
    })
  })
  await configureStaging(archive, userSettings, !!secretKey)
  await updateSizeTracking(archive)
  archivesDb.touch(key).catch(err => console.error('Failed to update lastAccessTime for archive', key, err))

  // store in the discovery listing, so the swarmer can find it
  // but not yet in the regular archives listing, because it's not fully loaded
  archivesByDKey[datEncoding.toStr(archive.discoveryKey)] = archive

  // join the swarm
  joinSwarm(archive)

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

  // wire up events
  archive.pullLatestArchiveMeta = debounce(() => pullLatestArchiveMeta(archive), 1e3)
  archive.fileActStream = pda.createFileActivityStream(archive)
  archive.fileActStream.on('data', ([event]) => {
    if (event === 'changed') {
      archive.pullLatestArchiveMeta()
    }
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

export async function updateSizeTracking (archive) {
  // read the datignore
  var filter
  if (archive.staging) {
    var ignoreFilter = await new Promise(resolve => {
      archive.staging.readIgnore({}, resolve)
    })
    // wrap the filter to work correctly with du
    var pathlen = archive.staging.path.length
    filter = (filepath) => {
      filepath = filepath.slice(pathlen)
      return ignoreFilter(filepath)
    }
  }

  // fetch sizes
  var [metaSize, stagingSize, stagingSizeLessIgnored] = await Promise.all([
    du(archivesDb.getArchiveMetaPath(archive), {disk: true}).catch(err => 0),
    archive.staging ? du(archive.staging.path, {disk: true}).catch(err => 0) : 0,
    archive.staging ? du(archive.staging.path, {disk: true, filter}).catch(err => 0) : 0
  ])
  archive.metaSize = metaSize
  archive.stagingSize = stagingSize
  archive.stagingSizeLessIgnored = stagingSizeLessIgnored
}

// archive fetch/query
// =

export async function queryArchives (query) {
  // run the query
  var archiveInfos = await archivesDb.query(0, query)

  // attach some live data
  archiveInfos.forEach(archiveInfo => {
    var archive = getArchive(archiveInfo.key)
    if (archive) {
      archiveInfo.peers = archive.metadata.peers.length
      archiveInfo.peerHistory = archive.peerHistory
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
  meta.version = archive.version
  meta.metaSize = archive.metaSize
  meta.stagingSize = archive.stagingSize
  meta.stagingSizeLessIgnored = archive.stagingSizeLessIgnored
  meta.userSettings = {localPath: userSettings.localPath, isSaved: userSettings.isSaved}
  meta.peers = archive.metadata.peers.length
  meta.peerInfo = archive.replicationStreams.map(s => ({
    host: s.peerInfo.host,
    port: s.peerInfo.port
  }))
  meta.peerHistory = archive.peerHistory
  if (userSettings.localPath) {
    meta.localPathExists = ((await jetpack.existsAsync(userSettings.localPath)) === 'dir')
  }

  return meta
}

export async function reconfigureStaging (archive, userSettings) {
  if (archive.staging && archive.staging.path === userSettings.localPath) {
    // no changes needed
    return
  }
  await configureStaging(archive, userSettings)
}

export async function selectDefaultLocalPath (title) {
  // massage the title
  title = typeof title === 'string' ? title : ''
  title = title.replace(INVALID_SAVE_FOLDER_CHAR_REGEX, '')
  if (!title.trim()) {
    title = 'Untitled'
  }
  title = slugify(title).toLowerCase()

  // find an available variant of title
  var tryNum = 1
  var titleVariant = title
  while (await jetpack.existsAsync(path.join(DEFAULT_DATS_FOLDER, titleVariant))) {
    titleVariant = `${title}-${++tryNum}`
  }
  var localPath = path.join(DEFAULT_DATS_FOLDER, titleVariant)

  // create the folder
  mkdirp.sync(localPath)
  return localPath
}

// archive networking
// =

// put the archive into the network, for upload and download
export function joinSwarm (key, opts) {
  var archive = (typeof key == 'object' && key.key) ? key : getArchive(key)
  if (!archive || archive.isSwarming) return
  archiveSwarm.join(archive.discoveryKey)
  var keyStr = datEncoding.toStr(archive.key)
  log(keyStr, `Swarming archive, discovery key: ${datEncoding.toStr(archive.discoveryKey)}`)
  archive.isSwarming = true
}

// take the archive out of the network
export function leaveSwarm (key, cb) {
  var archive = (typeof key == 'object' && key.discoveryKey) ? key : getArchive(key)
  if (!archive || !archive.isSwarming) return

  var keyStr = datEncoding.toStr(archive.key)
  log(keyStr, `Unswarming archive (disconnected ${archive.metadata.peers.length} peers)`)

  archive.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
  archive.replicationStreams.length = 0
  archiveSwarm.leave(archive.discoveryKey)
  archive.isSwarming = false
}

// internal methods
// =

function fromURLToKey (url) {
  if (Buffer.isBuffer(url)) {
    return url
  }
  if (url.startsWith('dat://')) {
    var match = DAT_URL_REGEX.exec(url)
    if (match) return match[1]
  }
  return url
}

function fromKeyToURL (key) {
  if (typeof key !== 'string') {
    key = datEncoding.toStr(key)
  }
  if (!key.startsWith('dat://')) {
    return `dat://${key}/`
  }
  return key
}

async function configureStaging (archive, userSettings, isWritableOverride) {
  // create staging if writable
  var isWritable = (archive.writable || isWritableOverride)
  if (isWritable && !!userSettings.localPath) {
    // setup staging
    let stagingPath = userSettings.localPath
    archive.staging = hyperstaging(archive, stagingPath, {
      ignore: ['/.dat', '/.git', '/dat.json']
    })
  } else {
    archive.staging = null
  }
}

var connIdCounter = 0 // for debugging
function createReplicationStream (info) {
  // create the protocol stream
  var connId = ++connIdCounter
  var start = Date.now()
  var stream = hypercoreProtocol({
    id: networkId,
    live: true,
    encrypt: true
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
    var chan = dkeyStr.slice(0,6) + '..' + dkeyStr.slice(-2)
    var archive = archivesByDKey[dkeyStr]
    if (!archive) {
      return
    }

    // ditch if we already have this stream
    if (archive.replicationStreams.indexOf(stream) !== -1) {
      return
    }

    // do some logging
    var keyStr = datEncoding.toStr(archive.key)
    var keyStrShort = keyStr.slice(0,6) + '..' + keyStr.slice(-2)
    log(keyStr, `new connection id=${connId} dkey=${chan} type=${info.type} host=${info.host}:${info.port}`)

    // create the replication stream
    archive.replicate({stream, live: true})
    archive.replicationStreams.push(stream)
    onNetworkChanged(archive)
    stream.once('close', () => {
      var rs = archive.replicationStreams
      var i = rs.indexOf(stream)
      if (i !== -1) rs.splice(rs.indexOf(stream), 1)
      onNetworkChanged(archive)
    })
  }

  // debugging
  stream.once('handshake', () => {
    log(false, `got handshake (${Date.now() - start}ms) id=${connId} type=${info.type} host=${info.host}:${info.port}`)
  })
  stream.on('error', err => {
    log(false, `error (${Date.now() - start}ms) id=${connId} type=${info.type} host=${info.host}:${info.port} error=${err.toString()}`)
  })
  stream.on('close', err => {
    log(false, `closing connection (${Date.now() - start}ms) id=${connId} type=${info.type} host=${info.host}:${info.port}`)
  })
  return stream
}

function onNetworkChanged (archive) {
  var now = Date.now()
  var lastHistory = archive.peerHistory.slice(-1)[0]
  if (lastHistory && (now - lastHistory.ts) < 10e3) {
    // if the last datapoint was < 10s ago, just update it
    lastHistory.peers = archive.replicationStreams.length
  } else {
    archive.peerHistory.push({
      ts: Date.now(),
      peers: archive.replicationStreams.length
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
    totalPeerCount += archives[k].replicationStreams.length
  }
  archivesEvents.emit('network-changed', {
    details: {
      url: `dat://${datEncoding.toStr(archive.key)}`,
      peers: archive.replicationStreams.map(s => ({host: s.peerInfo.host, port: s.peerInfo.port})),
      peerCount: archive.replicationStreams.length,
      totalPeerCount
    }
  })
}

function log (...args) {
  // pull out the key
  var key = args[0]
  args = args.slice(1)
  debug(...args, `key=${key}`)
  debugEvents.emit(key || 'all', {args})
}