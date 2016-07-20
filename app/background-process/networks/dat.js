import { app, ipcMain } from 'electron'
import through2Concurrent from 'through2-concurrent'
import concat from 'concat-stream'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import multicb from 'multicb'
import from2 from 'from2'

// db modules
import hyperdrive from 'hyperdrive'
import level from 'level'
import subleveldown from 'subleveldown'

// network modules
import dns from 'dns'
import url from 'url'
import hyperdriveArchiveSwarm from 'hyperdrive-archive-swarm'
import electronWebrtc from 'electron-webrtc'

// file modules
import path from 'path'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import identify from 'identify-filetype'
import mime from 'mime'
import bdatVersionsFile from 'bdat-versions-file'
import getFolderSize from 'get-folder-size'
import yazl from 'yazl'

// io modules
import rpc from 'pauls-electron-rpc'
import manifest from '../../lib/rpc-manifests/dat'
import log from '../../log'

// constants
// =

// special files
export const MANIFEST_FILENAME = 'manifest.json'
export const VFILENAME = '.bdat/versions.json.log'

// 64 char hex
export const HASH_REGEX = /[0-9a-f]{64}/i

// where are the given archive's files kept
const ARCHIVE_FILEPATH = archive => path.join(dbPath, 'Archives', archive.key.toString('hex'))

// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var archiveMetaDb // archive metadata sublevel
var subscribedArchivesDb // subcribed archives sublevel
var subscribedFeedDb // combined feed sublevel
var drive // hyperdrive instance
var wrtc // webrtc instance

var archives = {} // key -> archive
var swarms = {} // key -> swarm
var subscribedArchives = new Set() // set of current subscriptions
var archivesEvents = new EventEmitter()

// config default mimetype
mime.default_type = 'text/plain'

// exported API
// =

export function setup () {
  // open databases
  dbPath = path.join(app.getPath('userData'), 'Hyperdrive')
  mkdirp.sync(path.join(dbPath, 'Archives')) // make sure the folders exist
  db = level(dbPath)
  archiveMetaDb = subleveldown(db, 'archive-meta', { valueEncoding: 'json' })
  subscribedArchivesDb = subleveldown(db, 'subscribed-archives', { valueEncoding: 'json' })
  subscribedFeedDb = subleveldown(db, 'subscribed-feed', { valueEncoding: 'json' })
  drive = hyperdrive(db)

  // create webrtc
  wrtc = electronWebrtc()
  wrtc.on('error', err => log('[WRTC]', err))

  // load all subscribed archives
  subscribedArchivesDb.createKeyStream().on('data', key => {
    subscribedArchives.add(key)
    let archive = createArchive(new Buffer(key, 'hex'), { sparse: false }) // TODO do we want sparsemode?
    updateSubscribedFeedDb(archive)
  })

  // wire up the rpc
  rpc.exportAPI('dat', manifest, rpcMethods)
}

export function createArchive (key, opts) {
  opts = opts || {}
  var sparse = (opts.sparse === false) ? false : true // by default, only download files when they're requested

  // validate key
  if (key !== null && (!Buffer.isBuffer(key) || key.length != 32))
    return

  // NOTE this only works on live archives
  var archive = drive.createArchive(key, {
    live: true,
    sparse: sparse,
    file: name => raf(path.join(ARCHIVE_FILEPATH(archive), name))
  })
  return archive
}

export function cacheArchive (archive) {
  archives[archive.key.toString('hex')] = archive
}

export function getArchive (key) {
  var [keyBuf, keyStr] = bufAndStr(key)

  // fetch or create
  if (keyStr in archives)
    return archives[keyStr]
  return (archives[keyStr] = createArchive(keyBuf))
}

export function getArchiveMeta (key, cb) {
  key = bufToStr(key)

  // pull data from meta db
  archiveMetaDb.get(key, (err, meta) => {
    if (err)
      return cb(err) // fail if there's no entry

    // give sane defaults
    // (just in case the metadata record came from an older build, and has holes in it)
    meta = Object.assign({
      name: 'Untitled',
      author: false,
      version: '0.0.0',
      mtime: 0,
      size: 0,
      isDownloading: false,
      isSharing: (key in swarms)
    }, meta)

    // pull some live data
    var archive = archives[key]
    if (archive) {
      meta.isDownloading = 
        (archive.metadata._downloaded < archive.metadata.blocks) ||
        (archive.content && archive.content._downloaded < archive.content.blocks)
    }

    cb(null, meta)
  })
}

