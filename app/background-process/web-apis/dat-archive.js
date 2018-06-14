import path from 'path'
import fs from 'fs'
import parseDatURL from 'parse-dat-url'
import pda from 'pauls-dat-api'
import concat from 'concat-stream'
import pick from 'lodash.pick'
import datDns from '../networks/dat/dns'
import * as datLibrary from '../networks/dat/library'
import * as archivesDb from '../dbs/archives'
// import {getProfileRecord, getAPI as getProfilesAPI} from '../ingests/profiles' TODO(profiles) disabled -prf
import {showShellModal} from '../ui/modals'
import {timer} from '../../lib/time'
import {getWebContentsWindow} from '../../lib/electron'
import {checkFolderIsEmpty} from '../../lib/bg/fs'
import {getPermissions} from '../dbs/sitedata'
import {queryPermission, grantPermission, requestPermission} from '../ui/permissions'
import {
  DAT_MANIFEST_FILENAME,
  DAT_CONFIGURABLE_FIELDS,
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
  async createArchive ({title, description, type, networked, links, template, prompt} = {}) {
    var newArchiveUrl

    // only allow type, networked, and template to be set by beaker, for now
    if (!this.sender.getURL().startsWith('beaker:')) {
      type = networked = template = undefined
    }

    if (prompt !== false) {
      // run the creation modal
      let res
      try {
        res = await showShellModal(this.sender, 'create-archive', {title, description, type, networked, links})
      } catch (e) {
        if (e.name !== 'Error') {
          throw e // only rethrow if a specific error
        }
      }
      if (!res || !res.url) throw new UserDeniedError()
      newArchiveUrl = res.url
    } else {
      // no modal, ask for permission
      await assertCreateArchivePermission(this.sender)

      // create
      let author = await getAuthor()
      newArchiveUrl = await datLibrary.createNewArchive({title, description, type, author, links}, {networked})
    }
    let newArchiveKey = await lookupUrlDatKey(newArchiveUrl)

    // apply the template
    if (template) {
      try {
        let archive = datLibrary.getArchive(newArchiveKey)
        let templatePath = path.join(__dirname, 'assets', 'templates', template)
        await pda.exportFilesystemToArchive({
          srcPath: templatePath,
          dstArchive: archive,
          dstPath: '/',
          inplaceImport: true
        })
      } catch (e) {
        console.error('Failed to import template', e)
      }
    }

    // grant write permissions to the creating app
    grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return newArchiveUrl
  },

  async forkArchive (url, {title, description, type, networked, links, prompt} = {}) {
    var newArchiveUrl

    // only allow type and networked to be set by beaker, for now
    if (!this.sender.getURL().startsWith('beaker:')) {
      type = networked = undefined
    }

    if (prompt !== false) {
      // run the fork modal
      let key1 = await lookupUrlDatKey(url)
      let key2 = await lookupUrlDatKey(this.sender.getURL())
      let isSelfFork = key1 === key2
      let res
      try {
        res = await showShellModal(this.sender, 'fork-archive', {url, title, description, type, networked, links, isSelfFork})
      } catch (e) {
        if (e.name !== 'Error') {
          throw e // only rethrow if a specific error
        }
      }
      if (!res || !res.url) throw new UserDeniedError()
      newArchiveUrl = res.url
    } else {
      // no modal, ask for permission
      await assertCreateArchivePermission(this.sender)

      // create
      let author = await getAuthor()
      newArchiveUrl = await datLibrary.forkArchive(url, {title, description, type, author, links}, {networked})
    }

    // grant write permissions to the creating app
    let newArchiveKey = await lookupUrlDatKey(newArchiveUrl)
    grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return newArchiveUrl
  },

  async unlinkArchive (url) {
    var {archive} = await lookupArchive(url)
    await assertDeleteArchivePermission(archive, this.sender)
    await assertArchiveDeletable(archive)
    await archivesDb.setUserSettings(0, archive.key, {isSaved: false})
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

      // request from beaker internal sites: give all data
      if (this.sender.getURL().startsWith('beaker:')) {
        // check that the local sync path is valid
        if (info && info.userSettings.localSyncPath) {
          const stat = await new Promise(resolve => {
            fs.stat(info.userSettings.localSyncPath, (err, st) => resolve(st))
          })
          if (!stat || !stat.isDirectory()) {
            info.localSyncPathIsMissing = true
            info.missingLocalSyncPath = info.userSettings.localSyncPath // store on other attr
            info.userSettings.localSyncPath = undefined // unset to avoid accidents
          }
        }
        return info
      }

      // request from userland: return a subset of the data
      return {
        key: info.key,
        url: info.url,
        isOwner: info.isOwner,
        // networked: info.userSettings.networked,

        // state
        version: info.version,
        peers: info.peers,
        mtime: info.mtime,
        size: info.size,

        // manifest
        title: info.title,
        description: info.description,
        // type: info.type
        links: info.links
      }
    })
  },

  async configure (url, settings, opts) {
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')

      var {archive, version} = await lookupArchive(url, opts)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (!settings || typeof settings !== 'object') throw new Error('Invalid argument')

      // handle 'networked' specially
      // also, only allow beaker to set 'networked' for now
      if (('networked' in settings) && this.sender.getURL().startsWith('beaker:')) {
        if (settings.networked === false) {
          await assertArchiveOfflineable(archive)
        }
        await archivesDb.setUserSettings(0, archive.key, {networked: settings.networked, expiresAt: 0})
      }

      // manifest updates
      let manifestUpdates = pick(settings, DAT_CONFIGURABLE_FIELDS)
      if (Object.keys(manifestUpdates).length === 0) {
        // no manifest updates
        return
      }

      pause() // dont count against timeout, there may be user prompts
      var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      await assertQuotaPermission(archive, senderOrigin, Buffer.byteLength(JSON.stringify(settings), 'utf8'))
      resume()

      checkin('updating archive')
      await pda.updateManifest(archive, manifestUpdates)
      await datLibrary.pullLatestArchiveMeta(archive)
    })
  },

  async history (url, opts = {}) {
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')

      var reverse = opts.reverse === true
      var {start, end} = opts
      var {archive, checkoutFS} = await lookupArchive(url, opts)

      checkin('reading history')

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
        var stream = checkoutFS.history({live: false, start, end})
        stream.pipe(concat({encoding: 'object'}, values => {
          values = values.map(massageHistoryObj)
          if (reverse) values.reverse()
          resolve(values)
        }))
        stream.on('error', reject)
      })
    })
  },

  async stat (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {checkoutFS} = await lookupArchive(url, opts)
      checkin('stating file')
      return pda.stat(checkoutFS, filepath)
    })
  },

  async readFile (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {checkoutFS} = await lookupArchive(url, opts)
      checkin('reading file')
      return pda.readFile(checkoutFS, filepath, opts)
    })
  },

  async writeFile (url, filepath, data, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {archive, version} = await lookupArchive(url, opts)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      const sourceSize = Buffer.byteLength(data, opts.encoding)
      await assertQuotaPermission(archive, senderOrigin, sourceSize)
      assertValidFilePath(filepath)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('writing file')
      return pda.writeFile(archive, filepath, data, opts)
    })
  },

  async unlink (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {archive, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('deleting file')
      return pda.unlink(archive, filepath)
    })
  },

  async copy (url, filepath, dstpath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive} = await lookupArchive(url)

      pause() // dont count against timeout, there may be user prompts
      const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(dstpath, this.sender)
      const sourceSize = await pda.readSize(archive, filepath)
      await assertQuotaPermission(archive, senderOrigin, sourceSize)
      resume()

      checkin('copying file')
      return pda.copy(archive, filepath, dstpath)
    })
  },

  async rename (url, filepath, dstpath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive} = await lookupArchive(url)

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertValidFilePath(dstpath)
      assertUnprotectedFilePath(filepath, this.sender)
      assertUnprotectedFilePath(dstpath, this.sender)
      resume()

      checkin('renaming file')
      return pda.rename(archive, filepath, dstpath)
    })
  },

  async download (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, version} = await lookupArchive(url)
      if (version) throw new Error('Not yet supported: can\'t download() old versions yet. Sorry!') // TODO
      if (archive.writable) {
        return // no need to download
      }

      checkin('downloading file')
      return pda.download(archive, filepath)
    })
  },

  async readdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {checkoutFS} = await lookupArchive(url, opts)

      checkin('reading directory')
      var names = await pda.readdir(checkoutFS, filepath, opts)
      if (opts.stat) {
        for (let i = 0; i < names.length; i++) {
          names[i] = {
            name: names[i],
            stat: await pda.stat(checkoutFS, path.join(filepath, names[i]))
          }
        }
      }
      return names
    })
  },

  async mkdir (url, filepath, opts) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, version} = await lookupArchive(url)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      await assertValidPath(filepath)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('making directory')
      return pda.mkdir(archive, filepath)
    })
  },

  async rmdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, version} = await lookupArchive(url, opts)
      if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('removing directory')
      return pda.rmdir(archive, filepath, opts)
    })
  },

  async watch (url, pathPattern) {
    var {archive} = await lookupArchive(url)
    return pda.watch(archive, pathPattern)
  },

  async createNetworkActivityStream (url) {
    var {archive} = await lookupArchive(url)
    return pda.createNetworkActivityStream(archive)
  },

  async resolveName (name) {
    if (DAT_HASH_REGEX.test(name)) return name
    return datDns.resolveName(name)
  },

  async selectArchive ({title, buttonLabel, filters} = {}) {
    // initiate the modal
    var res
    try {
      res = await showShellModal(this.sender, 'select-archive', {title, buttonLabel, filters})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  async diff (srcUrl, dstUrl, opts) {
    assertTmpBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of diff() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of diff() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupArchive(srcUrl), lookupArchive(dstUrl)])
    return pda.diff(src.archive, src.filepath, dst.archive, dst.filepath, opts)
  },

  async merge (srcUrl, dstUrl, opts) {
    assertTmpBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of merge() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of merge() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupArchive(srcUrl), lookupArchive(dstUrl)])
    if (!dst.archive.writable) throw new ArchiveNotWritableError('The destination archive is not writable')
    if (dst.version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.merge(src.archive, src.filepath, dst.archive, dst.filepath, opts)
  },

  async importFromFilesystem (opts) {
    assertTmpBeakerOnly(this.sender)
    var {archive, filepath, version} = await lookupArchive(opts.dst, opts)
    if (version) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportFilesystemToArchive({
      srcPath: opts.src,
      dstArchive: archive,
      dstPath: filepath,
      ignore: opts.ignore,
      inplaceImport: opts.inplaceImport !== false
    })
  },

  async exportToFilesystem (opts) {
    assertTmpBeakerOnly(this.sender)

    if (await checkFolderIsEmpty(opts.dst) === false) {
      return
    }

    var {checkoutFS, filepath} = await lookupArchive(opts.src, opts)
    return pda.exportArchiveToFilesystem({
      srcArchive: checkoutFS,
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
      srcArchive: src.checkoutFS,
      srcPath: src.filepath,
      dstArchive: dst.archive,
      dstPath: dst.filepath,
      ignore: opts.ignore,
      skipUndownloadedFiles: opts.skipUndownloadedFiles !== false
    })
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

async function assertCreateArchivePermission (sender) {
  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }

  // ask the user
  let allowed = await requestPermission('createDat', sender)
  if (!allowed) {
    throw new UserDeniedError()
  }
}

