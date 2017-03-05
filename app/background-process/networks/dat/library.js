import emitStream from 'emit-stream'
import EventEmitter from 'events'
import datEncoding from 'dat-encoding'
import pify from 'pify'
import pda from 'pauls-dat-api'
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

var drive // hyperdrive instance
var archives = {} // in-memory cache of archive objects. key -> archive
var archivesByDiscoveryKey = {} // mirror of the above cache, but discoveryKey -> archive
var archivesEvents = new EventEmitter()

// exported API
// =

export function setup () {
  drive = hyperdrive(archivesDb.getLevelInstance())

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
  archivesDb.queryArchiveUserSettings({isSaved: true}).then(
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
    var originMeta = await archivesDb.getArchiveMeta(originKey)
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

    // open() just in case (we need .blocks)
    await pify(archive.open.bind(archive))()

    // read the archive meta and size on disk
    var [manifest, size] = await Promise.all([
      pda.readManifest(archive).catch(err => {}),
      pify(getFolderSize)(archivesDb.getArchiveFilesPath(archive))
    ])
    manifest = manifest || {}
    var { title, description, author, forkOf, createdBy } = manifest
    var mtime = Date.now() // use our local update time
    var isOwner = archive.owner
    size = size || 0

    // write the record
    var details = { title, description, author, forkOf, createdBy, mtime, size, isOwner }
    debug('Writing meta', details)
    await archivesDb.setArchiveMeta(key, details)

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
  var archive = loadArchive(null)
  var key = datEncoding.toStr(archive.key)
  manifest.url = `dat://${key}/`

  // write the manifest then resolve
  await pda.writeManifest(archive, manifest)

  // write the user settings
  await archivesDb.setArchiveUserSettings(key, { isSaved: true })

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

export function loadArchive (key, { noSwarm } = {}) {
  // validate key
  if (key && !Buffer.isBuffer(key)) {
    key = fromURLToKey(key)
    if (!DAT_HASH_REGEX.test(key)) {
      throw new InvalidURLError()
    }
    key = datEncoding.toBuf(key)
  }

  // create the archive instance
  var archive = drive.createArchive(key, {
    live: true,
    sparse: true,
    verifyReplicationReads: true,
    file: name => raf(path.join(archivesDb.getArchiveFilesPath(archive), name))
  })
  archive.userSettings = null // will be set by `configureArchive` if at all
  mkdirp.sync(archivesDb.getArchiveFilesPath(archive)) // ensure the folder exists
  cacheArchive(archive)
  if (!noSwarm) joinSwarm(archive)

  // prioritize the entire metadata feed, but leave content to be downloaded on-demand
  archive.metadata.prioritize({priority: 0, start: 0, end: Infinity})

  // wire up events
  archive.pullLatestArchiveMeta = debounce(() => pullLatestArchiveMeta(archive), 1e3)
  archive.metadata.on('download-finished', () => archive.pullLatestArchiveMeta())

  return archive
}

export function cacheArchive (archive) {
  archives[datEncoding.toStr(archive.key)] = archive
  archivesByDiscoveryKey[datEncoding.toStr(archive.discoveryKey)] = archive
}

export function getArchive (key) {
  key = fromURLToKey(key)
  return archives[key]
}

export function getActiveArchives () {
  return archives
}

export function getOrLoadArchive (key, opts) {
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
  var archiveInfos = await archivesDb.queryArchiveUserSettings(query, { includeMeta: true })

  // attach some live data
  archiveInfos.forEach(archiveInfo => {
    var archive = getArchive(archiveInfo.key)
    if (archive) {
      archiveInfo.peers = archive.metadata.peers.length
    }
  })
  return archiveInfos
}

export async function getArchiveInfo (key, opts = {}) {
  // get the archive
  key = fromURLToKey(key)
  var archive = getOrLoadArchive(key)

  // fetch archive data
  var [meta, userSettings] = await Promise.all([
    archivesDb.getArchiveMeta(key),
    archivesDb.getArchiveUserSettings(key)
  ])
  meta.userSettings = { isSaved: userSettings.isSaved }
  meta.peers = archive.metadata.peers.length

  // optional data
  if (opts.contentBitfield) {
    meta.contentBitfield = archive.content.bitfield.buffer
  }
  if (opts.stats) { 
    // fetch the archive entries
    var entries = await pify(archive.list.bind(archive))()

    // TEMPORARY
    // remove duplicates
    // this is only needed until hyperdrive fixes its .list()
    // see https://github.com/mafintosh/hyperdrive/pull/99
    // -prf
    var entriesDeDuped = {}
    entries.forEach(entry => { entriesDeDuped[entry.name] = entry })
    entries = Object.keys(entriesDeDuped).map(name => entriesDeDuped[name])

    // tally the current state
    var stats = {
      filesTotal: 0,
      meta: {
        blocksProgress: archive.metadata.blocks - archive.metadata.blocksRemaining(),
        blocksTotal: archive.metadata.blocks
      },
      content: {
        bytesTotal: 0,
        blocksProgress: 0,
        blocksTotal: 0
      }
    }
    entries.forEach(entry => {
      stats.content.bytesTotal += entry.length
      stats.content.blocksProgress += archive.countDownloadedBlocks(entry)
      stats.content.blocksTotal += entry.blocks
      stats.filesTotal++
    })
    meta.stats = stats
  }

  return meta
}

// archive networking
// =

// put the archive into the network, for upload and download
export function joinSwarm (key, opts) {
  var archive = (typeof key == 'object' && key.discoveryKey) ? key : getArchive(key)
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
      var stream = archive.replicate({
        download: true,
        upload: (archive.userSettings && archive.userSettings.isSaved)
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
  archive.unreplicate() // stop all active replications
  swarm.leave(archive.discoveryKey)
  swarm.destroy()
  delete archive.swarm
  archive.isSwarming = false
}

// internal methods
// =

// load archive and set the swarming behaviors
function configureArchive (key, settings) {
  var download = settings.isSaved
  var upload = settings.isSaved
  var archive = getOrLoadArchive(key, { noSwarm: true })
  var wasUploading = (archive.userSettings && archive.userSettings.isSaved)
  archive.userSettings = settings

  archive.open(() => {
    if (!archive.isSwarming) {
      // announce
      joinSwarm(archive)
    } else if (upload !== wasUploading) {
      // reset the replication feeds
      debug('Resetting the replication stream with %d peers', archive.metadata.peers.length)
      archive.metadata.peers.forEach(({ stream }) => {
        archive.unreplicate(stream)
        // HACK
        // some state needs to get reset, but we havent figured out what event to watch for
        // so... wait 3 seconds
        // https://github.com/beakerbrowser/beaker/issues/205
        // -prf
        setTimeout(() => archive.replicate({ stream, download: true, upload }), 3e3)
      })
    }
  })
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
