import through2 from 'through2'
import identifyFiletype from 'identify-filetype'
import mime from 'mime'
import log from 'loglevel'

// config default mimetype
mime.default_type = 'text/plain'

export function identify (name, chunk) {
  // try to identify the type by the chunk contents
  var mimeType
  var identifiedExt = identifyFiletype(chunk)
  if (identifiedExt)
    mimeType = mime.lookup(identifiedExt)
  if (mimeType) {
    log.debug('[DAT] Identified entry mimetype as', mimeType)
  } else {
    // fallback to using the entry name
    mimeType = mime.lookup(name)
    log.debug('[DAT] Assumed mimetype from entry name', mimeType)
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
