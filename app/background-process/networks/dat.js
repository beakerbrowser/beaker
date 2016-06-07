import log from '../../log'
import hyperdrive from 'hyperdrive'
import memdb from 'memdb'
// TEMP:
// going to use discovery-swarm directly, for now, to get more control
// should switch back to hyperdrive-archive-swarm eventually!!
// -prf
// import swarm from 'hyperdrive-archive-swarm'
import discoverySwarm from 'discovery-swarm'
import swarmDefaults from 'datland-swarm-defaults'
import identify from 'identify-filetype'
import mime from 'mime'

// validation
// 64 char hex
export const ARCHIVE_KEY_REGEX = /[0-9a-f]{64}/i

// globals
// =

var drive = hyperdrive(memdb())
var archives = {} // key -> archive
var swarms = {} // key -> swarn

// exported API
// =

export function createArchive () {
  return drive.createArchive()
}

export function cacheArchive (archive) {
  archives[archive.key.toString('hex')] = archive
}

export function getArchive (key) {
  var [keyBuf, keyStr] = bufAndStr(key)

  // fetch or create
  if (keyStr in archives)
    return archives[keyStr]
  return (archives[keyStr] = drive.createArchive(keyBuf))
}

export function swarm (key) {
  var [keyBuf, keyStr] = bufAndStr(key)

  // fetch
  if (keyStr in swarms)
    return swarms[keyStr]

  // create
  log('[DAT] Swarming archive', keyStr)
  var archive = getArchive(key)
  var ds = discoverySwarm(swarmDefaults({
    stream: peer => {
      log('[DAT] Replicating with', peer.toString('hex'))
      return archive.replicate()
    }
  }))
  ds.once('listening', () => ds.join('hyperdrive-' + keyStr))
  ds.listen()
  return ds
}

export function lookupEntry (entries, path) {
  if (!path || path == '/')          path = 'index.html'
  if (path && path.charAt(0) == '/') path = path.slice(1)
    
  var entry
  for (var i=0; i < entries.length; i++) {
    if (entries[i].name == path)
      return entries[i]
  }
  // TODO if type != file, should look for subdir's index.html
}

export function getEntry (archive, entry, cb) {
  // TODO handle stream error

  var chunks = []
  var stream = archive.createFileReadStream(entry)
  stream.on('data', chunk => chunks.push(chunk))
  stream.on('end', () => {
    // create full buffer
    var data = Buffer.concat(chunks)

    // try to identify the type by the buffer contents
    var mimeType = mime.lookup(identify(data))
    if (mimeType)
      log('[DAT] Identified entry mimetype as', mimeType)
    else {
      // fallback to using the entry name
      mimeType = mime.lookup(entry.name)
      log('[DAT] Assumed mimetype from entry name', mimeType)
    }

    cb(null, { data: data, mimeType: mimeType })
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
