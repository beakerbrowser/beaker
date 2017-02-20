import { shell } from 'electron'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import pump from 'pump'
import multicb from 'multicb'
import datEncoding from 'dat-encoding'
import pda from 'pauls-dat-api'
var debug = require('debug')('dat')
import trackArchiveEvents from './track-archive-events'
import { debounce, cbPromise } from '../../../lib/functions'
import { grantPermission } from '../../ui/permissions'

// db modules
import * as archivesDb from '../../dbs/archives'
import hyperdrive from 'hyperdrive'

// network modules
import swarmDefaults from 'datland-swarm-defaults'
import discoverySwarm from 'discovery-swarm'
import hyperImport from 'hyperdrive-import-files'
const datDns = require('dat-dns')()

// file modules
import path from 'path'
import fs from 'fs'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import getFolderSize from 'get-folder-size'

// constants
// =

import {DAT_MANIFEST_FILENAME} from '../../../lib/const'

// globals
// =

var drive // hyperdrive instance
var archives = {} // memory cache of archive objects. key -> archive
var archivesByDiscoveryKey = {} // mirror of the above cache, but discoveryKey -> archive
var archivesEvents = new EventEmitter()

// exported API
// =

export function setup () {
  drive = hyperdrive(archivesDb.getLevelInstance())

  // wire up event handlers
  archivesDb.on('update:archive-user-settings', (key, settings) => {
  archivesEvents.emit('update-user-settings', { key, isSaved: settings.isSaved })
    configureArchive(key, settings)
  })

  // load and configure all saved archives
  archivesDb.queryArchiveUserSettings({ isSaved: true }).then(
    archives => archives.forEach(a => configureArchive(a.key, a)),
    err => console.error('Failed to load networked archives', err)
  )
}

// re-exports
//

export const resolveName = datDns.resolveName
export const setArchiveUserSettings = archivesDb.setArchiveUserSettings
export const getGlobalSetting = archivesDb.getGlobalSetting
export const setGlobalSetting = archivesDb.setGlobalSetting

// archive creation and mutation
// =

export function createNewArchive ({ title, description, author, forkOf, origin, originTitle, importFiles, noWait, inplaceImport } = {}) {
  // massage inputs
  var createdBy
  if (typeof origin === 'string' && origin.startsWith('dat://')) createdBy = { url: origin }
  if (createdBy && typeof originTitle === 'string') createdBy.title = originTitle

  return new Promise(resolve => {
    // create the archive
    var archive = loadArchive(null)
    var key = archive.key.toString('hex')
    var done
    if (noWait) {
      done = () => {}
      resolve(key)
    } else {
       done = () => resolve(key)
    }

    // write the manifest then resolve
    pda.writeManifest(archive, {
      url: `dat://${key}/`,
      title,
      description,
      author,
      forkOf,
      createdBy
    }, done)
    // write the user settings
    setArchiveUserSettings(key, { isSaved: true })
    // write the perms
    if (createdBy && createdBy.url) grantPermission('modifyDat:' + key, createdBy.url)

    // import files
    if (importFiles) {
      importFiles = Array.isArray(importFiles) ? importFiles : [importFiles]
      importFiles.forEach(srcPath => {
        pda.exportFilesystemToArchive({
          srcPath,
          dstArchive: archive,
          inplaceImport
        })
      })
    }
  })
}

export function forkArchive (srcArchiveKey, opts) {
  opts = opts || {}

  // get the old archive
  var dstArchive
  var srcArchive = getArchive(srcArchiveKey)
  if (!srcArchive) {
    return Promise.reject(new Error('Invalid archive key'))
  }

  // fetch old archive meta
  return archivesDb.getArchiveMeta(srcArchiveKey).then(meta => {
    // override any manifest data
    var dstArchiveOpts = {
      title: (opts.title) ? opts.title : meta.title,
      description: (opts.description) ? opts.description : meta.description,
      forkOf: (meta.forkOf || []).concat(`dat://${srcArchiveKey}/`),
      origin: opts.origin,
      noWait: true
    }
    if (opts.author) dstArchiveOpts.author = opts.author

    // create the new archive
    return createNewArchive(dstArchiveOpts)
  }).then(dstArchiveKey => {
    dstArchive = getArchive(dstArchiveKey)
    return pda.exportArchiveToArchive({
      srcArchive,
      dstArchive,
      skipUndownloadedFiles: true,
      ignore: ['/dat.json']
    })
  }).then(() => datEncoding.toStr(dstArchive.key))
}

export function updateArchiveManifest (key, updates) {
  var archive = getArchive(key)
  if (!archive) {
    return Promise.reject(new Error('Invalid archive key'))
  }
  return pda.updateManifest(archive, updates)
}

export function writeArchiveFileFromData (key, path, data, opts) {
  var archive = getArchive(key)
  if (!archive) {
    return Promise.reject(new Error('Invalid archive key'))
  }
  return pda.writeFile(archive, path, data, opts)
}

export function writeArchiveFileFromPath (dstKey, opts) {
  var dstArchive = getArchive(dstKey)
  if (!dstArchive) {
    return Promise.reject(new Error('Invalid archive key'))
  }
  return pda.exportFilesystemToArchive({
    srcPath: opts.src,
    dstArchive,
    dstPath: opts.dst,
    ignore: opts.ignore,
    dryRun: opts.dryRun,
    inplaceImport: true,
    skipUndownloadedFiles: true
  })
}

export function exportFileFromArchive (srcKey, srcPath, dstPath) {
  var srcArchive = getArchive(srcKey)
  if (!srcArchive) {
    return Promise.reject(new Error('Invalid archive key'))
  }
  return pda.exportArchiveToFilesystem({
    srcArchive,
    srcPath,
    dstPath,
    overwriteExisting: true
  })
}

