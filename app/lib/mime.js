import through2 from 'through2'
import identifyFiletype from 'identify-filetype'
import mime from 'mime'
var debug = require('debug')('beaker')

// config default mimetype
mime.default_type = 'text/plain'
const TEXT_TYPE_RE = /^text\/|^application\/(javascript|json)/

export function identify (name, chunk) {
  // try to identify the type by the chunk contents
  var mimeType
  var identifiedExt = (chunk) ? identifyFiletype(chunk) : false
  if (identifiedExt) { mimeType = mime.lookup(identifiedExt) }
  if (mimeType) {
    debug('[DAT] Identified entry mimetype as', mimeType)
  } else {
    // fallback to using the entry name
    mimeType = mime.lookup(name)
    debug('[DAT] Assumed mimetype from entry name', mimeType)
  }

  // hackish fix
  // the svg test can be a bit aggressive: html pages with
  // inline svgs can be falsely interpretted as svgs
  // double check that
  if (identifiedExt === 'svg' && mime.lookup(name) === 'text/html') {
    return 'text/html; charset=utf8'
  }

  // assume utf-8 for text types
  if (TEXT_TYPE_RE.test(mimeType)) {
    mimeType += '; charset=utf8'
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
