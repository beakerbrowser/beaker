import { app, ipcMain } from 'electron'
import through2Concurrent from 'through2-concurrent'
import concat from 'concat-stream'
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
import normalizePackageData from 'normalize-package-data'

// io modules
import rpc from 'pauls-electron-rpc'
import manifest from '../../lib/rpc-manifests/dat'
import log from '../../log'

// constants
// =

// what do we name the package file?
export const PACKAGE_FILENAME = 'package.json'

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
var swarms = {} // key -> swarn

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
  rpc.exportAPI('dat', manifest, { archives, archiveEntries, archivesEventStream, archiveEntriesEventStream })
}

export function createArchive (key) {
  // NOTE this only works on live archives
  var archive = drive.createArchive(key, {
    live: true,
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
  var done = multicb({ pluck: 1 })

  // open() just in case (we need .blocks)
  archive.open(() => {

    var name = 'Untitled' 
    var author = false
    var version = '0.0.0'
    var mtime = Date.now() // use our local update time
    var size = 0

    // read the archive package.json
    var packageCb = done()
    readArchiveFile(archive, PACKAGE_FILENAME, (err, packageData) => {
      if (!packageData)
        return packageCb()

      // parse package
      try {
        var packageObj = JSON.parse(packageData.toString())
        normalizePackageData(packageObj)
      } catch (e) {
        log('[DAT] Failed to parse package.json', key, e)
        return packageCb()
      }

      // done
      if (packageObj.name)
        name = packageObj.name
      if (packageObj.author)
        author = packageObj.author
      packageCb()
    })

    // read the version
    var versionCb = done()
    readArchiveFile(archive, VFILENAME, (err, vfileData) => {
      if (!vfileData)
        return versionCb()

      // parse vfile
      vfileData = vfileData.toString()
      var vfile = bdatVersionsFile.parse(vfileData)

      // done
      if (vfile.current)
        version = vfile.current
      versionCb()
    })

    // calculate the size on disk
    var sizeCb = done()
    getFolderSize(ARCHIVE_FILEPATH(archive), (err, _size) => {
      size = _size || 0
      sizeCb()
    })

    done(() => {
      // write the record
      log('[DAT] Writing meta', key, name, author, version, mtime, size)
      archiveMetaDb.put(key, { name, author, version, mtime, size }, err => {
        if (err)
          log('[DAT] Error while writing archive meta', key, err)
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

function archives () {
  // list the archives
  return drive.core.list().pipe(through2Concurrent.obj({ maxConcurrency: 100 }, (key, enc, cb) => {
    key = key.toString('hex')

    // get archive meta
    getArchiveMeta(key, (err, meta) => {
      if (!meta)
        return cb() // filter out

      cb(null, meta)
    })
  }))
}

function archiveEntries () {
  // TODO
}

function archivesEventStream () {
  // TODO
}

function archiveEntriesEventStream () {
  // TODO
}

// internal methods
// =

// helper to pull a file's data from an archive
function readArchiveFile (archive, name, cb) {
  archive.lookup(name, (err, entry) => {
    if (!entry)
      return cb(err)
    archive.createFileReadStream(entry).pipe(concat(data => cb(null, data)))
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