import concat from 'concat-stream'
import from2Encoding from 'from2-encoding'
import pump from 'pump'
import path from 'path'
import { DAT_MANIFEST_FILENAME } from '../../../lib/const'
import encoding from 'hyperdrive-encoding'

// helper to run custom lookup rules
// - checkFn is called with (entry). if it returns true, then `entry` is made the current match
export function archiveCustomLookup (archive, checkFn, cb) {
  var entriesStream = archive.list({live: false})
  var entry = null

  entriesStream.on('data', function (e) {
    if (checkFn(e, normalizedEntryName(e))) {
      entry = e
    }
  })

  entriesStream.on('error', lookupDone)
  entriesStream.on('close', lookupDone)
  entriesStream.on('end', lookupDone)
  function lookupDone () {
    cb(entry)
  }
  return entriesStream
}

// helper to get the name from a listing entry, in a standard form
export function normalizedEntryName (entry) {
  var name = ('' + (entry.name || ''))
  return (name.startsWith('/')) ? name : ('/' + name)
}

// helper to write file data to an archive
export function writeArchiveFile (archive, name, data, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (typeof opts === 'string') {
    opts = { encoding: opts }
  }
  opts = opts || {}
  cb = cb || (()=>{})

  // guess the encoding by the data type
  if (!opts.encoding) {
    opts.encoding = (typeof data === 'string' ? 'utf8' : 'binary')
  }
  opts.encoding = toValidEncoding(opts.encoding)

  // validate the encoding
  if (typeof data === 'string' && opts.encoding === 'binary') {
    return cb({ invalidEncoding: true, encoding: opts.encoding, type: typeof data })
  }
  if (typeof data !== 'string' && opts.encoding !== 'binary') {
    return cb({ invalidEncoding: true, encoding: opts.encoding, type: typeof data })
  }

  // convert to buffer object
  if (opts.encoding === 'binary' && !Buffer.isBuffer(data) && Array.isArray(data.data)) {
    data = Buffer.from(data.data)
  }

  // write
  pump(
    from2Encoding(data, opts.encoding),
    archive.createFileWriteStream({ name, mtime: Date.now() }),
    cb
  )
}

// helper to write a directory entry to an archive
export function writeArchiveDirectory (archive, name, cb) {
  // write
  archive.append({
    name,
    type: 'directory',
    mtime: Date.now()
  }, cb)
}

// helper to lookup file metadata from an archive
export function statArchiveFile (archive, name, cb) {
  name = normalizedEntryName({ name })
  if (name === '/') {
    return cb(null, { type: 'directory', name: '/' })
  }
  return archiveCustomLookup(
    archive,
    (entry, entryName) => entryName === name,
    entry => {
      if (!entry) cb({ notFound: true })
      else cb(null, entry)
    }
  )
}

// helper to pull file data from an archive
export function readArchiveFile (archive, name, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (typeof opts === 'string') {
    opts = { encoding: opts }
  }
  opts.encoding = toValidEncoding(opts.encoding)
  return statArchiveFile(archive, name, (err, entry) => {
    if (err) return cb(err)
    if (!entry || entry.type !== 'file') {
      return cb({ notFound: true })
    }

    var rs = archive.createFileReadStream(entry)
    rs.pipe(concat(data => {
      if (opts.encoding !== 'binary') {
        data = data.toString(opts.encoding)
      }
      cb(null, data)
    }))
    rs.on('error', e => cb(e))
  })
}

export function readManifest (archive, cb) {
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

export function readReadme (archive, cb) {
  readArchiveFile(archive, 'README.md', (err, data) => cb(null, data)) // squash the error
}

export function readHistory (historyFeed, cb) {
  var rs = historyFeed.createReadStream()
  var blocks = 0
  var size = 0
  var changes = []
  rs.once('data', function () {
    blocks = historyFeed.blocks
  })
  rs.on('data', function (x) {
    var data = encoding.decode(x)
    if (data.type === 'file') {
      size += data.length
    }

    changes.push(data)
  })
  rs.on('end', function () {
    cb(null, {changes: changes, blocks: blocks, size: size, metaSize: historyFeed.bytes})
  })
}

export function readArchiveDirectory (archive, dstPath, cb) {
  var dstPathParts = dstPath.split('/')
  if (dstPathParts.length > 1 && !dstPathParts[dstPathParts.length - 1]) dstPathParts.pop() // drop the last empty ''

  // start a list stream
  var s = archive.list({live: false})
  var entries = {}

  s.on('data', function (e) {
    // check if the entry is a child of the given path
    var entryPath = normalizedEntryName(e)
    var entryPathParts = entryPath.split('/')
    if (entryPathParts.length > 1 && !entryPathParts[entryPathParts.length - 1]) entryPathParts.pop() // drop the last empty ''
    if (entryPathParts.length !== dstPathParts.length && isPathChild(dstPathParts, entryPathParts)) {
      // use the subname
      var name = entryPathParts[dstPathParts.length]
      // child should have exactly 1 more item than the containing path
      var isImmediateChild = (entryPathParts.length === dstPathParts.length + 1)
      if (isImmediateChild) {
        entries[name] = e
      } else {
        // not an immediate child - add the directory if DNE
        if (!entries[name]) {
          entries[name] = { type: 'directory', name: path.join(dstPath, name) }
        }
      }
    }
  })

  s.on('error', lookupDone)
  s.on('close', lookupDone)
  s.on('end', lookupDone)
  function lookupDone () {
    cb(null, entries)
  }
}

// get buffer and string version of value
export function bufAndStr (v) {
  if (Buffer.isBuffer(v)) return [v, v.toString('hex')]
  return [new Buffer(v, 'hex'), v]
}

// convert to string, if currently a buffer
export function bufToStr (v) {
  if (Buffer.isBuffer(v)) return v.toString('hex')
  return v
}

// helper to convert an encoding to something acceptable
export function toValidEncoding (str) {
  if (!str) return 'utf8'
  if (!['utf8', 'utf-8', 'hex', 'base64', 'binary'].includes(str)) return 'binary'
  return str
}

// `pathParts` and `childParts` should be arrays (`str.split('/')`)
export function isPathChild (pathParts, childParts) {
  // all path parts should be contained in the child parts
  for (var i = 0; i < pathParts.length; i++) {
    if (pathParts[i] !== childParts[i]) return false
  }
  return true
}
