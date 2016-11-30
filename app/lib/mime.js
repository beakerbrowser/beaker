import through2 from 'through2'
import identifyFiletype from 'identify-filetype'
import mime from 'mime'
var debug = require('debug')('beaker')

// config default mimetype
mime.default_type = 'text/plain'

export function identify (name, chunk) {
  // try to identify the type by the chunk contents
  var mimeType
  var identifiedExt = (chunk) ? identifyFiletype(chunk) : false
  if (identifiedExt)
    mimeType = mime.lookup(identifiedExt)
  if (mimeType) {
    debug('[DAT] Identified entry mimetype as', mimeType)
  } else {
    // fallback to using the entry name
    mimeType = mime.lookup(name)
    debug('[DAT] Assumed mimetype from entry name', mimeType)
  }
  return mimeType
}

export function identifyStream (name, cb) {
  var first = true
  return through2(function (chunk, enc, cb2) {
    if (first) {
      first = false
      cb(identify(name, chunk))
    }
    this.push(chunk)
    cb2()
  })
}
