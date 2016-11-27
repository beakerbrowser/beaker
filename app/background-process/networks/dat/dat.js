import { shell } from 'electron'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import pump from 'pump'
import multicb from 'multicb'
import log from 'loglevel'
import trackArchiveEvents from './track-archive-events'
import { throttle, cbPromise } from '../../../lib/functions'
import { bufToStr, readReadme, readManifest, writeArchiveFile } from './helpers'
import { grantPermission } from '../../ui/permissions'

// db modules
import * as archivesDb from '../../dbs/archives'
import hyperdrive from 'hyperdrive'

// network modules
import hyperdriveArchiveSwarm from 'hyperdrive-archive-swarm'
import hyperImport from 'hyperdrive-import-files'
import { resolveDatDNS } from '../dns'

// file modules
import path from 'path'
import fs from 'fs'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import getFolderSize from 'get-folder-size'

// constants
// =

import { DAT_MANIFEST_FILENAME } from '../../../lib/const'

// globals
// =

var drive // hyperdrive instance
var archives = {} // memory cache of archive objects. key -> archive
var swarms = {} // memory cache of archive swarms. key -> swarm
var archivesEvents = new EventEmitter()

// exported API
// =

export function setup () {
  drive = hyperdrive(archivesDb.getLevelInstance())

  // wire up event handlers
  archivesDb.on('update:archive-user-settings', configureArchive)

  // load and configure all saved archives
  archivesDb.queryArchiveUserSettings({ isSaved: true }).then(
    archives => archives.forEach(a => configureArchive(a.key, a)),
    err => log.error('[DAT] Failed to load networked archives', err)
  )
}

// re-exports
//

export const resolveName = resolveDatDNS
export const setArchiveUserSettings = archivesDb.setArchiveUserSettings
export const getGlobalSetting = archivesDb.getGlobalSetting
export const setGlobalSetting = archivesDb.setGlobalSetting

// archive creation
// =

export function createNewArchive (opts) {
  // massage inputs
  opts = opts || {}
  var title = (opts.title && typeof opts.title === 'string') ? opts.title : ''
  var description = (opts.description && typeof opts.description === 'string') ? opts.description : ''
  var createdBy = null
  if (opts.origin && opts.origin.startsWith('dat://')) createdBy = { url: opts.origin }
  if (createdBy && opts.originTitle && typeof opts.originTitle === 'string') createdBy.title = opts.originTitle

  return new Promise(resolve => {
    // create the archive
    var archive = loadArchive(null)
    var key = archive.key.toString('hex')
    resolve(key)

    // import files
    if (opts.importFiles) {
      let importFiles = Array.isArray(opts.importFiles) ? opts.importFiles : [opts.importFiles]
      importFiles.forEach(importFile => writeArchiveFileFromPath(key, { src: importFile, dst: '/' }))
    }

    // write the manifest
    if (title || description || createdBy) {
      writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify({ title, description, createdBy }))
    }

    // write the user settings
    setArchiveUserSettings(key, { isSaved: true, isHosting: true })
    // write the perms
    if (createdBy && createdBy.url) grantPermission('modifyDat:' + key, createdBy.url)
    // write the meta
    archive.pullLatestArchiveMeta()
  })
}

export function forkArchive (oldArchiveKey, opts) {
  // massage inputs
  opts = opts || {}
  var title = (opts.title && typeof opts.title === 'string') ? opts.title : ''
  var description = (opts.description && typeof opts.description === 'string') ? opts.description : ''

  // get the target archive
  var oldArchive = getArchive(oldArchiveKey)
  if (!oldArchive) {
    return Promise.reject(new Error('Invalid archive key'))
  }

  // create the new archive
  return createNewArchive({ title, description, origin: 'beaker:archives' }).then(newArchiveKey => {
    // list the old archive's files
    var newArchive = getArchive(newArchiveKey)
    oldArchive.list((err, entries) => {
      if (err) return log.error('[DAT] Failed to list old archive files during fork', err)

      // TEMPORARY
      // remove duplicates
      // this is only needed until hyperdrive fixes its .list()
      // see https://github.com/mafintosh/hyperdrive/pull/99
      // -prf
      var entriesDeDuped = {}
      entries.forEach(entry => { entriesDeDuped[entry.name] = entry })
      entries = Object.keys(entriesDeDuped).map(name => entriesDeDuped[name])

      // copy over files
      next()
      function next (err) {
        if (err) log.error('[DAT] Error while copying file during fork', err)
        var entry = entries.shift()
        if (!entry) return // done!

        // skip non-files, undownloaded files, and the old manifest
        if (entry.type !== 'file' || !oldArchive.isEntryDownloaded(entry) || entry.name === DAT_MANIFEST_FILENAME) {
          return next()
        }

        // copy the file
        pump(
          oldArchive.createFileReadStream(entry),
          newArchive.createFileWriteStream({ name: entry.name, mtime: entry.mtime, ctime: entry.ctime }),
          next
        )
      }
    })
    return newArchiveKey
  })
}

