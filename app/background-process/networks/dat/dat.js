
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import pump from 'pump'
import multicb from 'multicb'
import log from 'loglevel'
import trackArchiveEvents from './track-archive-events'
import { throttle } from '../../../lib/functions'

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

//
// TODO rewrite to use new archivesDb
// TODO update the exported API
// TODO update the frontend to use the exported api
// TODO update the docs
//

// TODO rewrite this method
/*export function setArchiveUserSettings (key, value) {
  return new Promise((resolve, reject) => {
    // db result handler
    var cb = err => {
      if (err) reject(err)
      else resolve()
    }

    // massage data
    var config = {
      isSaved: !!value.isSaved,
      isServing: !!value.isServing
    }

    // add/update
    archiveUserSettingsDb.put(key, config, cb)

    // update the swarm/download behaviors
    var archive = getArchive(key)
    swarm(key).upload = config.isServing || (config.isSaved && !archive.owner) // upload if the user wants to serve, or has saved and isnt the owner
    if (config.isServing) {
      archive.content.prioritize({start: 0, end: Infinity}) // download content automatically
    } else {
      archive.content.unprioritize({start: 0, end: Infinity}) // download content on demand
    }
  })
}*/

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

  // load and configure all saved archives
  // TODO make archivesDb method
  archiveUserSettingsDb.createReadStream().on('data', entry => {
    if (entry.value.isSaved) {
      savedArchives.add(entry.key)
      configureArchive(entry.key, entry.value)
    }
  })
}

// load archive and set the swarming behaviors
export function configureArchive (key, config) {
  // load and swarm
  var archive = loadArchive(new Buffer(key, 'hex'), {
    sparse: !config.isServing, // only download on-demand (sparse mode) if the archive isnt actively syncing (serving)
    live: true
  })
  swarm(key, {
    upload: config.isServing || !archive.owner, // only upload if the user wants to serve, or isnt the owner
    download: true // always download updates
  })
}

export function createNewArchive (opts) {
  opts = opts || {}
  var title = (opts.title && typeof opts.title == 'string') ? opts.title : ''
  var description = (opts.description && typeof opts.description == 'string') ? opts.description : ''
  return new Promise((resolve, reject) => {
    // create the archive
    var archive = loadArchive(null, { live: true })
    var key = archive.key.toString('hex')
    setArchiveUserSettings(key, {
      isSaved: true,
      isServing: false
    })

    // add any requested files
    var done = multicb()
    if (opts.importFiles) {
      let importFiles = Array.isArray(opts.importFiles) ? opts.importFiles : [opts.importFiles]
      importFiles.forEach(importFile => writeArchiveFileFromPath(key, { src: importFile, dst: '/' }))
    }
    if (opts.title || opts.description) {
      writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify({ title, description }), done())
    }
    done(() => resolve(key))
  })
}

export function forkArchive (oldArchiveKey, opts) {
  opts = opts || {}
  var title = (opts.title && typeof opts.title == 'string') ? opts.title : ''
  var description = (opts.description && typeof opts.description == 'string') ? opts.description : ''
  return new Promise((resolve, reject) => {
    // get the target archive
    var oldArchive = getArchive(oldArchiveKey)
    if (!oldArchive) {
      return reject(new Error('Invalid archive key'))
    }

    // create the new archive
    createNewArchive({ title, description }).then(newArchiveKey => {

      // list the old archive's files
      var newArchive = getArchive(newArchiveKey)
      oldArchive.list((err, entries) => {
        if (err) {
          return reject(err)
        }

        // TEMPORARY
        // remove duplicates
        // this is only needed until hyperdrive fixes its .list()
        // see https://github.com/mafintosh/hyperdrive/pull/99
        // -prf
        var entriesDeDuped = {}
        entries.forEach(entry => entriesDeDuped[entry.name] = entry)
        entries = Object.keys(entriesDeDuped).map(name => entriesDeDuped[name])

        // copy over files
        next()
        function next (err) {
          if (err) {
            return reject(err)
          }

          // get next
          var entry = entries.shift()
          if (!entry) {
            return finish()
          }

          // skip non-files, undownloaded files, and the old manifest
          if (entry.type !== 'file' || !oldArchive.isEntryDownloaded(entry) || entry.name === DAT_MANIFEST_FILENAME) {
            return next()
          }

          // copy the fine
          pump(
            oldArchive.createFileReadStream(entry),
            newArchive.createFileWriteStream({ name: entry.name, mtime: entry.mtime, ctime: entry.ctime }),
            next
          )
        }
        function finish () {
          // save the new archive
          setArchiveUserSettings(newArchiveKey, { isSaved: true })
            .catch(() => false) // squash failures
            .then(() => resolve(newArchiveKey))
        }
      })
    }).catch(reject)
  })
}

