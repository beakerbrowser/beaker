import { app, ipcMain } from 'electron'
import through2Concurrent from 'through2-concurrent'
import concat from 'concat-stream'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import multicb from 'multicb'

// db modules
import hyperdrive from 'hyperdrive'
import level from 'level'
import subleveldown from 'subleveldown'

// network modules
import dns from 'dns'
import url from 'url'
import hyperdriveArchiveSwarm from 'hyperdrive-archive-swarm'

// file modules
import path from 'path'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import identify from 'identify-filetype'
import mime from 'mime'
import bdatVersionsFile from 'bdat-versions-file'
import getFolderSize from 'get-folder-size'

// io modules
import rpc from 'pauls-electron-rpc'
import manifest from '../../lib/rpc-manifests/dat'
import log from '../../log'

// constants
// =

// what do we name the manifest file?
export const MANIFEST_FILENAME = 'manifest.json'

// what do we name the versions file?
export const VFILENAME = '.bdat-versions'

// 64 char hex
export const HASH_REGEX = /[0-9a-f]{64}/i

// where are the given archive's files kept
const ARCHIVE_FILEPATH = archive => path.join(dbPath, 'Archives', archive.key.toString('hex'))

// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var archiveMetaDb // archive metadata sublevel
var drive // hyperdrive instance

var archives = {} // key -> archive
var swarms = {} // key -> swarm
var archivesEvents = new EventEmitter()

// config default mimetype
mime.default_type = 'text/plain'

// exported API
// =

export function setup () {
  // open database
  dbPath = path.join(app.getPath('userData'), 'Hyperdrive')
  mkdirp.sync(path.join(dbPath, 'Archives')) // make sure the folders exist
  db = level(dbPath)
  archiveMetaDb = subleveldown(db, 'archive-meta', { valueEncoding: 'json' })
  drive = hyperdrive(db)

  // wire up the rpc
  rpc.exportAPI('dat', manifest, rpcMethods)
}

export function createArchive (key, opts) {
  opts = opts || {}
  var sparse = (opts.sparse === false) ? false : true // by default, only download files when they're requested

  // validate key
  if (!Buffer.isBuffer(key) || key.length != 32)
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
  var s = hyperdriveArchiveSwarm(archive)
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
  archive.createFileReadStream(entry).pipe(concat(data => {
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

// rpc exports
// =

var rpcMethods = {
  archives (cb) {
    // list the archives
    drive.core.list()
      .pipe(through2Concurrent.obj({ maxConcurrency: 100 }, (key, enc, cb) => {
        key = key.toString('hex')

        // get archive meta
        getArchiveMeta(key, (err, meta) => {
          if (!meta)
            return cb() // filter out

          meta.key = key
          cb(null, meta)
        })
      }))
      .pipe(concat(list => cb(null, list)))
      .on('error', cb)
  },

  archiveInfo (key, cb) {
    // get the archive
    var archive = getArchive(key)
    var done = multicb({ pluck: 1, spread: true })

    if (!archive)
      return cb(new Error('Invalid archive key'))

    // fetch archive data
    archive.list(done())
    readManifest(archive, done())
    readVFile(archive, done())
    done((err, entries, manifest, versionHistory) => {
      if (err)
        return cb(err)

      // give sane defaults
      manifest = manifest || {}
      versionHistory = versionHistory || bdatVersionsFile.create()

      // some other meta
      var isApp = !!entries.find(e => e.name == 'index.html')

      cb(null, { key, entries, manifest, versionHistory, isApp })
    })
  },

  archivesEventStream () {
    return emitStream(archivesEvents)
  }
}

// internal methods
// =

// helpers to pull file data from an archive
function readArchiveFile (archive, name, cb) {
  archive.lookup(name, (err, entry) => {
    if (!entry)
      return cb()
    archive.createFileReadStream(entry).pipe(concat(data => cb(null, data)))
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
    cb(null, bdatVersionsFile.parse(data))
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