// read metadata for the archive, and store it in the meta db
export function updateArchiveMeta (archive) {
  var key = archive.key.toString('hex')
  var done = multicb({ pluck: 1, spread: true })

  // open() just in case (we need .blocks)
  archive.open(() => {

    // read the archive metafiles
    readManifest(archive, done())
    readVFile(archive, done())

    // calculate the size on disk
    var sizeCb = done()
    getFolderSize(ARCHIVE_FILEPATH(archive), (err, size) => {
      sizeCb(null, size)
    })

    done((err, manifest, vfile, size) => {
      manifest = manifest || {}
      var { name, author, homepage_url } = manifest
      var version = (vfile) ? vfile.current : false
      var mtime = Date.now() // use our local update time
      size = size || 0

      // write the record
      var update = { name, author, homepage_url, version, mtime, size }
      log('[DAT] Writing meta', update)
      archiveMetaDb.put(key, update, err => {
        if (err)
          log('[DAT] Error while writing archive meta', key, err)

        // emit event
        update.key = key
        archivesEvents.emit('update-archive', update)
      })
    })
  })
}

// un/subscribe to archives
export function subscribe (key, subscribed, cb) {
  if (subscribed) {
    subscribedArchives.add(key)
    subscribedArchivesDb.put(key, true, () => cb())
  } else {
    subscribedArchives.delete(key)
    subscribedArchivesDb.del(key, false, () => cb())
  }
}

// put the archive into the network, for upload and download
// (this is kind of like saying, "go live")
export function swarm (key) {
  var [keyBuf, keyStr] = bufAndStr(key)

  // fetch
  if (keyStr in swarms)
    return swarms[keyStr]

  // create
  log('[DAT] Swarming archive', keyStr)
  var archive = getArchive(key)
  var s = hyperdriveArchiveSwarm(archive, { wrtc })
  swarms[keyStr] = s

  // hook up events
  s.on('connection', (peer, type) => log('[DAT] Connection', peer.id.toString('hex'), 'from', type.type))
  archive.open(() => {
    archive.metadata.on('download-finished', () => {
      log('[DAT] Metadata download finished', keyStr)
      updateArchiveMeta(archive)
    })
    archive.content.on('download-finished', () => {
      log('[DAT] Content download finished', keyStr)
      updateArchiveMeta(archive)
    })
  })
  return s
}

export function resolveName (name, cb) {
  // is it a hash?
  if (HASH_REGEX.test(name))
    return cb(null, name)

  // do a dns lookup
  log('[DAT] DNS TXT lookup for name:', name)
  dns.resolveTxt(name, (err, records) => {
    log('[DAT] DNS TXT results for', name, err || records)
    if (err)
      return cb(err)

    // scan the txt records for a dat URI
    for (var i=0; i < records.length; i++) {
      if (records[i][0].indexOf('dat://') === 0) {
        var urlp = url.parse(records[i][0])
        if (HASH_REGEX.test(urlp.host)) {
          log('[DAT] DNS resolved', name, 'to', urlp.host)
          return cb(null, urlp.host)
        }
        log('[DAT] DNS TXT record failed:', records[i], 'Must be a dat://{hash} url')
      }
    }

    cb({ code: 'ENOTFOUND' })
  })
}

export function getAndIdentifyEntry (archive, entry, cb) {
  var rs = archive.createFileReadStream(entry)
  rs.on('error', cb)
  rs.pipe(concat(data => {
    // try to identify the type by the buffer contents
    var mimeType
    var identifiedExt = identify(data)
    if (identifiedExt)
      mimeType = mime.lookup(identifiedExt)
    if (mimeType)
      log('[DAT] Identified entry mimetype as', mimeType)
    else {
      // fallback to using the entry name
      mimeType = mime.lookup(entry.name)
      log('[DAT] Assumed mimetype from entry name', mimeType)
    }

    cb(null, { data: data, mimeType: mimeType })
  }))
}

export function createZipFileStream (archive) {
  var zipfile = new yazl.ZipFile()

  // list files
  archive.list((err, entries) => {
    if (err)
      return onerror(err)

    // remove duplicates
    var entriesMap = {}
    entries.forEach(e => entriesMap[e.name] = e)
    var entriesKeys = Object.keys(entriesMap)

    // create listing stream
    var listingStream = from2.obj((size, next) => {
      if (entriesKeys.length === 0)
        return console.log('out of entries'), next(null, null)
      next(null, entriesMap[entriesKeys.shift()])
    })

    // create the writestream
    var zipWriteStream = listingStream
      .pipe(through2Concurrent.obj({ maxConcurrency: 3 }, (entry, enc, cb) => {
        // files only
        if (entry.type != 'file')
          return cb()

        // pipe each entry into the zip
        log('[DAT] Zipfile writing', JSON.stringify(entry))
        var fileReadStream = archive.createFileReadStream(entry)
        zipfile.addReadStream(fileReadStream, entry.name)
        fileReadStream.on('error', onerror)
        fileReadStream.on('end', cb)
      }))
    zipWriteStream.on('data', ()=>{})
    zipWriteStream.on('error', onerror)
    zipWriteStream.on('end', () => {
      log('[DAT] Zipfile creation done')
      zipfile.end()
    })
  })

  // on error, push to the output stream
  function onerror (e) {
    log('[DAT] Zipfile error', e)
    zipfile.outputStream.emit('error', e)
  }

  // log output stream errors
  zipfile.outputStream.on('error', e => log('[DAT] Zipfile write error', e))

  return zipfile.outputStream
}

