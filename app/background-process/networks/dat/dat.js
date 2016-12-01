import { shell } from 'electron'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import pump from 'pump'
import multicb from 'multicb'
var debug = require('debug')('dat')
import trackArchiveEvents from './track-archive-events'
import { debounce, cbPromise } from '../../../lib/functions'
import { generate as generateManifest } from './dat-manifest'
import { bufToStr, readReadme, readManifest, statArchiveFile, writeArchiveFile, readArchiveDirectory } from './helpers'
import { grantPermission } from '../../ui/permissions'

// db modules
import * as archivesDb from '../../dbs/archives'
import hyperdrive from 'hyperdrive'

// network modules
import swarmDefaults from 'datland-swarm-defaults'
import discoverySwarm from 'discovery-swarm'
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

export const resolveName = resolveDatDNS
export const setArchiveUserSettings = archivesDb.setArchiveUserSettings
export const getGlobalSetting = archivesDb.getGlobalSetting
export const setGlobalSetting = archivesDb.setGlobalSetting

// archive creation
// =

export function createNewArchive ({ title, description, author, version, forkOf, origin, originTitle, importFiles, noWait, inplaceImport } = {}) {
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
    var manifest = generateManifest({ url: `dat://${key}/`, title, description, author, version, forkOf, createdBy })
    writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2), done)
    // write the user settings
    setArchiveUserSettings(key, { isSaved: true })
    // write the perms
    if (createdBy && createdBy.url) grantPermission('modifyDat:' + key, createdBy.url)

    // import files
    if (importFiles) {
      importFiles = Array.isArray(importFiles) ? importFiles : [importFiles]
      importFiles.forEach(importFile => writeArchiveFileFromPath(key, { src: importFile, dst: '/', inplaceImport }))
    }
  })
}

export function forkArchive (oldArchiveKey, opts) {
  opts = opts || {}

  // get the old archive
  var oldArchive = getArchive(oldArchiveKey)
  if (!oldArchive) {
    return Promise.reject(new Error('Invalid archive key'))
  }

  // fetch old archive meta
  return archivesDb.getArchiveMeta(oldArchiveKey).then(meta => {
    // override any manifest data
    var newArchiveOpts = {
      title: (opts.title) ? opts.title : meta.title,
      description: (opts.description) ? opts.description : meta.description,
      forkOf: (meta.forkOf || []).concat(`dat://${oldArchiveKey}/`),
      origin: opts.origin,
      noWait: true
    }
    if (opts.author) newArchiveOpts.author = opts.author

    // create the new archive
    return createNewArchive(newArchiveOpts)
  }).then(newArchiveKey => {
    return new Promise(resolve => {
      // list the old archive's files
      var newArchive = getArchive(newArchiveKey)
      oldArchive.list((err, entries) => {
        if (err) return console.error('[DAT] Failed to list old archive files during fork', err)

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
          if (err) console.error('[DAT] Error while copying file during fork', err)
          var entry = entries.shift()
          if (!entry) {
            // done!
            return resolve(newArchiveKey)
          }

          // directories
          if (entry.type === 'directory') {
            return newArchive.append({
              name: entry.name,
              type: 'directory',
              mtime: entry.mtime
            }, next)
          }

          // skip other non-files, undownloaded files, and the old manifest
          if (
            entry.type !== 'file' || 
            !oldArchive.isEntryDownloaded(entry) || 
            entry.name === DAT_MANIFEST_FILENAME ||
            entry.name === ('/' + DAT_MANIFEST_FILENAME)
          ) {
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
    })
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
  return archives[bufToStr(key)]
}

export function getActiveArchives () {
  return archives
}

export function getOrLoadArchive (key, opts) {
  key = bufToStr(key)
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
  return new Promise((resolve, reject) => {
    resolveDatDNS(name, (err, key) => {
      if (err) return reject(new Error(err.code || err))

      // get the archive
      var archive = getOrLoadArchive(key)

      // fetch archive data
      var done = multicb({ pluck: 1, spread: true })
      var metaCB = done()
      archivesDb.getArchiveMeta(key).then(meta => metaCB(null, meta)).catch(metaCB)
      var userSettingsCB = done()
      archivesDb.getArchiveUserSettings(key).then(settings => userSettingsCB(null, settings)).catch(userSettingsCB)
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
      writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest, null, 2), cb)
    })
  })
}

export function writeArchiveFileFromData (key, path, data, opts) {
  return cbPromise(cb => {
    var archive = getOrLoadArchive(key)
    writeArchiveFile(archive, path, data, opts, cb)
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
        if (stat.isDirectory() && !opts.inplaceImport) {
          // put at a subpath, so that the folder's contents dont get imported in-place into the target
          dst = path.join(dst, path.basename(src))
        }
      } catch (e) {
        return cb(new Error('File not found'))
      }

      // read the file or file-tree into the archive
      debug('Writing file(s) from path:', src, 'to', dst)
      var stats = { addedFiles: [], updatedFiles: [], skipCount: 0, fileCount: 0, totalSize: 0 }
      var status = hyperImport(archive, src, {
        basePath: dst,
        live: false,
        resume: true,
        ignore: ['.dat', '**/.dat', '.git', '**/.git'],
        dryRun: opts.dryRun
      }, (err) => {
        if (err) return cb(err)
        stats.fileCount = status.fileCount
        stats.totalSize = status.totalSize
        cb(null, stats)
      })
      status.on('file imported', e => {
        if (e.mode === 'created') stats.addedFiles.push(e.path)
        if (e.mode === 'updated') stats.updatedFiles.push(e.path)
      })
      status.on('file skipped', e => {
        stats.skipCount++
      })
    })
  })
}

