import path from 'path'
import parseDatURL from 'parse-dat-url'
import pda from 'pauls-dat-api2'
import concat from 'concat-stream'
import pick from 'lodash.pick'
import _get from 'lodash.get'
import * as modals from '../../ui/subwindows/modals'
import * as permissions from '../../ui/permissions'
import datDns from '../../dat/dns'
import * as datArchives from '../../dat/archives'
import * as archivesDb from '../../dbs/archives'
import { timer } from '../../../lib/time'
import * as filesystem from '../../filesystem/index'
import * as users from '../../filesystem/users'
import * as windows from '../../ui/windows'
import { DAT_MANIFEST_FILENAME, DAT_CONFIGURABLE_FIELDS, DAT_HASH_REGEX, DAT_QUOTA_DEFAULT_BYTES_ALLOWED, DAT_VALID_PATH_REGEX, DEFAULT_DAT_API_TIMEOUT } from '../../../lib/const'
import { PermissionsError, UserDeniedError, QuotaExceededError, ArchiveNotWritableError, InvalidURLError, ProtectedFileNotWritableError, InvalidPathError } from 'beaker-error-constants'

// exported api
// =

const to = (opts) =>
  (opts && typeof opts.timeout !== 'undefined')
    ? opts.timeout
    : DEFAULT_DAT_API_TIMEOUT