// rpc exports
// =

var rpcMethods = {
  archives (cb) {
    // list the archives
    drive.core.list()
      .pipe(through2Concurrent.obj({ maxConcurrency: 100 }, (key, enc, cb2) => {
        key = key.toString('hex')

        // get archive meta
        getArchiveMeta(key, (err, meta) => {
          if (!meta)
            return cb2() // filter out

          meta.key = key
          cb2(null, meta)
        })
      }))
      .pipe(concat(list => cb(null, list)))
      .on('error', cb)
  },

  subscribedArchives (cb) {
    // list the subbed archives
    subscribedArchivesDb.createKeyStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 100 }, (key, enc, cb2) => {
        // get archive meta
        getArchiveMeta(key, (err, meta) => {
          if (!meta)
            return cb2() // filter out

          meta.key = key
          cb2(null, meta)
        })
      }))
      .pipe(concat(list => cb(null, list)))
      .on('error', cb)
  },

  createNewArchive(cb) {
    var archive = createArchive(null)
    cb(null, archive.key.toString('hex'))
  },

  createFileWriteStream (archiveKey, entry) {
    // get the archive
    var archive = getArchive(archiveKey)
    if (!archive)
      throw new Error('Invalid archive key')
    if (!entry || (!entry.name || typeof entry.name != 'string'))
      throw new Error('Entry obj with .name is required')

    // create write stream
    return archive.createFileWriteStream(entry)
  },

  archiveInfo (key, cb) {
    // get the archive
    var archive = getArchive(key)
    if (!archive)
      return cb(new Error('Invalid archive key'))

    // fetch archive data
    var done = multicb({ pluck: 1, spread: true })
    archive.list(done())
    readManifest(archive, done())
    readVFile(archive, done())
    readReadme(archive, done())
    done((err, entries, manifest, versionHistory, readme) => {
      if (err)
        return cb(err)
      // give sane defaults
      manifest = manifest || {}
      versionHistory = versionHistory || bdatVersionsFile.create()

      // some other meta
      var isApp = !!entries.find(e => e.name == 'index.html')
      var isSubscribed = subscribedArchives.has(key)
      var isOwner = archive.owner

      cb(null, { key, entries, manifest, readme, versionHistory, isApp, isSubscribed, isOwner })
    })
  },

  archivesEventStream () {
    return emitStream(archivesEvents)
  },

  subscribe,

  subscribedFeedStream (opts) {
    return subscribedFeedDb.createReadStream(opts)
  }
}

// internal methods
// =

// helpers to pull file data from an archive
function readArchiveFile (archive, name, cb) {
  archive.lookup(name, (err, entry) => {
    if (!entry)
      return cb()

    var rs = archive.createFileReadStream(entry)
    rs.pipe(concat(data => cb(null, data)))
    rs.on('error', e => cb(e))
  })
}
function readManifest (archive, cb) {
  readArchiveFile(archive, MANIFEST_FILENAME, (err, data) => {
    if (!data)
      return cb()

    // parse manifest
    try {
      var manifest = JSON.parse(data.toString())
      cb(null, manifest)
    } catch (e) { cb() }
  })
}
function readVFile (archive, cb) {
  readArchiveFile(archive, VFILENAME, (err, data) => {
    if (!data)
      return cb(null, bdatVersionsFile.create())

    // parse vfile
    data = data.toString()
    bdatVersionsFile.parse(data, (err, vfile) => {
      cb(err, vfile)
    })
  })
}
function readReadme (archive, cb) {
  // we need case-insensitive lookup, so .lookup() wont work
  var entries = archive.list({live: false})
  var entry = null

  entries.on('data', function (data) {
    var name = (''+(data.name||'')).toLowerCase()
    if (name == 'readme.md')
      entry = data
  })

  entries.on('error', lookupDone)
  entries.on('close', lookupDone)
  entries.on('end', lookupDone)

  function lookupDone () {
    if (!entry) return cb()

    // read file
    var rs = archive.createFileReadStream(entry)
    rs.pipe(concat(data => cb(null, data.toString())))
    rs.on('error', e => cb(e))
  }
}

// write version log to the merged feed
function updateSubscribedFeedDb (archive) {
  // read current vfile
  readVFile(archive, (err, vfile) => {
    vfile.index.forEach(key => {
      // write to db
      var entry = vfile.log[key]
      if (entry.version || entry.message) {
        entry.archiveKey = archive.key.toString('hex')
        subscribedFeedDb.put(entry.date+':'+entry.hash, entry)
      }
    })
  })
}

// get buffer and string version of value
function bufAndStr (v) {
  if (Buffer.isBuffer(v))
    return [v, v.toString('hex')]
  return [new Buffer(v, 'hex'), v]
}

// convert to string, if currently a buffer
function bufToStr (v) {
  if (Buffer.isBuffer(v))
    return v.toString('hex')
  return v
}