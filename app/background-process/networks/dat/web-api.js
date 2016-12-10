import co from 'co'
import path from 'path'
import { parse as parseURL } from 'url'
import * as dat from './dat'
import * as archivesDb from '../../dbs/archives'
import * as sitedataDb from '../../dbs/sitedata'
import { statArchiveFile, readArchiveFile, readArchiveDirectory, writeArchiveFile, writeArchiveDirectory, toValidEncoding } from './helpers'
import { queryPermission, requestPermission } from '../../ui/permissions'
import { 
  DAT_HASH_REGEX,
  DAT_QUOTA_DEFAULT_BYTES_ALLOWED,

  UserDeniedError,
  PermissionsError,
  QuotaExceededError,
  ArchiveNotWritableError,

  InvalidEncodingError,
  ArchiveNotSavedError,
  InvalidURLError,

  TimeoutError,
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  ProtectedFileNotWritableError,
  FileAlreadyExistsError,
  FolderAlreadyExistsError,
  ParentFolderDoesntExistError
} from '../../../lib/const'

const DEFAULT_TIMEOUT = 5e3

// exported api
// =

const createArchive = m(function * ({ title, description } = {}) {
  // ask the user
  var decision = yield requestPermission('createDat', this.sender, { title })
  if (decision === false) throw new UserDeniedError()

  // fetch some origin info
  var originTitle = null
  var origin = archivesDb.extractOrigin(this.sender.getURL())
  try {
    var originKey = /dat:\/\/([^\/]*)/.exec(origin)[1]
    var originMeta = yield archivesDb.getArchiveMeta(originKey)
    originTitle = originMeta.title || null
  } catch (e) {}

  // create the archive
  var key = yield dat.createNewArchive({ title, description, origin, originTitle })
  return `dat://${key}/`
})

const deleteArchive = m(function * (url) {
  var { archive } = lookupArchive(url)
  var archiveKey = archive.key.toString('hex')

  // get the archive meta
  var details = yield dat.getArchiveDetails(archiveKey)
  var oldSettings = details.userSettings

  // fail if this site isnt saved
  if (!details.userSettings.isSaved) {
    throw new ArchiveNotSavedError()
  }

  // ask the user
  var decision = yield requestPermission('deleteDat:' + archiveKey, this.sender, { title: details.title })
  if (decision === false) throw new UserDeniedError()

  // delete
  yield archivesDb.setArchiveUserSettings(archive.key, { isHosting: false, isSaved: false })
})

const readDirectory = m(function * (url, opts = {}) {
  // TODO history
  var { archive, filepath } = lookupArchive(url)
  return new Promise((resolve, reject) => {
    readArchiveDirectory(archive, filepath, (err, entries) => {
      if (err) reject(err)
      else resolve(entries)
    })
  })
})

