import through2 from 'through2'
import identifyFiletype from 'identify-filetype'
import mime from 'mime'
import path from 'path'
import textextensions from 'textextensions'
import binextensions from 'binary-extensions'
import concat from 'concat-stream'

// config default mimetype
mime.default_type = 'text/plain'
const TEXT_TYPE_RE = /^text\/|^application\/(javascript|json)/

// typedefs
// =

/**
 * @typedef {import('stream').Transform} Transform
 */

// exported api
// =

/**
 * @param {string} name
 * @param {Buffer} [chunk]
 * @returns {string}
 */
export function identify (name, chunk) {
  // try to identify the type by the chunk contents
  var mimeType
  var identifiedExt = (chunk) ? identifyFiletype(chunk) : false
  if (identifiedExt) { mimeType = mime.lookup(identifiedExt, 'text/plain') }
  if (!mimeType) {
    // fallback to using the entry name
    mimeType = mime.lookup(name, 'text/plain')
  }
  mimeType = correctSomeMimeTypes(mimeType, name)

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

/**
 * @param {string} name
 * @param {function(string): any} cb
 * @returns {Transform}
 */
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

/**
 * Guesses if the file is binary based on its path.
 * Returns 'undefined' if no guess can be made.
 * @param {string} filepath
 * @returns {boolean | undefined}
 */
export function isFileNameBinary (filepath) {
  const ext = path.extname(filepath)
  if (binextensions.includes(ext)) return true
  if (textextensions.includes(ext)) return false
  // dont know
}

/**
 * Guesses if the file is binary based on its content.
 * @param {Object} fsInstance - The filesystem to read from.
 * @param {string} filepath
 * @returns {Promise<boolean>}
 */
export async function isFileContentBinary (fsInstance, filepath) {
  return new Promise((resolve, reject) => {
    const rs = fsInstance.createReadStream(filepath, {start: 0, end: 512})
    rs.on('error', reject)
    rs.pipe(concat(buf => resolve(isBinaryCheck(buf))))
  })
}

/**
 * For a given HTTP accept header, provide a list of file-extensions to try.
 * @param {string | undefined} accept
 * @returns {string[]}
 */
export function acceptHeaderExtensions (accept) {
  var exts = []
  var parts = (accept || '').split(',')
  if (parts.includes('text/html') || (parts.length === 1 && parts[0] === '*/*')) exts.push('.html')
  if (parts.includes('text/css')) exts.push('.css')
  if (parts.includes('image/*') || parts.includes('image/apng')) exts = exts.concat(['.png', '.jpg', '.jpeg', '.gif'])
  return exts
}

/**
 * For a given HTTP accept header, is HTML wanted?
 * @param {string | undefined} accept
 * @returns {boolean}
 */
export function acceptHeaderWantsHTML (accept) {
  var parts = (accept || '').split(',')
  return parts.includes('text/html')
}

/**
 * Looks for byte patterns that indicate the 'bytes' chunk is from a binary file.
 * pulled from https://github.com/gjtorikian/isBinaryFile
 * @param {Buffer} bytes
 * @returns {boolean}
 */
function isBinaryCheck (bytes) {
  var size = bytes.length
  if (size === 0) {
    return false
  }

  var suspicious_bytes = 0

  // UTF-8 BOM
  if (size >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF) {
    return false
  }

  // UTF-32 BOM
  if (size >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] == 0xFE && bytes[3] == 0xFF) {
    return false
  }

  // UTF-32 LE BOM
  if (size >= 4 && bytes[0] == 0xFF && bytes[1] == 0xFE && bytes[2] === 0x00 && bytes[3] === 0x00) {
    return false
  }

  // GB BOM
  if (size >= 4 && bytes[0] == 0x84 && bytes[1] == 0x31 && bytes[2] == 0x95 && bytes[3] == 0x33) {
    return false
  }

  if (size >= 5 && bytes.slice(0, 5).toString('utf8') === '%PDF-') {
    /* PDF. This is binary. */
    return true
  }

  // UTF-16 BE BOM
  if (size >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF) {
    return false
  }

  // UTF-16 LE BOM
  if (size >= 2 && bytes[0] == 0xFF && bytes[1] == 0xFE) {
    return false
  }

  for (var i = 0; i < size; i++) {
    if (bytes[i] === 0) { // NULL byte--it's binary!
      return true
    } else if ((bytes[i] < 7 || bytes[i] > 14) && (bytes[i] < 32 || bytes[i] > 127)) {
      // UTF-8 detection
      if (bytes[i] > 193 && bytes[i] < 224 && i + 1 < size) {
        i++
        if (bytes[i] > 127 && bytes[i] < 192) {
          continue
        }
      } else if (bytes[i] > 223 && bytes[i] < 240 && i + 2 < size) {
        i++
        if (bytes[i] > 127 && bytes[i] < 192 && bytes[i + 1] > 127 && bytes[i + 1] < 192) {
          i++
          continue
        }
      }
      suspicious_bytes++
      // Read at least 32 bytes before making a decision
      if (i > 32 && (suspicious_bytes * 100) / size > 10) {
        return true
      }
    }
  }

  if ((suspicious_bytes * 100) / size > 10) {
    return true
  }

  return false
}

/**
 * @param {string} mimeType 
 * @param {string} name 
 * @returns {string}
 */
function correctSomeMimeTypes (mimeType, name) {
  if (mimeType === 'video/quicktime' && name.endsWith('.mov')) {
    return 'video/mp4'
  }
  return mimeType
}