import co from 'co'
import { parse as parseURL } from 'url'
import * as dat from './internal-api'
import log from 'loglevel'
import { DAT_HASH_REGEX, PermissionsError, InvalidURLError, FileNotFoundError, FileReadError } from '../../../lib/const'

// exported api
// =

export default {
  createArchive: m('datWrite', function * () {
    throw new Error('not yet implemented') // TODO
  }, { noLookupArchive: true }),

  stat: m(function * (url, opts = {}) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  readFile: m(function * (url, opts = {}) {
    // TODO versions
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      // read the file into memory
      dat.readArchiveFile(archive, path, opts, (err, data) => {
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

  writeFile: m('datWrite', function * (url, data, opts = {}) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  deleteFile: m('datWrite', function * (url) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  readDirectory: m(function * (url, opts = {}) {
    // TODO history
    var { archive, path } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      dat.readArchiveDirectory(archive, path, (err, entries) => {
        if (err) reject(err)
        else resolve(entries)
      })
    })
  }),

  createDirectory: m('datWrite', function * (url) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  deleteDirectory: m('datWrite', function * (url) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getHistory: m(function * (url, opts = {}) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getCheckpoints: m(function * (url, opts = {}) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  writeCheckpoint: m('datWrite', function * (url, name, description) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  serve: m('datUpload', function * (url) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  unserve: m('datUpload', function * (url) {
    var { archive, path } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  })
}

// internal helpers
// =

// helper to construct api methods
// - `perm` is optional string
// - `fn` should be a generator fn which will be wrapped with co
function m (perm, fn, opts) {
  if (!fn) {
    fn = perm
    perm = false
  }
  fn = co.wrap(fn)

  return function (...args) {
    var sender = this.sender

    // check permission, if this method has one
    if (perm) {
      if (!checkPermission(sender, perm)) {
        return Promise.reject(PermissionsError(sender.getURL(), perm))
      }
    }

    return fn(...args)
  }
}

// helper to look up perms
function checkPermission (sender, permissionId) {
  var urlp = parseURL(sender.getURL())
  var origin = (urlp.protocol + urlp.host)
  if (!urlp) {
    return false // this should never happen
  }
  if (urlp.protocol === 'beaker:') {
    return true // beaker: protocol is always allowed
  }
  // TODO lookup origin in the database protocol
  return true // return true always for now
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
