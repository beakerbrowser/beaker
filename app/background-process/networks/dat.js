import { app, ipcMain } from 'electron'
import hyperdrive from 'hyperdrive'
import dns from 'dns'
import url from 'url'
import path from 'path'
import level from 'level'
import raf from 'random-access-file'
import mkdirp from 'mkdirp'
import hyperdriveArchiveSwarm from 'hyperdrive-archive-swarm'
import identify from 'identify-filetype'
import mime from 'mime'
import log from '../../log'

// validation
// 64 char hex
export const HASH_REGEX = /[0-9a-f]{64}/i

// globals
// =

var dbPath // path to the hyperdrive folder
var db // level instance
var drive // hyperdrive instance
var archives = {} // key -> archive
var swarms = {} // key -> swarn

// exported API
// =

export function setup () {
  // open database
  dbPath = path.join(app.getPath('userData'), 'Hyperdrive')
  mkdirp.sync(path.join(dbPath, 'Archives')) // make sure the folders exist
  db = level(dbPath)
  drive = hyperdrive(db)
}

export function createArchive (key) {
  var archive = drive.createArchive(key, {
    live: true,
    file: name => raf(path.join(dbPath, 'Archives', archive.key.toString('hex'), name))
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
  s.on('connection', (peer, type) => log('[DAT] Connection', peer.id.toString('hex'), 'from', type.type))
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

export function lookupEntry (entries, filepath) {
  if (!filepath || filepath == '/')          filepath = 'index.html'
  if (filepath && filepath.charAt(0) == '/') filepath = filepath.slice(1)
    
  var entry
  for (var i=0; i < entries.length; i++) {
    if (entries[i].name == filepath)
      return entries[i]
  }
  // TODO if type != file, should look for subdir's index.html
}

export function getEntry (archive, entry, cb) {
  var chunks = []
  var stream = archive.createFileReadStream(entry)
  stream.on('data', chunk => chunks.push(chunk))
  stream.on('end', () => {
    // create full buffer
    var data = Buffer.concat(chunks)

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
  })
  stream.on('error', err => {
    log('[DAT] Stream error', entry, err)
    cb(err)
  })
}

// internal methods
// =

// get buffer and string verion of value
function bufAndStr (v) {
  if (Buffer.isBuffer(v))
    return [v, v.toString('hex')]
  return [new Buffer(v, 'hex'), v]
}
