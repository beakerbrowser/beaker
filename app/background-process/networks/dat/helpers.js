import concat from 'concat-stream'
import from2 from 'from2'
import from2String from 'from2-string'
import pump from 'pump'
import path from 'path'

// helper to run custom lookup rules
// - checkFn is called with (entry). if it returns true, then `entry` is made the current match
export function archiveCustomLookup (archive, checkFn, cb) {
  var entries = archive.list({live: false})
  var entry = null

  entries.on('data', function (e) {
    if (checkFn(e, normalizedEntryName(e))) {
      entry = e
    }
  })

  entries.on('error', lookupDone)
  entries.on('close', lookupDone)
  entries.on('end', lookupDone)
  function lookupDone () {
    cb(entry)
  }
}

// helper to get the name from a listing entry, in a standard form
export function normalizedEntryName (entry) {
  var name = ('' + (entry.name || ''))
  return (name.startsWith('/')) ? name : ('/' + name)
}

// helper to write file data to an archive
export function writeArchiveFile (archive, name, data, cb) {
  pump(
    typeof data === 'string' ? from2String(data) : fromBuffer(data),
    archive.createFileWriteStream({ name, mtime: Date.now() }),
    cb
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
  name = normalizedEntryName({ name })
  archiveCustomLookup(
    archive,
    (entry, entryName) => entryName === name,
    entry => {
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
    }
  )
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

// convert a buffer into a readable string
export function fromBuffer (buf) {
  var i = 0
  return from2(function (size, next) {
    if (i >= buf.length) return next(null, null)
    var chunk = buf.slice(i, i + size)
    i += size
    next(null, chunk)
  })
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
