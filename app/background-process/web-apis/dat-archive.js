import {dialog, BrowserWindow} from 'electron'
import path from 'path'
import {parse as parseURL} from 'url'
import pda from 'pauls-dat-api'
import jetpack from 'fs-jetpack'
const datDns = require('dat-dns')()
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import * as sitedataDb from '../dbs/sitedata'
import {showModal} from '../ui/modals'
import {queryPermission, requestPermission} from '../ui/permissions'
import { 
  DAT_HASH_REGEX,
  DAT_QUOTA_DEFAULT_BYTES_ALLOWED,
  DAT_VALID_PATH_REGEX,
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

const DEFAULT_TIMEOUT = 5e3

// exported api
// =

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

  async updateManifest(url, {title, description} = {}) {
    // initiate the modal
    var win = BrowserWindow.fromWebContents(this.sender)
    await assertSenderIsFocused(this.sender)
    return await showModal(win, 'create-archive', {url, title, description})
  },

  async loadArchive(url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    datLibrary.getOrLoadArchive(url)
    return Promise.resolve(true)
  },

  async getInfo(url, opts = {}) {
    return datLibrary.getArchiveInfo(url, opts)
  },

  async listHistory(url) {
    var { archive } = lookupArchive(url)
    return new Promise((resolve, reject) => {
      archive.list({ live: false }, (err, entries) => {
        if (err) reject(err)
        else resolve(entries)
      })
    })
  },

  async stat(url, opts = {}) {
    var { archive, filepath } = lookupArchive(url)
    var downloadedBlocks = opts.downloadedBlocks === true
    var entry = await pda.lookupEntry(archive, filepath, opts)
    if (!entry) {
      throw new NotFoundError()
    }
    if (downloadedBlocks) {
      entry.downloadedBlocks = archive.countDownloadedBlocks(entry)
    }
    return entry
  },

  async readFile(url, opts = {}) {
    var { archive, filepath } = lookupArchive(url)
    return pda.readFile(archive, filepath, opts)
  },

  async writeFile(url, data, opts = {}) {
    var { archive, filepath } = lookupArchive(url)
    var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
    await assertWritePermission(archive, this.sender)
    await assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(data, opts.encoding))
    await assertValidFilePath(filepath)
    /*
    if (isProtectedFilePath(filepath)) {
      throw new ProtectedFileNotWritableError()
    }
    */
    return pda.writeFile(archive, filepath, data, opts)
  },

  async deleteFile(url) {
    throw new Error('not yet implemented') // TODO
  },

  async download(url, opts) {
    var { archive, filepath } = lookupArchive(url)
    return pda.download(archive, filepath, opts)
  },

  async listFiles(url, opts = {}) {
    var { archive, filepath } = lookupArchive(url)
    var files = await pda.listFiles(archive, filepath, opts)
    if (opts.downloadedBlocks) {
      for (var k in files) {
        files[k].downloadedBlocks = archive.countDownloadedBlocks(files[k])
      }
    }
    return files
  },

  async createDirectory(url) {
    var { archive, filepath } = lookupArchive(url)
    await assertWritePermission(archive, this.sender)
    await assertValidPath(filepath)
    /*
    if (isProtectedFilePath(filepath)) {
      throw new ProtectedFileNotWritableError()
    }
    */
    return pda.createDirectory(archive, filepath)
  },

  async deleteDirectory(url) {
    throw new Error('not yet implemented') // TODO
  },

  createFileActivityStream(url, pathPattern) {
    var { archive } = lookupArchive(url)
    return pda.createFileActivityStream(archive, pathPattern)
  },

  createNetworkActivityStream(url) {
    var { archive } = lookupArchive(url)
    return pda.createNetworkActivityStream(archive)
  },

  async importFromFilesystem(opts) {
    assertTmpBeakerOnly(this.sender)
    var { archive, filepath } = lookupArchive(opts.dst)
    return pda.exportFilesystemToArchive({
      srcPath: opts.srcPath,
      dstArchive: archive,
      dstPath: filepath,
      ignore: opts.ignore,
      dryRun: opts.dryRun,
      inplaceImport: opts.inplaceImport === false ? false : true
    })
  },

  async exportToFilesystem(opts) {
    assertTmpBeakerOnly(this.sender)
    var { archive, filepath } = lookupArchive(opts.src)

    // check if there are files in the destination path
    var dstPath = opts.dstPath
    try {
      var files = await jetpack.listAsync(dstPath)
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

    // run
    return pda.exportArchiveToFilesystem({
      srcArchive: archive,
      srcPath: filepath,
      dstPath,
      ignore: opts.ignore,
      overwriteExisting: true,
      skipUndownloadedFiles: opts.skipUndownloadedFiles === false ? false : true
    })
  },

  async exportToArchive(opts) {
    assertTmpBeakerOnly(this.sender)
    var src = lookupArchive(opts.src)
    var dst = lookupArchive(opts.dst)
    return pda.exportArchiveToArchive({
      srcArchive: src.archive,
      srcPath: src.filepath,
      dstArchive: dst.archive,
      dstPath: dst.filepath,
      ignore: opts.ignore,
      skipUndownloadedFiles: opts.skipUndownloadedFiles === false ? false : true
    })
  },

  async resolveName(name) {
    return datDns.resolveName(name)
  }
}

// internal helpers
// =

// helper to check if filepath refers to a file that userland is not allowed to edit directly
/*
function isProtectedFilePath (filepath) {
  return filepath === '/dat.json'
}
*/

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
  if (!archive.owner) throw new ArchiveNotWritableError()

  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }

  // self-modification always allowed
  var senderDatKey = await lookupUrlDatKey(sender.getURL())
  if (senderDatKey === archiveKey) return true

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
  // fetch the archive meta, and the current quota for the site
  const [meta, userSettings] = await Promise.all([
    archivesDb.getMeta(archive.key),
    archivesDb.getUserSettings(0, archive.key)
  ])

  // fallback to default quota
  var bytesAllowed = userSettings.bytesAllowed || DAT_QUOTA_DEFAULT_BYTES_ALLOWED

  // check the new size
  var newSize = meta.size + byteLength
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
    throw new UserDeniedError('Application must be focused to spawn the Create Dat prompt')
  }
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
    filepath = urlp.pathname || ''
  }

  // lookup the archive
  var archive = datLibrary.getArchive(archiveKey)
  if (!archive) archive = datLibrary.loadArchive(new Buffer(archiveKey, 'hex'))
  return { archive, filepath }
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

  var urlp = parseURL(url)
  try {
    return await datDns.resolveName(urlp.hostname)
  } catch (e) {
    return false
  }
}
