import {dialog, BrowserWindow} from 'electron'
import path from 'path'
import {parse as parseURL} from 'url'
import parseDatURL from 'parse-dat-url'
import pda from 'pauls-dat-api'
import jetpack from 'fs-jetpack'
import concat from 'concat-stream'
const datDns = require('dat-dns')()
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import * as sitedataDb from '../dbs/sitedata'
import {showModal} from '../ui/modals'
import {timer} from '../../lib/time'
import {queryPermission, requestPermission} from '../ui/permissions'
import { 
  DAT_MANIFEST_FILENAME,
  DAT_HASH_REGEX,
  DAT_QUOTA_DEFAULT_BYTES_ALLOWED,
  DAT_VALID_PATH_REGEX,
  DEFAULT_DAT_API_TIMEOUT
} from '../../lib/const'
import {
  PermissionsError,
  UserDeniedError,
  QuotaExceededError,
  ArchiveNotWritableError,
  InvalidURLError,
  NotFoundError,
  ProtectedFileNotWritableError,
  InvalidPathError
} from 'beaker-error-constants'

// exported api
// =

const to = (opts) =>
  (opts && typeof opts.timeout !== 'undefined')
    ? opts.timeout
    : DEFAULT_DAT_API_TIMEOUT

export default {
  async createArchive({title, description} = {}) {
    // initiate the modal
    var win = BrowserWindow.fromWebContents(this.sender)
    await assertSenderIsFocused(this.sender)
    var createdBy = this.sender.getURL()
    var res = await showModal(win, 'create-archive', {title, description, createdBy})
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  async forkArchive(url, {title, description} = {}) {
    // initiate the modal
    var win = BrowserWindow.fromWebContents(this.sender)
    await assertSenderIsFocused(this.sender)
    var createdBy = this.sender.getURL()
    var key1 = await lookupUrlDatKey(url)
    var key2 = await lookupUrlDatKey(createdBy)
    var isSelfFork = key1 === key2
    var res = await showModal(win, 'fork-archive', {url, title, description, createdBy, isSelfFork})
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  async loadArchive(url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    await datLibrary.getOrLoadArchive(url)
    return Promise.resolve(true)
  },

  async getInfo(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      return datLibrary.getArchiveInfo(url)
    })
  },

  async diff(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, version} = await lookupArchive(url)
      if (checkin('diffing')) return
      if (version) return [] // TODO
      if (!archive.staging) return []
      return pda.diff(archive.staging)
    })
  },

  async commit(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('committing')) return
      if (!archive.staging) return []
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      var res = await pda.commit(archive.staging)
      await datLibrary.updateSizeTracking(archive)
      return res
    })
  },

  async revert(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('reverting')) return
      if (!archive.staging) return []
      await assertWritePermission(archive, this.sender)
      var res = await pda.revert(archive.staging)
      await datLibrary.updateSizeTracking(archive)
      return res
    })
  },

  async history(url, opts = {}) {
    var reverse = opts.reverse === true
    var {start, end} = opts
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, version} = await lookupArchive(url)
      if (checkin('reading history')) return

      // if reversing the output, modify start/end
      start = start || 0
      end = end || archive.metadata.length
      if (reverse) {
        // swap values
        let t = start
        start = end
        end = t
        // start from the end
        start = archive.metadata.length - start
        end = archive.metadata.length - end
      }

      return new Promise((resolve, reject) => {
        // .stagingFS doesnt provide history()
        // and .checkoutFS falls back to .stagingFS
        // so we need to manually select checkoutFS or archive
        var ctx = ((version) ? archive.checkoutFS : archive)
        var stream = ctx.history({live: false, start, end})
        stream.pipe(concat({encoding: 'object'}, values => {
          if (reverse) values.reverse()
          resolve(values)
        }))
        stream.on('error', reject)
      })
    })
  },

  async stat(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath} = await lookupArchive(url)
      if (checkin('reading stat()')) return
      return pda.stat(archive.checkoutFS, filepath)
    })
  },

  async readFile(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath} = await lookupArchive(url)
      if (checkin('fetching file')) return
      return pda.readFile(archive.checkoutFS, filepath, opts)
    })
  },

  async writeFile(url, data, opts = {}) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('writing file')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(data, opts.encoding))
      await assertValidFilePath(filepath)
      await assertUnprotectedFilePath(filepath, this.sender)
      return pda.writeFile(archive.stagingFS, filepath, data, opts)
    })
  },

  async unlink(url) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('unlinking file')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertUnprotectedFilePath(filepath, this.sender)
      return pda.unlink(archive.stagingFS, filepath)
    })
  },

  // TODO copy-disabled
  /*async copy(url, dstPath) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath} = await lookupArchive(url)
      if (checkin('copying file')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertUnprotectedFilePath(dstPath, this.sender)
      return pda.copy(archive.stagingFS, filepath, dstPath)
    })
  },*/

  // TODO rename-disabled
  /*async rename(url, dstPath) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath} = await lookupArchive(url)
      if (checkin('renaming file')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertUnprotectedFilePath(filepath, this.sender)
      await assertUnprotectedFilePath(dstPath, this.sender)
      return pda.rename(archive.stagingFS, filepath, dstPath)
    })
  },*/

  async download(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (version) throw new Error('Not yet supported: can\'t download() old versions yet. Sorry!') // TODO
      if (checkin('downloading file(s)')) return
      return pda.download(archive, filepath)
    })
  },

  async readdir(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (checkin('reading the directory')) return
      return pda.readdir(archive.checkoutFS, filepath, opts)
    })
  },

  async mkdir(url) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('making the directory')) return
      await assertWritePermission(archive, this.sender)
      await assertValidPath(filepath)
      await assertUnprotectedFilePath(filepath, this.sender)
      return pda.mkdir(archive.stagingFS, filepath)
    })
  },

  async rmdir(url, opts = {}) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('removing the directory')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertUnprotectedFilePath(filepath, this.sender)
      return pda.rmdir(archive.stagingFS, filepath, opts)
    })
  },

  async createFileActivityStream(url, pathPattern) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive} = await lookupArchive(url)
      if (checkin('creating the stream')) return
      if (archive.staging) {
        return pda.createFileActivityStream(archive, archive.stagingFS, pathPattern)
      } else {
        return pda.createFileActivityStream(archive, pathPattern)
      }
    })
  },

  async createNetworkActivityStream(url) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive} = await lookupArchive(url)
      if (checkin('creating the stream')) return
      var stream = await pda.createNetworkActivityStream(archive)
      return stream
    })
  },

  async importFromFilesystem(opts) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      assertTmpBeakerOnly(this.sender)
      var {archive, filepath, version} = await lookupArchive(opts.dst)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (checkin('copying files')) return
      return pda.exportFilesystemToArchive({
        srcPath: opts.src,
        dstArchive: archive.stagingFS,
        dstPath: filepath,
        ignore: opts.ignore,
        dryRun: opts.dryRun,
        inplaceImport: opts.inplaceImport === false ? false : true
      })
    })
  },

  async exportToFilesystem(opts) {
    // check if there are files in the destination path
    var dst = opts.dst
    try {
      var files = await jetpack.listAsync(dst)
      if (files && files.length > 0) {
        // ask the user if they're sure
        var res = await new Promise(resolve => {
          dialog.showMessageBox({
            type: 'question',
            message: 'This folder is not empty. Some files may be overwritten. Continue export?',
            buttons: ['Yes', 'No, cancel']
          }, resolve)
        })
        if (res != 0) {
          return false
        }
      }
    } catch (e) {
      // no files
    }

    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      assertTmpBeakerOnly(this.sender)
      var {archive, filepath} = await lookupArchive(opts.src)
      if (checkin('copying files')) return
      return pda.exportArchiveToFilesystem({
        srcArchive: archive.checkoutFS,
        srcPath: filepath,
        dstPath: opts.dst,
        ignore: opts.ignore,
        overwriteExisting: opts.overwriteExisting,
        skipUndownloadedFiles: opts.skipUndownloadedFiles === false ? false : true
      })
    })
  },

  async exportToArchive(opts) {
    return timer(to(opts), async (checkin) => {
      checkin('searching for archive')
      assertTmpBeakerOnly(this.sender)
      var src = await lookupArchive(opts.src)
      var dst = await lookupArchive(opts.dst)
      if (checkin('copying files')) return
      if (dst.version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      return pda.exportArchiveToArchive({
        srcArchive: src.archive.checkoutFS,
        srcPath: src.filepath,
        dstArchive: dst.archive.stagingFS,
        dstPath: dst.filepath,
        ignore: opts.ignore,
        skipUndownloadedFiles: opts.skipUndownloadedFiles === false ? false : true
      })
    })
  },

  async resolveName(name) {
    return datDns.resolveName(name)
  }
}

