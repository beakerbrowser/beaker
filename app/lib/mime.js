import through2 from 'through2'
import identify from 'identify-filetype'
import mime from 'mime'
import log from 'loglevel'

// config default mimetype
mime.default_type = 'text/plain'

export function identifyStream (name, cb) {
  var first = true
  return through2(function (chunk, enc, cb2) {
    if (first) {
      first = false

      // try to identify the type by the chunk contents
      var mimeType
      var identifiedExt = identify(chunk)
      if (identifiedExt)
        mimeType = mime.lookup(identifiedExt)
      if (mimeType) {
        log.debug('[DAT] Identified entry mimetype as', mimeType)
      } else {
        // fallback to using the entry name
        mimeType = mime.lookup(name)
        log.debug('[DAT] Assumed mimetype from entry name', mimeType)
      }
      cb(mimeType)
    }

    this.push(chunk)
    cb2()
  })
}
