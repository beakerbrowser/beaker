import {dialog} from 'electron'
import path from 'path'
import parseDatURL from 'parse-dat-url'
import pda from 'pauls-dat-api'
import jetpack from 'fs-jetpack'
import concat from 'concat-stream'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
import {showModal} from '../ui/modals'
import {timer} from '../../lib/time'
import {getWebContentsWindow} from '../../lib/electron'
import {queryPermission, grantPermission, requestPermission} from '../ui/permissions'
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
  async createArchive ({title, description} = {}) {
    // initiate the modal
    var win = getWebContentsWindow(this.sender)
    // DISABLED
    // this mechanism is a bit too temperamental
    // are we sure it's the best policy anyway?
    // -prf
    // await assertSenderIsFocused(this.sender)

    // run the creation modal
    var res = await showModal(win, 'create-archive', {title, description})
    if (!res || !res.url) throw new UserDeniedError()

    // grant write permissions to the creating app
    var newArchiveKey = await lookupUrlDatKey(res.url)
    grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return res.url
  },

  async forkArchive (url, {title, description} = {}) {
    // initiate the modal
    var win = getWebContentsWindow(this.sender)
    // DISABLED
    // this mechanism is a bit too temperamental
    // are we sure it's the best policy anyway?
    // -prf
    // await assertSenderIsFocused(this.sender)

    // run the fork modal
    var key1 = await lookupUrlDatKey(url)
    var key2 = await lookupUrlDatKey(this.sender.getURL())
    var isSelfFork = key1 === key2
    var res = await showModal(win, 'fork-archive', {url, title, description, isSelfFork})
    if (!res || !res.url) throw new UserDeniedError()

    // grant write permissions to the creating app
    var newArchiveKey = await lookupUrlDatKey(res.url)
    grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return res.url
  },

  async loadArchive (url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    url = await datDns.resolveName(url)
    await datLibrary.getOrLoadArchive(url)
    return Promise.resolve(true)
  },

  async getInfo (url, opts = {}) {
    return timer(to(opts), async () => {
      var info = await datLibrary.getArchiveInfo(url)
      if (this.sender.getURL().startsWith('beaker:')) {
        return info
      }
      // return a subset of the data
      return {
        key: info.key,
        url: info.url,
        isOwner: info.isOwner,

        // state
        version: info.version,
        peers: info.peers,
        mtime: info.mtime,
        metaSize: info.metaSize,
        stagingSize: info.stagingSize,

        // manifest
        title: info.title,
        description: info.description
      }
    })
  },

  async diff (url, opts = {}) {
    var {archive, version} = await lookupArchive(url, opts)
    if (version) return [] // TODO
    if (!archive.staging) return []
    return pda.diff(archive.staging, {shallow: opts.shallow})
  },

  async commit (url, opts = {}) {
    var {archive, version} = await lookupArchive(url, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    if (!archive.staging) return []
    await assertWritePermission(archive, this.sender)
    var res = await pda.commit(archive.staging)
    await datLibrary.updateSizeTracking(archive)
    return res
  },

  async revert (url, opts = {}) {
    var {archive, version} = await lookupArchive(url, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    if (!archive.staging) return []
    await assertWritePermission(archive, this.sender)
    var res = await pda.revert(archive.staging)
    await datLibrary.updateSizeTracking(archive)
    return res
  },

  async history (url, opts = {}) {
    var reverse = opts.reverse === true
    var {start, end} = opts
    var {archive, version} = await lookupArchive(url, opts)

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
        values = values.map(massageHistoryObj)
        if (reverse) values.reverse()
        resolve(values)
      }))
      stream.on('error', reject)
    })
  },

  async stat (url, opts = {}) {
    var {archive, filepath} = await lookupArchive(url, opts)
    return pda.stat(archive.checkoutFS, filepath)
  },

  async readFile (url, opts = {}) {
    var {archive, filepath} = await lookupArchive(url, opts)
    return pda.readFile(archive.checkoutFS, filepath, opts)
  },

  async writeFile (url, data, opts = {}) {
    var {archive, filepath, version} = await lookupArchive(url, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
    await assertWritePermission(archive, this.sender)
    await assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(data, opts.encoding))
    await assertValidFilePath(filepath)
    await assertUnprotectedFilePath(filepath, this.sender)
    return pda.writeFile(archive.stagingFS, filepath, data, opts)
  },

  async unlink (url) {
    var {archive, filepath, version} = await lookupArchive(url)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    await assertWritePermission(archive, this.sender)
    await assertUnprotectedFilePath(filepath, this.sender)
    return pda.unlink(archive.stagingFS, filepath)
  },

  // TODO copy-disabled
  /* async copy(url, dstPath) {
    return timer(to(), async (checkin) => {
      checkin('searching for archive')
      var {archive, filepath} = await lookupArchive(url)
      if (checkin('copying file')) return
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertUnprotectedFilePath(dstPath, this.sender)
      return pda.copy(archive.stagingFS, filepath, dstPath)
    })
  }, */

  // TODO rename-disabled
  /* async rename(url, dstPath) {
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
  }, */

  async download (url, opts = {}) {
    var {archive, filepath, version} = await lookupArchive(url, opts)
    if (version) throw new Error('Not yet supported: can\'t download() old versions yet. Sorry!') // TODO
    return pda.download(archive, filepath)
  },

  async readdir (url, opts = {}) {
    var {archive, filepath} = await lookupArchive(url, opts)
    var names = await pda.readdir(archive.checkoutFS, filepath, opts)
    if (opts.stat) {
      for (let i = 0; i < names.length; i++) {
        names[i] = {
          name: names[i],
          stat: await pda.stat(archive.checkoutFS, path.join(filepath, names[i]))
        }
      }
    }
    return names
  },

  async mkdir (url) {
    var {archive, filepath, version} = await lookupArchive(url)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    await assertWritePermission(archive, this.sender)
    await assertValidPath(filepath)
    await assertUnprotectedFilePath(filepath, this.sender)
    return pda.mkdir(archive.stagingFS, filepath)
  },

  async rmdir (url, opts = {}) {
    var {archive, filepath, version} = await lookupArchive(url, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    await assertWritePermission(archive, this.sender)
    await assertUnprotectedFilePath(filepath, this.sender)
    return pda.rmdir(archive.stagingFS, filepath, opts)
  },

  async createFileActivityStream (url, pathPattern) {
    var {archive} = await lookupArchive(url)
    if (archive.staging) {
      return pda.createFileActivityStream(archive, archive.stagingFS, pathPattern)
    } else {
      return pda.createFileActivityStream(archive, pathPattern)
    }
  },

  async createNetworkActivityStream (url) {
    var {archive} = await lookupArchive(url)
    return pda.createNetworkActivityStream(archive)
  },

  async importFromFilesystem (opts) {
    assertTmpBeakerOnly(this.sender)
    var {archive, filepath, version} = await lookupArchive(opts.dst, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportFilesystemToArchive({
      srcPath: opts.src,
      dstArchive: archive.stagingFS,
      dstPath: filepath,
      ignore: opts.ignore,
      dryRun: opts.dryRun,
      inplaceImport: opts.inplaceImport !== false
    })
  },

  async exportToFilesystem (opts) {
    assertTmpBeakerOnly(this.sender)

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

    var {archive, filepath} = await lookupArchive(opts.src, opts)
    return pda.exportArchiveToFilesystem({
      srcArchive: archive.checkoutFS,
      srcPath: filepath,
      dstPath: opts.dst,
      ignore: opts.ignore,
      overwriteExisting: opts.overwriteExisting,
      skipUndownloadedFiles: opts.skipUndownloadedFiles !== false
    })
  },

  async exportToArchive (opts) {
    assertTmpBeakerOnly(this.sender)
    var src = await lookupArchive(opts.src, opts)
    var dst = await lookupArchive(opts.dst, opts)
    if (dst.version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportArchiveToArchive({
      srcArchive: src.archive.checkoutFS,
      srcPath: src.filepath,
      dstArchive: dst.archive.stagingFS,
      dstPath: dst.filepath,
      ignore: opts.ignore,
      skipUndownloadedFiles: opts.skipUndownloadedFiles !== false
    })
  },

  async resolveName (name) {
    return datDns.resolveName(name)
  },

  async selectArchive ({title, buttonLabel, filters} = {}) {
    // initiate the modal
    var win = getWebContentsWindow(this.sender)
    // DISABLED
    // this mechanism is a bit too temperamental
    // are we sure it's the best policy anyway?
    // -prf
    // await assertSenderIsFocused(this.sender)
    var res = await showModal(win, 'select-archive', {title, buttonLabel, filters})
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  }
}

// internal helpers
// =

// helper to check if filepath refers to a file that userland is not allowed to edit directly
function assertUnprotectedFilePath (filepath, sender) {
  if (sender.getURL().startsWith('beaker:')) {
    return // can write any file
  }
  if (filepath === '/' + DAT_MANIFEST_FILENAME) {
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
  if (!archive.writable) {
    throw new ArchiveNotWritableError()
  }

  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }

  // self-modification ALWAYS allowed
  var senderDatKey = await lookupUrlDatKey(sender.getURL())
  if (senderDatKey === archiveKey) {
    return true
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
  // beaker: always allowed
  if (senderOrigin.startsWith('beaker:')) {
    return
  }

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
  await assertValidPath(filepath)
}

async function assertValidPath (fileOrFolderPath) {
  if (!DAT_VALID_PATH_REGEX.test(fileOrFolderPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
}

// async function assertSenderIsFocused (sender) {
//   if (!sender.isFocused()) {
//     throw new UserDeniedError('Application must be focused to spawn a prompt')
//   }
// }

async function parseUrlParts (url) {
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
      urlp.host = await datDns.resolveName(url)
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
async function lookupArchive (url, opts = {}) {
  return timer(to(opts), async (checkin) => {
    checkin('searching for archive')

    // lookup the archive
    var {archiveKey, filepath, version} = await parseUrlParts(url)
    var archive = datLibrary.getArchive(archiveKey)
    if (!archive) archive = await datLibrary.loadArchive(archiveKey)

    // set checkoutFS according to the version requested
    if (version) {
      checkin('checking out a previous version from history')
      archive.checkoutFS = archive.checkout(+version)
    } else {
      archive.checkoutFS = archive.stagingFS
    }

    return {archive, filepath, version}
  })
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

function massageHistoryObj ({name, version, type}) {
  return {path: name, version, type}
}
