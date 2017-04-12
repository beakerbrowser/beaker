import emitStream from 'emit-stream'
import EventEmitter from 'events'
import datEncoding from 'dat-encoding'
import pify from 'pify'
import pda from 'pauls-dat-api'
import signatures from 'sodium-signatures'
var debug = require('debug')('dat')
import {debounce} from '../../../lib/functions'
import {grantPermission} from '../../ui/permissions'

// db modules
import * as archivesDb from '../../dbs/archives'
import hyperdrive from 'hyperdrive'

// network modules
import swarmDefaults from 'datland-swarm-defaults'
import discoverySwarm from 'discovery-swarm'
const datDns = require('dat-dns')()

// file modules
import path from 'path'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import getFolderSize from 'get-folder-size'

// constants
// =

import {
  DAT_MANIFEST_FILENAME,
  DAT_HASH_REGEX,
  DAT_URL_REGEX
} from '../../../lib/const'
import {InvalidURLError} from 'beaker-error-constants'

// globals
// =

var archives = {} // in-memory cache of archive objects. key -> archive
var archivesEvents = new EventEmitter()

// exported API
// =

export function setup () {
  // wire up event handlers
  archivesDb.on('update:archive-user-settings', (key, settings) => {
    // emit event
    var details = {
      url: 'dat://' + key,
      isSaved: settings.isSaved
    }
    archivesEvents.emit(settings.isSaved ? 'added' : 'removed', {details})

    // respond to change internally
    configureArchive(key, settings)
  })

  // load and configure all saved archives
  archivesDb.query(0, {isSaved: true}).then(
    archives => archives.forEach(a => configureArchive(a.key, a)),
    err => console.error('Failed to load networked archives', err)
  )
}

export function createEventStream () {
  return emitStream(archivesEvents)
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
    var [manifest, size] = await Promise.all([
      pda.readManifest(archive).catch(err => {}),
      pify(getFolderSize)(archivesDb.getArchiveFilesPath(archive))
    ])
    manifest = manifest || {}
    var {title, description, forkOf, createdBy} = manifest
    var mtime = Date.now() // use our local update time
    var isOwner = archive.writable
    size = size || 0

    // write the record
    var details = {title, description, forkOf, createdBy, mtime, size, isOwner}
    debug('Writing meta', details)
    await archivesDb.setMeta(key, details)

    // emit the updated event
    details.url = 'dat://' + key
    archivesEvents.emit('updated', {details})
  } catch (e) {
    console.error('Error pulling meta', e)
  }
}

// archive creation
// =

export async function createNewArchive (manifest) {
  // create the archive
  var archive = await loadArchive(null)
  var key = datEncoding.toStr(archive.key)
  manifest.url = `dat://${key}/`

  // write the manifest then resolve
  await pda.writeManifest(archive, manifest)

  // write the user settings
  await archivesDb.setUserSettings(0, key, {isSaved: true})

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
    srcArchive,
    dstArchive,
    skipUndownloadedFiles: true,
    ignore: ['/dat.json']
  })

  return dstArchiveUrl
}

// archive management
// =

export async function loadArchive (key, { noSwarm } = {}) {
  // validate key
  var secretKey
  if (key && !Buffer.isBuffer(key)) {
    // existing dat
    key = fromURLToKey(key)
    if (!DAT_HASH_REGEX.test(key)) {
      throw new InvalidURLError()
    }
    key = datEncoding.toBuf(key)
  } else {
    // new dat, generate keys
    var kp = signatures.keyPair()
    key = kp.publicKey
    secretKey = kp.secretKey
  }

  // ensure the folder exists
  var archivePath = archivesDb.getArchiveFilesPath(key)
  mkdirp.sync(archivePath)

  // create the archive instance
  var archive = hyperdrive(archivePath, key, {sparse: true, secretKey})
  await new Promise((resolve, reject) => {
    archive.ready(err => {
      if (err) reject(err)
      else resolve()
    })
  })
  archive.replicationStreams = [] // list of all active replication streams
  archive.userSettings = null // will be set by `configureArchive` if at all
  archive.peerHistory = [] // samples of the peer count
  cacheArchive(key, archive)
  if (!noSwarm) {
    joinSwarm(archive)
  }

  // wire up events
  archive.pullLatestArchiveMeta = debounce(() => pullLatestArchiveMeta(archive), 1e3)
  // archive.metadata.on('download-finished', () => archive.pullLatestArchiveMeta()) TODO

  return archive
}