// archive management
// =

// load archive and set the swarming behaviors
export function configureArchive (key, settings) {
  var upload = settings.isHosting
  var download = settings.isSaved
  var archive = getArchive(key)
  if (archive) {
    // re-set swarming
    swarm(key, { upload })
  } else {
    // load and set swarming there
    archive = loadArchive(new Buffer(key, 'hex'), { upload })
  }

  archive.open(() => {
    // set download prioritization
    if (download) archive.content.prioritize({start: 0, end: Infinity}) // autodownload all content
    else archive.content.unprioritize({start: 0, end: Infinity}) // download content on demand
  })
}

export function loadArchive (key, swarmOpts) {
  // validate key
  if (key !== null && (!Buffer.isBuffer(key) || key.length !== 32)) {
    return
  }

  // create the archive instance
  var archive = drive.createArchive(key, {
    live: true,
    sparse: true,
    file: name => raf(path.join(archivesDb.getArchiveFilesPath(archive), name))
  })
  mkdirp.sync(archivesDb.getArchiveFilesPath(archive)) // ensure the folder exists
  cacheArchive(archive)
  swarm(archive, swarmOpts)

  // prioritize the entire metadata feed, but leave content to be downloaded on-demand
  archive.metadata.prioritize({priority: 0, start: 0, end: Infinity})

  // wire up events
  archive.pullLatestArchiveMeta = throttle(() => pullLatestArchiveMeta(archive), 1e3)
  trackArchiveEvents(archivesEvents, archive)

  return archive
}

export function cacheArchive (archive) {
  archives[archive.key.toString('hex')] = archive
}

export function getArchive (key) {
  return archives[bufToStr(key)]
}

export function getOrLoadArchive (key) {
  key = bufToStr(key)
  return getArchive(key) || loadArchive(new Buffer(key, 'hex'))
}

export function openInExplorer (key) {
  var folderpath = archivesDb.getArchiveFilesPath(key)
  log.debug('[DAT] Opening in explorer:', folderpath)
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
  return new Promise((resolve, reject) => {
    resolveDatDNS(name, (err, key) => {
      if (err) return reject(new Error(err.code || err))

      // get the archive
      var archive = getOrLoadArchive(key)

      // fetch archive data
      var done = multicb({ pluck: 1, spread: true })
      var metaCB = done()
      archivesDb.getArchiveMeta(key).then(meta => metaCB(null, meta))
      var userSettingsCB = done()
      archivesDb.getArchiveUserSettings(key).then(settings => userSettingsCB(null, settings))
      if (opts.entries) archive.list(done())
      if (opts.readme) readReadme(archive, done())
      done((err, meta, userSettings, entries, readme) => {
        if (err) return reject(err)

        // attach additional data
        meta.userSettings = userSettings
        meta.entries = entries
        meta.readme = readme
        // metadata for history view
        meta.blocks = archive.metadata.blocks
        meta.size = entries.filter(x => x.type === 'file').reduce((sum, x) => sum + x.length, 0)
        meta.metaSize = archive.metadata.bytes
        meta.contentKey = archive.content.key

        if (opts.contentBitfield) meta.contentBitfield = archive.content.bitfield.buffer
        meta.peers = archive.metadata.peers.length
        resolve(meta)
      })
    })
  })
}

export function getArchiveStats (key) {
  return new Promise((resolve, reject) => {
    // TODO replace this with hyperdrive-stats
    // TODO at time of writing, this will count overwritten files multiple times, because list() hasnt been fixed yet

    // initialize the stats structure
    var stats = {
      bytesTotal: 0,
      blocksProgress: 0,
      blocksTotal: 0,
      filesTotal: 0
    }

    // fetch archive
    var archive = getArchive(key)
    if (!archive) return reject(new Error('Invalid archive key'))

    // fetch the archive entries
    archive.list((err, entries) => {
      if (err) return reject(err)

      // tally the current state
      entries.forEach(entry => {
        stats.bytesTotal += entry.length
        stats.blocksProgress += archive.countDownloadedBlocks(entry)
        stats.blocksTotal += entry.blocks
        stats.filesTotal++
      })
      resolve(stats)
    })
  })
}