// archive management
// =

// load archive and set the swarming behaviors
export function configureArchive (key, settings) {
  var download = settings.isSaved
  var upload = settings.isSaved
  var archive = getOrLoadArchive(key, { noSwarm: true })
  var wasUploading = (archive.userSettings && archive.userSettings.isSaved)
  archive.userSettings = settings
  archivesEvents.emit('update-archive', { key, isUploading: upload, isDownloading: download })

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

export function loadArchive (key, { noSwarm } = {}) {
  // validate key
  if (key !== null && (!Buffer.isBuffer(key) || key.length !== 32)) {
    return
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
  trackArchiveEvents(archivesEvents, archive)

  return archive
}

export function cacheArchive (archive) {
  archives[archive.key.toString('hex')] = archive
  archivesByDiscoveryKey[archive.discoveryKey.toString('hex')] = archive
}

export function getArchive (key) {
  if (typeof key !== 'string') {
    key = datEncoding.toStr(key)
  }
  return archives[key]
}

export function getActiveArchives () {
  return archives
}

export function getOrLoadArchive (key, opts) {
  key = datEncoding.toStr(key)
  return getArchive(key) || loadArchive(new Buffer(key, 'hex'), opts)
}

export function openInExplorer (key) {
  var folderpath = archivesDb.getArchiveFilesPath(key)
  debug('Opening in explorer:', folderpath)
  shell.openExternal('file://' + folderpath)
}

// archive fetch/query
// =

export function queryArchives (query) {
  // run the query
  return archivesDb.queryArchiveUserSettings(query, { includeMeta: true }).then(archiveInfos => {
    // attach some live data
    archiveInfos.forEach(archiveInfo => {
      var archive = getArchive(archiveInfo.key)
      if (archive) {
        archiveInfo.peers = archive.metadata.peers.length
      }
    })
    return archiveInfos
  })
}

export function getArchiveDetails (name, opts = {}) {
  var archive
  return datDns.resolveName(name).then(key => {
    // get the archive
    archive = getOrLoadArchive(key)

    // fetch archive data
    return Promise.all([
      archivesDb.getArchiveMeta(key),
      archivesDb.getArchiveUserSettings(key),
      (opts.entries) ? new Promise(resolve => archive.list((err, entries) => resolve(entries))) : null
    ])
  }).then(([meta, userSettings, entries]) => {
    // attach additional data
    meta.userSettings = userSettings
    meta.entries = entries

    // metadata for history view
    meta.blocks = archive.metadata.blocks
    meta.metaSize = archive.metadata.bytes
    meta.contentKey = archive.content.key

    if (opts.contentBitfield) {
      meta.contentBitfield = archive.content.bitfield.buffer
    }
    meta.peers = archive.metadata.peers.length
    return meta
  })
}

export function getArchiveStats (key) {
  return new Promise((resolve, reject) => {
    // fetch archive
    var archive = getArchive(key)
    if (!archive) return reject(new Error('Invalid archive key'))

    // fetch the archive entries
    archive.list((err, entries) => {
      if (err) return reject(err)

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
        peers: archive.metadata.peers.length,
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
      resolve(stats)
    })
  })
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

// prioritize all current entries for download
export function downloadArchive (key) {
  return cbPromise(cb => {
    // get the archive
    var archive = getArchive(key)
    if (!archive) cb(new Error('Invalid archive key'))

    // get the current file listing
    archive.list((err, entries) => {
      if (err) return cb(err)

      // TEMPORARY
      // remove duplicates
      // this is only needed until hyperdrive fixes its .list()
      // see https://github.com/mafintosh/hyperdrive/pull/99
      // -prf
      var entriesDeDuped = {}
      entries.forEach(entry => { entriesDeDuped[entry.name] = entry })
      entries = Object.keys(entriesDeDuped).map(name => entriesDeDuped[name])

      // download the enties
      var done = multicb()
      entries.forEach(entry => {
        if (entry.blocks > 0) {
          archive.download(entry, done())
        }
      })
      done(() => cb())
    })
  })
}

// prioritize an entry for download
export function downloadArchiveEntry (key, name, opts) {
  var archive = getArchive(key)
  if (!archive) {
    Promise.reject(new Error('Invalid archive key'))
  }
  return pda.download(archive, name, opts)
}

export function archivesEventStream () {
  return emitStream(archivesEvents)
}

// internal methods
// =

// read metadata for the archive, and store it in the meta db
function pullLatestArchiveMeta (archive) {
  var key = archive.key.toString('hex')
  var done = multicb({ pluck: 1, spread: true })

  // open() just in case (we need .blocks)
  archive.open(() => {
    // read the archive metafiles
    pda.readManifest(archive, done())

    // calculate the size on disk
    var sizeCb = done()
    getFolderSize(archivesDb.getArchiveFilesPath(archive), (_, size) => {
      sizeCb(null, size)
    })

    done((_, manifest, size) => {
      manifest = manifest || {}
      var { title, description, author, version, forkOf, createdBy } = manifest
      var mtime = Date.now() // use our local update time
      var isOwner = archive.owner
      size = size || 0

      // write the record
      var update = { title, description, author, version, forkOf, createdBy, mtime, size, isOwner }
      debug('Writing meta', update)
      archivesDb.setArchiveMeta(key, update).then(
        () => {
          update.key = key
          archivesEvents.emit('update-archive', update)
        },
        err => debug('Error while writing archive meta', key, err)
      )
    })
  })
}