export function cacheArchive (key, archive) {
  archives[datEncoding.toStr(key)] = archive
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
  meta.userSettings = { isSaved: userSettings.isSaved }
  meta.peers = archive.metadata.peers.length
  meta.peerHistory = archive.peerHistory

  return meta
}

// archive networking
// =

// put the archive into the network, for upload and download
export function joinSwarm (key, opts) {
  var archive = (typeof key == 'object' && key.key) ? key : getArchive(key)
  if (!archive || archive.isSwarming) return

  var keyStr = datEncoding.toStr(archive.key)
  var swarm = discoverySwarm(swarmDefaults({
    hash: false,
    utp: true,
    tcp: true,
    stream: (info) => {
      var dkeyStr = datEncoding.toStr(archive.discoveryKey)
      var chan = dkeyStr.slice(0,6) + '..' + dkeyStr.slice(-2)
      var keyStrShort = keyStr.slice(0,6) + '..' + keyStr.slice(-2)
      debug('new connection chan=%s type=%s host=%s key=%s', chan, info.type, info.host, keyStrShort)

      // create the replication stream
      var stream = archive.replicate({live: true})
      archive.replicationStreams.push(stream)
      stream.once('close', () => {
        var rs = archive.replicationStreams
        var i = rs.indexOf(stream)
        if (i !== -1) rs.splice(rs.indexOf(stream), 1)
      })

      // timeout the connection after 5s if handshake does not occur
      var TO = setTimeout(() => {
        debug('handshake timeout chan=%s type=%s host=%s key=%s', chan, info.type, info.host, keyStrShort)
        stream.destroy(new Error('Timed out waiting for handshake'))
      }, 5000)
      stream.once('handshake', () => clearTimeout(TO))

      // debugging
      stream.on('error', err => debug('error chan=%s type=%s host=%s key=%s', chan, info.type, info.host, keyStrShort, err))
      stream.on('close', err => debug('closing connection chan=%s type=%s host=%s key=%s', chan, info.type, info.host, keyStrShort))
      return stream
    }
  }))
  swarm.listen()
  swarm.on('error', err => debug('Swarm error for', keyStr, err))
  swarm.join(archive.discoveryKey)
  archive.metadata.on('peer-add', onNetworkChanged)
  archive.metadata.on('peer-remove', onNetworkChanged)

  debug('Swarming archive', datEncoding.toStr(archive.key), 'discovery key', datEncoding.toStr(archive.discoveryKey))
  archive.isSwarming = true
  archive.swarm = swarm
}

// take the archive out of the network
export function leaveSwarm (key, cb) {
  var archive = (typeof key == 'object' && key.discoveryKey) ? key : getArchive(key)
  if (!archive || !archive.isSwarming) return

  var keyStr = datEncoding.toStr(archive.key)
  var swarm = archive.swarm

  debug('Unswarming archive %s disconnected %d peers', keyStr, archive.metadata.peers.length)
  archive.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
  archive.replicationStreams.length = 0
  archive.metadata.removeListener('peer-add', onNetworkChanged)
  archive.metadata.removeListener('peer-remove', onNetworkChanged)
  swarm.leave(archive.discoveryKey)
  swarm.destroy()
  delete archive.swarm
  archive.isSwarming = false
}

// internal methods
// =

// load archive and setup any behaviors
async function configureArchive (key, settings) {
  var archive = await getOrLoadArchive(key)
  archive.userSettings = settings
}

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

function onNetworkChanged (e) {
  var key = datEncoding.toStr(this.key)
  var archive = archives[key]

  var now = Date.now()
  var lastHistory = archive.peerHistory.slice(-1)[0]
  if (lastHistory && (now - lastHistory.ts) < 10e3) {
    // if the last datapoint was < 10s ago, just update it
    lastHistory.peers = this.peers.length
  } else {
    archive.peerHistory.push({
      ts: Date.now(),
      peers: this.peers.length
    })
  }

  // keep peerHistory from getting too long
  if (archive.peerHistory.length >= 500) {
    // downsize to 360 points, which at 10s intervals covers one hour
    archive.peerHistory = archive.peerHistory.slice(archive.peerHistory.length - 360)
  }

  // count # of peers
  var peers = 0
  for (var k in archives) {
    peers += archives[k].metadata.peers.length
  }
  archivesEvents.emit('network-changed', {
    details: {
      url: `dat://${key}`,
      peers: this.peers.length,
      totalPeers: peers
    }
  })
}