export default {
  async createArchive ({title, description, type, author, visibility, links, template, prompt} = {}) {
    var newArchiveUrl

    // only allow these vars to be set by beaker, for now
    if (!this.sender.getURL().startsWith('beaker:')) {
      visibility = template = undefined
      author = _get(windows.getUserSessionFor(this.sender), 'url')
    }

    if (prompt !== false) {
      // run the creation modal
      let res
      try {
        res = await modals.create(this.sender, 'create-archive', {title, description, type, author, visibility, links})
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
      try {
        var newArchive = await datArchives.createNewArchive({title, description, type, author, links})
        await filesystem.addToLibrary(newArchive.url, title)
      } catch (e) {
        console.log(e)
        throw e
      }
      newArchiveUrl = newArchive.url
    }
    let newArchiveKey = await lookupUrlDatKey(newArchiveUrl)

    // apply the template
    if (template) {
      try {
        let archive = datArchives.getArchive(newArchiveKey)
        let templatePath = path.join(__dirname, 'assets', 'templates', template)
        await pda.exportFilesystemToArchive({
          srcPath: templatePath,
          dstArchive: archive.session.drive,
          dstPath: '/',
          inplaceImport: true
        })
      } catch (e) {
        console.error('Failed to import template', e)
      }
    }

    // grant write permissions to the creating app
    permissions.grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return newArchiveUrl
  },

  async forkArchive (url, {title, description, type, author, visibility, links, prompt} = {}) {
    var newArchiveUrl

    // only allow these vars to be set by beaker, for now
    if (!this.sender.getURL().startsWith('beaker:')) {
      visibility = undefined
      author = _get(windows.getUserSessionFor(this.sender), 'url')
    }

    if (prompt !== false) {
      // run the fork modal
      let key1 = await lookupUrlDatKey(url)
      let key2 = await lookupUrlDatKey(this.sender.getURL())
      let isSelfFork = key1 === key2
      let res
      try {
        res = await modals.create(this.sender, 'fork-archive', {url, title, description, type, author, visibility, links, isSelfFork})
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
      let key = await lookupUrlDatKey(url)
      let newArchive = await datArchives.forkArchive(key, {title, description, type, author, links})
      await filesystem.addToLibrary(newArchive.url, title)
      newArchiveUrl = newArchive.url
    }

    // grant write permissions to the creating app
    let newArchiveKey = await lookupUrlDatKey(newArchiveUrl)
    permissions.grantPermission('modifyDat:' + newArchiveKey, this.sender.getURL())
    return newArchiveUrl
  },

  async loadArchive (url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    url = await datDns.resolveName(url)
    await datArchives.getOrLoadArchive(url)
    return Promise.resolve(true)
  },

  async getInfo (url, opts = {}) {
    return timer(to(opts), async () => {
      var info = await datArchives.getArchiveInfo(url)

      // request from beaker internal sites: give all data
      if (this.sender.getURL().startsWith('beaker:')) {
        return info
      }

      // request from userland: return a subset of the data
      return {
        key: info.key,
        url: info.url,
        domain: info.domain,
        writable: info.writable,
        // networked: info.userSettings.networked,

        // state
        version: info.version,
        peers: info.peers,
        mtime: info.mtime,
        size: info.size,

        // manifest
        title: info.title,
        description: info.description,
        type: info.type,
        links: info.links
      }
    })
  },

  async configure (url, settings, opts) {
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')

      var {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url, opts)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
      if (!settings || typeof settings !== 'object') throw new Error('Invalid argument')

      // handle 'visibility' specially
      // also, only allow beaker to set 'visibility' for now
      if (('visibility' in settings) && this.sender.getURL().startsWith('beaker:')) {
        // TODO uwg await datLibrary.configureArchive(archive, {visibility: settings.visibility})
      }

      // only allow beaker to set these manifest updates for now
      if (!this.sender.getURL().startsWith('beaker:')) {
        delete settings.author
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
      await checkoutFS.pda.updateManifest(manifestUpdates)
      await datArchives.pullLatestArchiveMeta(archive)
    })
  },

  async history (url, opts = {}) {
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')

      var reverse = opts.reverse === true
      var {start, end} = opts
      var {archive, checkoutFS} = await lookupArchive(this.sender, url, opts)
      var archiveInfo = await archive.getInfo()

      checkin('reading history')

      // if reversing the output, modify start/end
      start = start || 0
      end = end || (archiveInfo.version + 1)
      if (reverse) {
        // swap values
        let t = start
        start = end
        end = t
        // start from the end
        start = (archiveInfo.version + 1) - start
        end = (archiveInfo.version + 1) - end
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
      const {checkoutFS} = await lookupArchive(this.sender, url, opts)
      checkin('stating file')
      return checkoutFS.pda.stat(filepath)
    })
  },

  async readFile (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {checkoutFS} = await lookupArchive(this.sender, url, opts)
      checkin('reading file')
      return checkoutFS.pda.readFile(filepath, opts)
    })
  },

  async writeFile (url, filepath, data, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url, opts)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      const sourceSize = Buffer.byteLength(data, opts.encoding)
      await assertQuotaPermission(archive, senderOrigin, sourceSize)
      assertValidFilePath(filepath)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('writing file')
      return checkoutFS.pda.writeFile(filepath, data, opts)
    })
  },

  async unlink (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('looking up archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('deleting file')
      return checkoutFS.pda.unlink(filepath)
    })
  },

  async copy (url, filepath, dstpath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS} = await lookupArchive(this.sender, url)

      pause() // dont count against timeout, there may be user prompts
      const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(dstpath, this.sender)
      const sourceSize = await archive.pda.readSize(filepath)
      await assertQuotaPermission(archive, senderOrigin, sourceSize)
      resume()

      checkin('copying file')
      return checkoutFS.pda.copy(filepath, dstpath)
    })
  },

  async rename (url, filepath, dstpath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS} = await lookupArchive(this.sender, url)

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertValidFilePath(dstpath)
      assertUnprotectedFilePath(filepath, this.sender)
      assertUnprotectedFilePath(dstpath, this.sender)
      resume()

      checkin('renaming file')
      return checkoutFS.pda.rename(filepath, dstpath)
    })
  },

  async download (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, version} = await lookupArchive(this.sender, url)
      if (version) throw new Error('Not yet supported: can\'t download() old versions yet. Sorry!') // TODO
      if (archive.writable) {
        return // no need to download
      }

      checkin('downloading file')
      await archive.pda.download(filepath)
    })
  },

  async readdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {checkoutFS} = await lookupArchive(this.sender, url, opts)

      checkin('reading directory')
      var names = await checkoutFS.pda.readdir(filepath, opts)
      if (opts.stat) {
        for (let i = 0; i < names.length; i++) {
          names[i] = {
            name: names[i],
            stat: await checkoutFS.pda.stat(path.join(filepath, names[i]))
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
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      await assertValidPath(filepath)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('making directory')
      return checkoutFS.pda.mkdir(filepath)
    })
  },

  async rmdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url, opts)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('removing directory')
      return checkoutFS.pda.rmdir(filepath, opts)
    })
  },

  async symlink (url, target, linkname, opts) {
    target = normalizeFilepath(target || '')
    linkname = normalizeFilepath(linkname || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      await assertValidPath(linkname)
      assertUnprotectedFilePath(linkname, this.sender)
      resume()

      checkin('symlinking')
      return checkoutFS.pda.symlink(target, linkname)
    })
  },

  async mount (url, filepath, opts) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      await assertValidPath(filepath)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('mounting archive')
      return checkoutFS.pda.mount(filepath, opts)
    })
  },

  async unmount (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return timer(to(opts), async (checkin, pause, resume) => {
      checkin('searching for archive')
      const {archive, checkoutFS, isHistoric} = await lookupArchive(this.sender, url, opts)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

      pause() // dont count against timeout, there may be user prompts
      await assertWritePermission(archive, this.sender)
      assertUnprotectedFilePath(filepath, this.sender)
      resume()

      checkin('unmounting archive')
      return checkoutFS.pda.unmount(filepath)
    })
  },

  async watch (url, pathPattern) {
    var {archive} = await lookupArchive(this.sender, url)
    return archive.pda.watch(pathPattern)
  },

  async createNetworkActivityStream (url) {
    var {archive} = await lookupArchive(this.sender, url)
    return archive.pda.createNetworkActivityStream()
  },

  async resolveName (name) {
    if (DAT_HASH_REGEX.test(name)) return name
    return datDns.resolveName(name)
  },

  async selectArchive ({title, buttonLabel, filters} = {}) {
    // initiate the modal
    var res
    try {
      res = await modals.create(this.sender, 'select-archive', {title, buttonLabel, filters})
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  async diff (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of diff() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of diff() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupArchive(this.sender, srcUrl), lookupArchive(this.sender, dstUrl)])
    return pda.diff(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async merge (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of merge() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of merge() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupArchive(this.sender, srcUrl), lookupArchive(this.sender, dstUrl)])
    if (!dst.archive.writable) throw new ArchiveNotWritableError('The destination archive is not writable')
    if (dst.isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.merge(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async importFromFilesystem (opts) {
    assertBeakerOnly(this.sender)
    var {checkoutFS, filepath, isHistoric} = await lookupArchive(this.sender, opts.dst, opts)
    if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportFilesystemToArchive({
      srcPath: opts.src,
      dstArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
      dstPath: filepath,
      ignore: opts.ignore,
      inplaceImport: opts.inplaceImport !== false,
      dryRun: opts.dryRun
    })
  },

  async exportToFilesystem (opts) {
    assertBeakerOnly(this.sender)

    // TODO do we need to replace this? -prf
    // if (await checkFolderIsEmpty(opts.dst) === false) {
    // return
    // }

    var {checkoutFS, filepath} = await lookupArchive(this.sender, opts.src, opts)
    return pda.exportArchiveToFilesystem({
      srcArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
      srcPath: filepath,
      dstPath: opts.dst,
      ignore: opts.ignore,
      overwriteExisting: opts.overwriteExisting,
      skipUndownloadedFiles: opts.skipUndownloadedFiles !== false
    })
  },

  async exportToArchive (opts) {
    assertBeakerOnly(this.sender)
    var src = await lookupArchive(this.sender, opts.src, opts)
    var dst = await lookupArchive(this.sender, opts.dst, opts)
    if (dst.isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportArchiveToArchive({
      srcArchive: src.checkoutFS.session ? src.checkoutFS.session.drive : src.checkoutFS,
      srcPath: src.filepath,
      dstArchive: dst.checkoutFS.session ? dst.checkoutFS.session.drive : dst.checkoutFS,
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
function assertBeakerOnly (sender) {
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
  let allowed = await permissions.requestPermission('createDat', sender)
  if (!allowed) {
    throw new UserDeniedError()
  }
}

async function assertWritePermission (archive, sender) {
  var archiveKey = archive.key.toString('hex')
  var details = await datArchives.getArchiveInfo(archiveKey)
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
  var allowed = await permissions.queryPermission(perm, sender)
  if (allowed) return true

  // ask the user
  allowed = await permissions.requestPermission(perm, sender, { title: details.title })
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
  var details = await datArchives.getArchiveInfo(archiveKey)
  var allowed = await permissions.requestPermission(perm, sender, { title: details.title })
  if (!allowed) throw new UserDeniedError()
  return true
}

function assertArchiveDeletable (archive) {
  var archiveUrl = 'dat://' + archive.key.toString('hex')
  if (users.isUser(archiveUrl)) {
    throw new PermissionsError('Unable to delete the user profile.')
  }
}

async function assertQuotaPermission (archive, senderOrigin, byteLength) {
  // beaker: always allowed
  if (senderOrigin.startsWith('beaker:')) {
    return
  }

  // fetch the archive meta
  const meta = await archivesDb.getMeta(archive.key)

  // fallback to default quota
  var bytesAllowed = /* TODO userSettings.bytesAllowed ||*/ DAT_QUOTA_DEFAULT_BYTES_ALLOWED

  // check the new size
  var newSize = (meta.size + byteLength)
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
// - sets checkoutFS to what's requested by version
// - throws if the filepath is invalid
async function lookupArchive (sender, url, opts = {}) {
  // lookup the archive
  var {archiveKey, filepath, version} = await parseUrlParts(url)
  var archive = datArchives.getArchive(archiveKey)
  if (!archive) archive = await datArchives.loadArchive(archiveKey)

  // get specific checkout
  var {checkoutFS, isHistoric} = await datArchives.getArchiveCheckout(archive, version)

  return {archive, filepath, version, isHistoric, checkoutFS}
}

async function lookupUrlDatKey (url) {
  if (DAT_HASH_REGEX.test(url)) return url
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