export function exportFileFromArchive (key, srcPath, dstPath) {
  return cbPromise(cb => {
    var isFirst = true
    var numFiles = 0, numDirectories = 0
    var archive = getOrLoadArchive(key)
    if (!archive) return cb(new Error(`Invalid archive key '${key}'`))
    statThenExport(srcPath, dstPath, err => {
      if (err) return cb(err)
      cb(null, { numFiles, numDirectories })
    })

    function statThenExport (entrySrcPath, entryDstPath, cb) {
      // check that the entry exists
      statArchiveFile(archive, entrySrcPath, (err, entry) => {
        if (err || !entry) return cb(new Error(`Archive file ${entrySrcPath} not found`))

        if (isFirst) {
          // log action
          console.log(`[DAT] Exporting dat://${key} to ${entryDstPath}`)
          isFirst = false
        }

        // export by type
        if (entry.type === 'file') exportFile(entry, entryDstPath, cb)
        else if (entry.type === 'directory') exportDirectory(entry, entryDstPath, cb)
        else cb()
      })
    }

    function exportFile (entry, entryDstPath, cb) {
      // write the file
      numFiles++
      pump(
        archive.createFileReadStream(entry),
        fs.createWriteStream(entryDstPath),
        cb
      )
    }

    function exportDirectory (entry, entryDstPath, cb) {
      // make sure the destination folder exists
      numDirectories++
      mkdirp(entryDstPath, err => {
        if (err) return cb(err)

        // list the directory
        readArchiveDirectory(archive, path.join('/', entry.name), (err, entries) => {
          if (err) cb(err)
          var done = multicb()
          Object.keys(entries).forEach(k => statThenExport(entries[k].name, path.join(dstPath, entries[k].name), done()))
          done(cb)
        })
      })
    }
  })
}

// archive networking
// =

// put the archive into the network, for upload and download
export function joinSwarm (key, opts) {
  var archive = (typeof key == 'object' && key.discoveryKey) ? key : getArchive(key)
  if (!archive || archive.isSwarming) return

  var keyStr = bufToStr(archive.key)
  var swarm = discoverySwarm(swarmDefaults({
    hash: false,
    utp: true,
    tcp: true,
    stream: (info) => {
      var dkeyStr = bufToStr(archive.discoveryKey)
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

  debug('Swarming archive', bufToStr(archive.key), 'discovery key', bufToStr(archive.discoveryKey))
  archive.isSwarming = true
  archive.swarm = swarm
}

// take the archive out of the network
export function leaveSwarm (key, cb) {
  var archive = (typeof key == 'object' && key.discoveryKey) ? key : getArchive(key)
  if (!archive || !archive.isSwarming) return

  var keyStr = bufToStr(archive.key)
  var swarm = archive.swarm

  debug('Unswarming archive %s disconnected %d peers', keyStr, archive.metadata.peers.length)
  archive.unreplicate() // stop all active replications
  swarm.leave(archive.discoveryKey)
  swarm.destroy()
  delete archive.swarm
  archive.isSwarming = false
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