// archive updaters
// =

export function updateArchiveManifest (key, updates) {
  return cbPromise(cb => {
    // fetch the current manifest
    var archive = getOrLoadArchive(key)
    readManifest(archive, (_, manifest) => {
      // update values
      manifest = manifest || {}
      Object.assign(manifest, updates)
      writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest), cb)
    })
  })
}

export function writeArchiveFileFromPath (key, opts) {
  return cbPromise(cb => {
    if (!opts || typeof opts !== 'object' || typeof opts.src !== 'string' || typeof opts.dst !== 'string') {
      return cb(new Error('Must provide .src and .dst filepaths'))
    }

    // open the archive and ensure we can write
    var archive = getOrLoadArchive(key)
    archive.open(() => {
      if (!archive.owner) return cb(new Error('Cannot write: not the archive owner'))

      let { src, dst } = opts
      if (!dst) dst = '/'

      // update the dst if it's a directory
      try {
        var stat = fs.statSync(src)
        if (stat.isDirectory()) {
          // put at a subpath, so that the folder's contents dont get imported into the target
          dst = path.join(dst, path.basename(src))
        }
      } catch (e) {
        return cb(new Error('File not found'))
      }

      // read the file or file-tree into the archive
      log.debug('[DAT] Writing file(s) from path:', src, 'to', dst)
      hyperImport(archive, src, {
        basePath: dst,
        live: false,
        resume: true,
        ignore: ['.dat', '**/.dat', '.git', '**/.git']
      }, cb)
    })
  })
}

// archive networking
// =

// put the archive into the network, for upload and download
export function swarm (key, opts) {
  // massage inputs
  key = bufToStr(key.key || key)
  opts = { upload: (opts && opts.upload), download: true, utp: true, tcp: true }

  // fetch
  if (key in swarms) {
    var s = swarms[key]

    // if config is ===, then just return existing instance
    if (s.uploading === opts.upload) return s

    // reswarm
    unswarm(key, () => swarm(key, opts))
    return
  }

  // create
  log.debug('[DAT] Swarming archive', key)
  var archive = getArchive(key)
  var s = hyperdriveArchiveSwarm(archive, opts)
  swarms[key] = s
  archivesEvents.emit('update-archive', { key, isUploading: opts.upload, isDownloading: true })

  // wire up events
  s.on('peer', peer => log.debug('[DAT] Connection', peer.id, 'from discovery-swarm'))

  return s
}

// take the archive out of the network
export function unswarm (key, cb) {
  key = bufToStr(key)
  var s = swarms[key]
  if (!s) return cb()
  if (s.isClosing) {
    if (cb) s.on('close', cb)
    return
  }
  s.isClosing = true
  s.leave(getArchive(key).discoveryKey)
  s.close(() => {
    log.debug('[DAT] Stopped swarming archive', key)
    archivesEvents.emit('update-archive', { key, isDownloading: false, isUploading: false })
    delete swarms[key]
    cb && cb()
  })

  // TODO unregister ALL events that were registered in swarm() !!
}

// prioritize an entry for download
export function downloadArchiveEntry (key, name) {
  return cbPromise(cb => {
    // get the archive
    var archive = getArchive(key)
    if (!archive) cb(new Error('Invalid archive key'))

    // lookup the entry
    archive.lookup(name, (err, entry) => {
      if (err || !entry) return cb(err)
      if (entry.type !== 'file') return cb(new Error('Entry must be a file'))

      // download the entry
      archive.content.prioritize({
        start: entry.content.blockOffset,
        end: entry.content.blockOffset + entry.blocks,
        priority: 3,
        linear: true
      })
      archive.download(entry, cb)
    })
  })
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
    readManifest(archive, done())

    // calculate the size on disk
    var sizeCb = done()
    getFolderSize(archivesDb.getArchiveFilesPath(archive), (_, size) => {
      sizeCb(null, size)
    })

    done((_, manifest, size) => {
      manifest = manifest || {}
      var { title, description, author, createdBy } = manifest
      var mtime = Date.now() // use our local update time
      var isOwner = archive.owner
      size = size || 0

      // write the record
      var update = { title, description, author, createdBy, mtime, size, isOwner }
      log.debug('[DAT] Writing meta', update)
      archivesDb.setArchiveMeta(key, update).then(
        () => {
          update.key = key
          archivesEvents.emit('update-archive', update)
        },
        err => log.debug('[DAT] Error while writing archive meta', key, err)
      )
    })
  })
}
