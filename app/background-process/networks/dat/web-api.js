import co from 'co'
import { parse as parseURL } from 'url'
import * as dat from './dat'
import { statArchiveFile, readArchiveFile, readArchiveDirectory, writeArchiveFile } from './helpers'
import log from 'loglevel'
import { 
  DAT_HASH_REGEX,
  PermissionsError,
  InvalidEncodingError,
  InvalidURLError,
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  ProtectedFileNotWritableError
} from '../../../lib/const'

// exported api
// =

export default {
  stat: m(function * (url, opts = {}) {
    // TODO versions
    // TODO timeout
    // TODO downloadedBlocks
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      // read the stat
      statArchiveFile(archive, path, (err, data) => {
        if (err) {
          // error handling
          if (err.notFound) {
            return reject(new FileNotFoundError('File not found'))
          }
          log.error('Failed to read archive entry', err)
          return reject(new FileReadError())
        }
        resolve(data)
      })
    })
  }),

  readFile: m(function * (url, opts = {}) {
    // TODO versions
    // TODO timeout
    // TODO binary
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      // read the file into memory
      readArchiveFile(archive, path, opts, (err, data) => {
        if (err) {
          // error handling
          if (err.notFound) {
            return reject(new FileNotFoundError('File not found'))
          }
          log.error('Failed to read archive file', err)
          return reject(new FileReadError())
        }
        resolve(data)
      })
    })
  }),

  writeFile: m(function * (url, data, opts = {}) {
    // TODO binary
    // TODO quota management
    // TODO permission check
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      // protected files
      if (isProtectedFilePath(path)) {
        return reject(new ProtectedFileNotWritableError())
      }

      // write the file
      writeArchiveFile(archive, path, data, opts, (err, data) => {
        if (err) {
          // error handling
          if (err.invalidEncoding) {
            return reject(new InvalidEncodingError(`Encoding ${err.encoding} does not match the given value type ${err.type}`))
          }
          log.error('Failed to write archive file', err)
          return reject(new FileWriteError())
        }
        resolve()
      })
    })
  }),

  deleteFile: m(function * (url) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  readDirectory: m(function * (url, opts = {}) {
    // TODO history
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      readArchiveDirectory(archive, path, (err, entries) => {
        if (err) reject(err)
        else resolve(entries)
      })
    })
  }),

  createDirectory: m(function * (url) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  deleteDirectory: m(function * (url) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getHistory: m(function * (url, opts = {}) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getCheckpoints: m(function * (url, opts = {}) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  writeCheckpoint: m(function * (url, name, description) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  serve: m(function * (url) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  unserve: m(function * (url) {
    // var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  })
}

// internal helpers
// =

// helper to construct api methods
// - `fn` should be a generator fn (change to async when support lands)
function m (fn, opts) {
  if (!fn) {
    fn = perm
    perm = false
  }
  fn = co.wrap(fn)

  return function (...args) {
    var sender = this.sender

    // check the protocol
    if (!checkProtocolPermission(sender)) {
      return Promise.reject(PermissionsError(sender.getURL()))
    }

    return fn(...args)
  }
}

// helper to check broad perms
function checkProtocolPermission (sender) {
  return (sender.getURL().startsWith('beaker:') || sender.getURL().startsWith('dat:'))
}

// helper to check if path refers to a file that userland is not allowed to edit directly
function isProtectedFilePath (path) {
  return path === '/dat.json'
}

// helper to handle the URL argument that's given to most args
// - can get a dat hash, or dat url
// - returns { archive, path }
// - throws if the path is invalid
function lookupArchive (url) {
  var archiveKey, path
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    archiveKey = url
    path = '/'
  } else {
    var urlp = parseURL(url)

    // validate
    if (urlp.protocol !== 'dat:') {
      throw new InvalidURLError('URL must be a dat: scheme')
    }
    if (!DAT_HASH_REGEX.test(urlp.host)) {
      // TODO- support dns lookup?
      throw new InvalidURLError('Hostname is not a valid hash')
    }

    archiveKey = urlp.host
    path = urlp.pathname
  }

  // lookup the archive
  var archive = dat.getArchive(archiveKey)
  if (!archive) {
    archive = dat.loadArchive(new Buffer(archiveKey, 'hex'))
    dat.swarm(archiveKey)
  }
  return { archive, path }
}