// internal helpers
// =

// helper to check if filepath refers to a file that userland is not allowed to edit directly
function assertUnprotectedFilePath (filepath, sender) {
  if (sender.getURL().startsWith('beaker:')) {
    return // can write any file
  }
  if (filepath === '/dat.json') {
    throw new ProtectedFileNotWritableError()
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertTmpBeakerOnly (sender) {
  if (!sender.getURL().startsWith('beaker:')) {
    throw new PermissionsError()
  }
}

async function assertWritePermission (archive, sender) {
  var archiveKey = archive.key.toString('hex')
  const perm = ('modifyDat:' + archiveKey)

  // ensure we have the archive's private key
  if (!archive.writable) throw new ArchiveNotWritableError()

  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }

  // self-modification NEVER allowed
  var senderDatKey = await lookupUrlDatKey(sender.getURL())
  if (senderDatKey === archiveKey) {
    throw new PermissionsError('Dat sites are not allowed to self-modify')
  }

  // ensure the sender is allowed to write
  var allowed = await queryPermission(perm, sender)
  if (allowed) return true

  // ask the user
  var details = await datLibrary.getArchiveInfo(archiveKey)
  allowed = await requestPermission(perm, sender, { title: details.title })
  if (!allowed) throw new UserDeniedError()
  return true
}

async function assertQuotaPermission (archive, senderOrigin, byteLength) {
  // fetch the archive settings
  const userSettings = await archivesDb.getUserSettings(0, archive.key)

  // fallback to default quota
  var bytesAllowed = userSettings.bytesAllowed || DAT_QUOTA_DEFAULT_BYTES_ALLOWED

  // check the new size
  var newSize = (archive.metaSize + archive.stagingSize + byteLength)
  if (newSize > bytesAllowed) {
    throw new QuotaExceededError()
  }
}

async function assertValidFilePath (filepath) {
  if (filepath.slice(-1) === '/') {
    throw new InvalidPathError('Files can not have a trailing slash')
  }
  await assertValidPath (filepath)
}

async function assertValidPath (fileOrFolderPath) {
  if (!DAT_VALID_PATH_REGEX.test(fileOrFolderPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
}

async function assertSenderIsFocused (sender) {
  if (!sender.isFocused()) {
    throw new UserDeniedError('Application must be focused to spawn a prompt')
  }
}

function parseUrlParts (url) {
  var archiveKey, filepath, version
  if (DAT_HASH_REGEX.test(url)) {
    // simple case: given the key
    archiveKey = url
    filepath = '/'
  } else {
    var urlp = parseDatURL(url)

    // validate
    if (urlp.protocol !== 'dat:') {
      throw new InvalidURLError('URL must be a dat: scheme')
    }
    if (!DAT_HASH_REGEX.test(urlp.host)) {
      // TODO- support dns lookup?
      throw new InvalidURLError('Hostname is not a valid hash')
    }

    archiveKey = urlp.host
    filepath = decodeURIComponent(urlp.pathname || '')
    version = urlp.version
  }
  return {archiveKey, filepath, version}
}

// helper to handle the URL argument that's given to most args
// - can get a dat hash, or dat url
// - returns {archive, filepath, version}
// - sets archive.checkoutFS to what's requested by version
// - throws if the filepath is invalid
async function lookupArchive (url) {
  // lookup the archive
  var {archiveKey, filepath, version} = parseUrlParts(url)
  var archive = datLibrary.getArchive(archiveKey)
  if (!archive) archive = await datLibrary.loadArchive(archiveKey)

  // set checkoutFS according to the version requested
  if (version) {
    archive.checkoutFS = archive.checkout(+version)
  } else {
    // access dat.json from archive only (never from staging)
    if (filepath === '/' + DAT_MANIFEST_FILENAME) {
      archive.checkoutFS = archive
    } else {
      archive.checkoutFS = archive.stagingFS
    }
  }

  return {archive, filepath, version}
}

async function getCreatedBy (sender) {
  // fetch some origin info
  var originTitle = null
  var origin = archivesDb.extractOrigin(sender.getURL())
  try {
    var originKey = /dat:\/\/([^\/]*)/.exec(origin)[1]
    var originMeta = await archivesDb.getMeta(originKey)
    originTitle = originMeta.title || null
  } catch (e) {}

  // construct info
  if (originTitle) {
    return {url: origin, title: originTitle}
  }
  return {url: origin}
}

async function lookupUrlDatKey (url) {
  if (url.startsWith('dat://') === false) {
    return false // not a dat site
  }

  var urlp = parseDatURL(url)
  try {
    return await datDns.resolveName(urlp.hostname)
  } catch (e) {
    return false
  }
}
