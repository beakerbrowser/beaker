import co from 'co'
import path from 'path'
import { parse as parseURL } from 'url'
import pda from 'pauls-dat-api'
import * as dat from './dat'
import * as archivesDb from '../../dbs/archives'
import * as sitedataDb from '../../dbs/sitedata'
import { queryPermission, requestPermission } from '../../ui/permissions'
import { 
  DAT_HASH_REGEX,
  DAT_QUOTA_DEFAULT_BYTES_ALLOWED,
  DAT_VALID_PATH_REGEX,

  UserDeniedError,
  PermissionsError,
  QuotaExceededError,
  ArchiveNotWritableError,
  ArchiveNotSavedError,
  InvalidURLError,
  FileNotFoundError,
  ProtectedFileNotWritableError,
  InvalidPathError
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
  yield archivesDb.setArchiveUserSettings(archive.key, {isSaved: false})
})

const readDirectory = m(function * (url, opts = {}) {
  // TODO history
  var { archive, filepath } = lookupArchive(url)
  return pda.listFiles(archive, filepath, opts)
})

export default {
  createArchive,
  createSite: createArchive, // alias

  deleteArchive,
  deleteSite: deleteArchive, // alias

  stat: m(function * (url, opts = {}) {
    // TODO versions
    var { archive, filepath } = lookupArchive(url)
    var downloadedBlocks = opts.downloadedBlocks === true
    var entry = yield pda.lookupEntry(archive, filepath, opts)
    if (!entry) {
      throw new FileNotFoundError()
    }
    if (downloadedBlocks) {
      entry.downloadedBlocks = archive.countDownloadedBlocks(entry)
    }
    return entry
  }),

  exists: m(function * (url, opts = {}) {
    // TODO versions
    var { archive, filepath } = lookupArchive(url)
    var entry = yield pda.lookupEntry(archive, filepath, opts)
    return !!entry
  }),

  readFile: m(function * (url, opts = {}) {
    // TODO versions
    var { archive, filepath } = lookupArchive(url)
    return pda.readFile(archive, filepath, opts)
  }),

  writeFile: m(function * (url, data, opts = {}) {
    var { archive, filepath } = lookupArchive(url)
    var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
    yield assertWritePermission(archive, this.sender)
    yield assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(data, opts.encoding))
    yield assertValidFilePath(filepath)
    if (isProtectedFilePath(filepath)) {
      throw new ProtectedFileNotWritableError()
    }
    return pda.writeFile(archive, filepath, data, opts)
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
    yield assertValidPath(filepath)
    if (isProtectedFilePath(filepath)) {
      throw new ProtectedFileNotWritableError()
    }
    return pda.createDirectory(archive, filepath)
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
  return filepath === '/dat.json'
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

function assertValidFilePath (filepath) {
  return co(function * () {
    if (filepath.slice(-1) === '/') throw new InvalidPathError('Files can not have a trailing slash')
    yield assertValidPath (filepath)
  })
}

function assertValidPath (fileOrFolderPath) {
  return co(function * () {
    if (!DAT_VALID_PATH_REGEX.test(fileOrFolderPath)) throw new InvalidPathError('Path contains invalid characters')
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