async function assertWritePermission (archive, sender) {
  var archiveKey = archive.key.toString('hex')
  var details = await datLibrary.getArchiveInfo(archiveKey)
  const perm = ('modifyDat:' + archiveKey)

  // ensure we have the archive's private key
  if (!archive.writable) {
    throw new ArchiveNotWritableError()
  }

  // ensure we havent deleted the archive
  if (!details.userSettings.isSaved) {
    throw new ArchiveNotWritableError('This archive has been deleted. Restore it to continue making changes.')
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
  allowed = await requestPermission(perm, sender, { title: details.title })
  if (!allowed) throw new UserDeniedError()
  return true
}

async function assertDeleteArchivePermission (archive, sender) {
  var archiveKey = archive.key.toString('hex')
  const perm = ('deleteDat:' + archiveKey)

  // beaker: always allowed
  if (sender.getURL().startsWith('beaker:')) {
    return true
  }

  // ask the user
  var details = await datLibrary.getArchiveInfo(archiveKey)
  var allowed = await requestPermission(perm, sender, { title: details.title })
  if (!allowed) throw new UserDeniedError()
  return true
}

async function assertArchiveOfflineable (archive) {
  // TODO(profiles) disabled -prf
  // var profileRecord = await getProfileRecord(0)
  // if ('dat://' + archive.key.toString('hex') === profileRecord.url) {
  //   throw new PermissionsError('Unable to set the user archive to offline.')
  // }
}

async function assertArchiveDeletable (archive) {
  // TODO(profiles) disabled -prf
  // var profileRecord = await getProfileRecord(0)
  // if ('dat://' + archive.key.toString('hex') === profileRecord.url) {
  //   throw new PermissionsError('Unable to delete the user archive.')
  // }
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

  // update the archive size
  await datLibrary.updateSizeTracking(archive)

  // check the new size
  var newSize = (archive.size + byteLength)
  if (newSize > bytesAllowed) {
    throw new QuotaExceededError()
  }
}

function assertValidFilePath (filepath) {
  if (filepath.slice(-1) === '/') {
    throw new InvalidPathError('Files can not have a trailing slash')
  }
  assertValidPath(filepath)
}

function assertValidPath (fileOrFolderPath) {
  if (!DAT_VALID_PATH_REGEX.test(fileOrFolderPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
}

// async function assertSenderIsFocused (sender) {
//   if (!sender.isFocused()) {
//     throw new UserDeniedError('Application must be focused to spawn a prompt')
//   }
// }

async function getAuthor () {
  return undefined
  // TODO(profiles) disabled -prf
  // var profileRecord = await getProfileRecord(0)
  // if (!profileRecord || !profileRecord.url) return undefined
  // var profile = await getProfilesAPI().getProfile(profileRecord.url)
  // return {
  //   url: profileRecord.url,
  //   name: profile && profile.name ? profile.name : undefined
  // }
}

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
    filepath = decodeURIComponent(urlp.pathname || '') || '/'
    version = urlp.version
  }
  return {archiveKey, filepath, version}
}

function normalizeFilepath (str) {
  str = decodeURIComponent(str)
  if (str.charAt(0) !== '/') {
    str = '/' + str
  }
  return str
}

// helper to handle the URL argument that's given to most args
// - can get a dat hash, or dat url
// - returns {archive, filepath, version}
// - sets archive.checkoutFS to what's requested by version
// - throws if the filepath is invalid
async function lookupArchive (url, opts = {}) {
  // lookup the archive
  var {archiveKey, filepath, version} = await parseUrlParts(url)
  var archive = datLibrary.getArchive(archiveKey)
  if (!archive) archive = await datLibrary.loadArchive(archiveKey)

  // set checkoutFS according to the version requested
  var checkoutFS = (version)
    ? archive.checkout(+version, {metadataStorageCacheSize: 0, contentStorageCacheSize: 0, treeCacheSize: 0})
    : archive

  return {archive, filepath, version, checkoutFS}
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