export function loadArchive (key, opts) {
  opts = opts || {}
  var sparse = (opts.sparse === false) ? false : true // by default, only download files when they're requested

  // validate key
  if (key !== null && (!Buffer.isBuffer(key) || key.length != 32))
    return

  var archive = drive.createArchive(key, {
    live: opts.live, // optional! only set this if you know what it should be
    sparse: sparse,
    file: name => raf(path.join(archivesDb.getArchiveFilesPath(archive), name))
  })
  mkdirp.sync(archivesDb.getArchiveFilesPath(archive)) // ensure the folder exists
  cacheArchive(archive)
  archive.pullLatestArchiveMeta = throttle(() => pullLatestArchiveMeta(archive), 1e3)
  trackArchiveEvents(archivesEvents, archive) // start tracking the archive's events

  // if in sparse-mode, prioritize the entire metadata feed, but leave content to be on-demand
  if (sparse) {
    archive.metadata.prioritize({priority: 0, start: 0, end: Infinity})
  }

  return archive
}

export function cacheArchive (archive) {
  archives[archive.key.toString('hex')] = archive
}

export function getArchive (key) {
  return archives[bufToStr(key)]
}

export function getArchiveInfo (name, opts) {
  return new Promise((resolve, reject) => {
    resolveDatDNS(name, (err, key) => {
      if (err)
        return reject(new Error(err.code || err))

      // get the archive
      var archive = getArchive(key)
      if (!archive) {
        if (opts && opts.loadIfMissing) {
          archive = loadArchive(new Buffer(key, 'hex'))
          swarm(key)
        } else {
          return reject(new Error('Invalid archive key'))
        }
      }

      // fetch archive data
      var done = multicb({ pluck: 1, spread: true })
      getArchiveMeta(key, done())
      archive.list(done())
      readReadme(archive, done())
      done((err, meta, entries, readme) => {
        if (err)
          return reject(err)

        // attach additional data
        meta.key = key
        meta.entries = entries
        meta.contentBitfield = archive.content.bitfield.buffer
        meta.readme = readme
        meta.isApp = entries && !!entries.find(e => e.name == 'index.html')
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
    if (!archive) {
      return reject(new Error('Invalid archive key'))
    }

    // fetch the archive entries
    archive.list((err, entries) => {
      if (err) {
        return reject(err)
      }

      // tally the current state
      entries.forEach(entry => {
        stats.bytesTotal     += entry.length
        stats.blocksProgress += archive.countDownloadedBlocks(entry)
        stats.blocksTotal    += entry.blocks
        stats.filesTotal++
      })
      resolve(stats)
    })
  })
}

export function updateArchiveManifest (key, updates) {
  return new Promise((resolve, reject) => {

    // fetch the current manifest
    var archive = getOrLoadArchive(key)
    readManifest(archive, (err, manifest) => {

      // update values
      manifest = manifest || {}
      Object.assign(manifest, updates)

      // write to archive
      writeArchiveFile(archive, DAT_MANIFEST_FILENAME, JSON.stringify(manifest), err => {
        if (err) reject(err)
        else resolve()
      })
    })
  })
}

export function writeArchiveFileFromPath (key, opts) {
  return new Promise((resolve, reject) => {
    if (!opts || typeof opts != 'object' || typeof opts.src != 'string' || typeof opts.dst != 'string')
      return reject(new Error('Must provide .src and .dst filepaths'))

    // open the archive and ensure we can write
    var archive = getOrLoadArchive(key)
    archive.open(() => {
      if (!archive.owner)
        return reject(new Error('Cannot write: not the archive owner'))

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
        return reject(new Error('File not found'))
      }

      // read the file or file-tree into the archive
      log.debug('[DAT] Writing file(s) from path:', src, 'to', dst)
      hyperImport(archive, src, {
        basePath: dst,
        live: false,
        resume: true,
        ignore: ['.dat', '**/.dat', '.git', '**/.git']
      }, err => {
        if (err) reject(err)
        else resolve(err)
      })
    })
  })
}

// put the archive into the network, for upload and download
// (this is kind of like saying, "go live")
export function swarm (key, opts) {
  var [keyBuf, keyStr] = bufAndStr(key)
  opts = Object.assign({ upload: false, download: true, /* wtrc */}, opts)

  // fetch
  if (keyStr in swarms)
    return swarms[keyStr]

  // create
  log.debug('[DAT] Swarming archive', keyStr)
  var archive = getArchive(key)
  var s = hyperdriveArchiveSwarm(archive, opts)
  swarms[keyStr] = s
  archivesEvents.emit('update-archive', { key: keyStr, isSharing: true })

  // hook up events
  if (s.node) s.node.on('peer', peer => log.debug('[DAT] Connection', peer.id, 'from discovery-swarm'))
  else log.warn('Swarm .node missing')
  // if (s.browser) s.browser.on('peer', peer => log.debug('[DAT] Connection', peer.remoteAddress+':'+peer.remotePort, 'from webrtc'))
  // else log.warn('Swarm .browser missing')
  archive.open(err => {
    if (err)
      return log.warn('Error opening archive for swarming', keyStr, err)

    if (archive.metadata) {
      archive.metadata.on('download-finished', () => {
        log.debug('[DAT] Metadata download finished', keyStr)
        archivesEvents.emit('update-listing', { key: keyStr })        
        archive.pullLatestArchiveMeta()
      })
    }
  })
  return s
}

// take the archive out of the network
export function unswarm (key) {
  var [keyBuf, keyStr] = bufAndStr(key)

  // fetch
  var s = swarms[keyStr]
  if (!s || s.isClosing)
    return
  s.isClosing = true
  s.close(() => {
    log.debug('[DAT] Stopped swarming archive', keyStr)
    delete swarms[keyStr]
    archivesEvents.emit('update-archive', { key: keyStr, isSharing: false })
  })

  // TODO unregister ALL events that were registered in swarm() !!
}

// prioritize an entry for download
export function downloadArchiveEntry (key, name) {
  return new Promise((resolve, reject) => {
    // get the archive
    var archive = getArchive(key)
    if (!archive)
      return reject(new Error('Invalid archive key'))

    // lookup the entry
    archive.lookup(name, (err, entry) => {
      if (err || !entry)
        return reject(err)
      if (entry.type != 'file')
        return reject(new Error('Entry must be a file'))

      // download the entry
      archive.content.prioritize({
        start: entry.content.blockOffset,
        end: entry.content.blockOffset + entry.blocks,
        priority: 3,
        linear: true
      })
      archive.download(entry, err => {
        if (err)
          return reject(err)
        resolve()
      })
    })
  })
}

export function archivesEventStream () {
  return emitStream(archivesEvents)
}

// internal methods
// =

function getOrLoadArchive (key) {
  return getArchive(key) || loadArchive(new Buffer(key, 'hex'))
}

function getArchiveMeta (key, cb) {
  key = bufToStr(key)

  // open archive
  var archive = getOrLoadArchive(key)
  archive.open(() => {

    // pull data from meta db
    archiveMetaDb.get(key, (err, meta) => {
      meta = meta || {}

      // TEMPORARY fallback to legacy .name if no .title
      if (meta.name || !meta.title)
        meta.title = meta.name

      // pull user settings from saved db
      archiveUserSettingsDb.get(key, (err, userSettings) => {
        userSettings = userSettings || {}

        // give sane defaults, and add live data
        userSettings = Object.assign({
          isSaved: false,
          isServing: false
        }, userSettings)
        meta = Object.assign({
          key,
          title: 'Untitled',
          author: false,
          mtime: 0,
          size: 0,
          isOwner: !!archive.owner,
          isServing: ((key in swarms) && swarms[key].uploading),
          peers: archive.metadata.peers.length,
          userSettings
        }, meta)

        cb(null, meta)
      })
    })
  })
}

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
    getFolderSize(archivesDb.getArchiveFilesPath(archive), (err, size) => {
      sizeCb(null, size)
    })

    done((err, manifest, size) => {
      manifest = manifest || {}
      var { title, description, author, homepage_url } = manifest
      var mtime = Date.now() // use our local update time
      size = size || 0

      // write the record
      var update = { title, description, author, homepage_url, mtime, size }
      log.debug('[DAT] Writing meta', update)
      archiveMetaDb.put(key, update, err => {
        if (err)
          log.debug('[DAT] Error while writing archive meta', key, err)

        // emit event
        update.key = key
        archivesEvents.emit('update-archive', update)
      })
    })
  })
}

function readManifest (archive, cb) {
  readArchiveFile(archive, DAT_MANIFEST_FILENAME, (err, data) => {
    if (data)
      return done(data)

    // TEMPORARY try legacy (remove in, like, a year. maybe less.)
    readArchiveFile(archive, 'manifest.json', (err, data) => {
      if (data)
        return done(data)

      // no manifest
      cb()
    })
  })

  function done (data) {
    // parse manifest
    try {
      var manifest = JSON.parse(data.toString())
      if (manifest.name || !manifest.title) manifest.title = manifest.name // TEMPORARY legacy fix
      cb(null, manifest)
    } catch (e) { cb() }
  }
}

function readReadme (archive, cb) {
  readArchiveFile(archive, 'README.md', (err, data) => cb(null, data)) // squash the error
}