const stat = m(function * (url, opts = {}) {
  // TODO versions
  var downloadedBlocks = !!opts.downloadedBlocks
  var timeout = (typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
  var { archive, filepath } = lookupArchive(url)
  return new Promise((resolve, reject) => {
    // start timeout timer
    var timedOut = false, entriesStream
    var timer = setTimeout(() => {
      timedOut = true
      entriesStream.destroy()
      reject(new TimeoutError())
    }, timeout)

    // read the stat
    entriesStream = statArchiveFile(archive, filepath, (err, data) => {
      clearTimeout(timer)
      if (timedOut) return // do nothing if timed out
      if (err) {
        // error handling
        if (err.notFound) {
          return reject(new FileNotFoundError('File not found'))
        }
        console.error('Failed to read archive entry', err)
        return reject(new FileReadError())
      }

      // count downloaded blocks?
      if (downloadedBlocks) {
        data.downloadedBlocks = archive.countDownloadedBlocks(data)
      }

      resolve(data)
    })
  })
})

export default {
  createArchive,
  createSite: createArchive, // alias

  deleteArchive,
  deleteSite: deleteArchive, // alias

  stat,
  exists: m(function * (url) {
    // try to stat
    try {
      yield stat.call(this, url)
      return true
    } catch (e) {
      return false
    }
  }),

  readFile: m(function * (url, opts = {}) {
    // TODO versions
    var timeout = (typeof opts.timeout === 'number') ? opts.timeout : DEFAULT_TIMEOUT
    var { archive, filepath } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      // start timeout timer
      var timedOut = false, entriesStream
      var timer = setTimeout(() => {
        timedOut = true
        entriesStream.destroy()
        reject(new TimeoutError())
      }, timeout)

      // read the file into memory
      entriesStream = readArchiveFile(archive, filepath, opts, (err, data) => {
        clearTimeout(timer)
        if (timedOut) return // do nothing if timed out
        if (err) {
          // error handling
          if (err.notFound) {
            return reject(new FileNotFoundError('File not found'))
          }
          console.error('Failed to read archive file', err)
          return reject(new FileReadError())
        }
        resolve(data)
      })
    })
  }),

  writeFile: m(function * (url, data, opts = {}) {
    if (typeof opts === 'string') {
      opts = { encoding: opts }
    }
    // guess the encoding by the data type
    if (!opts.encoding) {
      opts.encoding = (typeof data === 'string' ? 'utf8' : 'binary')
    }
    opts.encoding = toValidEncoding(opts.encoding)

    var { archive, filepath } = lookupArchive(url)
    var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
    yield assertWritePermission(archive, this.sender)
    yield assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(data, opts.encoding))
    return new Promise((resolve, reject) => {
      // protected files
      if (isProtectedFilePath(filepath)) {
        return reject(new ProtectedFileNotWritableError())
      }

      // check what's currently there
      statArchiveFile(archive, filepath, (err, entry) => {
        // dont overwrite directories
        if (entry && entry.type === 'directory') {
          return reject(new FolderAlreadyExistsError())
        }

        // check that the parent directory exists
        statArchiveFile(archive, path.dirname(filepath), (err, entry) => {
          if (!entry || entry.type !== 'directory') {
            return reject(new ParentFolderDoesntExistError())
          }

          // write the file
          writeArchiveFile(archive, filepath, data, opts, err => {
            if (err) {
              // error handling
              if (err.invalidEncoding) {
                return reject(new InvalidEncodingError(`Encoding ${err.encoding} does not match the given value type ${err.type}`))
              }
              console.error('Failed to write archive file', err)
              return reject(new FileWriteError())
            }
            resolve()
          })
        })
      })
    })
  }),

  deleteFile: m(function * (url) {
    // var { archive, filepath } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  readDirectory,
  listFiles: readDirectory, // alias

  createDirectory: m(function * (url) {
    var { archive, filepath } = lookupArchive(url)
    yield assertWritePermission(archive, this.sender)
    return new Promise((resolve, reject) => {
      // protected files
      if (isProtectedFilePath(filepath)) {
        return reject(new ProtectedFileNotWritableError())
      }

      // check what's currently there
      statArchiveFile(archive, filepath, (err, entry) => {
        // dont overwrite directories
        if (entry) {
          if (entry.type === 'directory') return reject(new FolderAlreadyExistsError())
          return reject(new FileAlreadyExistsError())
        }

        // check that the parent directory exists
        statArchiveFile(archive, path.dirname(filepath), (err, entry) => {
          if (!entry || entry.type !== 'directory') {
            return reject(new ParentFolderDoesntExistError())
          }

          // write the directory
          writeArchiveDirectory(archive, filepath, err => {
            if (err) {
              console.error('Failed to write archive folder', err)
              return reject(new FileWriteError())
            }
            resolve()
          })
        })
      })
    })
  }),

  deleteDirectory: m(function * (url) {
    // var { archive, filepath } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getHistory: m(function * (url, opts = {}) {
    // var { archive, filepath } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  getCheckpoints: m(function * (url, opts = {}) {
    // var { archive, filepath } = lookupArchive(url)
    throw new Error('not yet implemented') // TODO
  }),

  writeCheckpoint: m(function * (url, name, description) {
    // var { archive, filepath } = lookupArchive(url)
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
      return Promise.reject(new PermissionsError())
    }

    return fn.apply(this, args)
  }
}

// helper to check broad perms
function checkProtocolPermission (sender) {
  return (sender.getURL().startsWith('beaker:') || sender.getURL().startsWith('dat:'))
}

// helper to check if filepath refers to a file that userland is not allowed to edit directly
function isProtectedFilePath (filepath) {
  return filepath === '/' || filepath === '/dat.json'
}

function assertWritePermission (archive, sender) {
  return co(function * () {
    var archiveKey = archive.key.toString('hex')
    const perm = ('modifyDat:' + archiveKey)

    // ensure we have the archive's private key
    if (!archive.owner) throw new ArchiveNotWritableError()

    // ensure the sender is allowed to write
    var allowed = yield queryPermission(perm, sender)
    if (allowed) return true

    // ask the user
    var details = yield dat.getArchiveDetails(archiveKey)
    allowed = yield requestPermission(perm, sender, { title: details.title })
    if (!allowed) throw new UserDeniedError()
    return true
  })
}

function assertQuotaPermission (archive, senderOrigin, byteLength) {
  // fetch the archive meta, and the current quota for the site
  return Promise.all([
    archivesDb.getArchiveMeta(archive.key),
    archivesDb.getArchiveUserSettings(archive.key)
  ]).then(([meta, userSettings]) => {
    // fallback to default quota
    var bytesAllowed = userSettings.bytesAllowed || DAT_QUOTA_DEFAULT_BYTES_ALLOWED

    // check the new size
    var newSize = meta.size + byteLength
    if (newSize > bytesAllowed) {
      throw new QuotaExceededError()
    }
  })
}

// helper to handle the URL argument that's given to most args
// - can get a dat hash, or dat url
// - returns { archive, filepath }
// - throws if the filepath is invalid
function lookupArchive (url) {
  var archiveKey, filepath
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    archiveKey = url
    filepath = '/'
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
    filepath = urlp.pathname
  }

  // multiple slashes at the start of the filepath is an easy mistake to make in URL construction
  // correct against it automatically
  filepath = filepath.replace(/^\/+/, '/')

  // lookup the archive
  var archive = dat.getArchive(archiveKey)
  if (!archive) archive = dat.loadArchive(new Buffer(archiveKey, 'hex'))
  return { archive, filepath }
}
