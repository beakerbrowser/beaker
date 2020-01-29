import path from 'path'
import { parseDriveUrl } from '../../../lib/urls'
import pda from 'pauls-dat-api2'
import concat from 'concat-stream'
import pick from 'lodash.pick'
import _get from 'lodash.get'
import * as modals from '../../ui/subwindows/modals'
import * as permissions from '../../ui/permissions'
import hyperDns from '../../hyper/dns'
import * as drives from '../../hyper/drives'
import * as archivesDb from '../../dbs/archives'
import * as auditLog from '../../dbs/audit-log'
import { timer } from '../../../lib/time'
import * as filesystem from '../../filesystem/index'
import { query } from '../../filesystem/query'
import * as users from '../../filesystem/users'
import * as windows from '../../ui/windows'
import { DRIVE_MANIFEST_FILENAME, DRIVE_CONFIGURABLE_FIELDS, HYPERDRIVE_HASH_REGEX, DAT_QUOTA_DEFAULT_BYTES_ALLOWED, DRIVE_VALID_PATH_REGEX, DEFAULT_DRIVE_API_TIMEOUT } from '../../../lib/const'
import { PermissionsError, UserDeniedError, QuotaExceededError, ArchiveNotWritableError, InvalidURLError, ProtectedFileNotWritableError, InvalidPathError } from 'beaker-error-constants'

// exported api
// =

const isSenderBeaker = (sender) => /^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/.test(sender.getURL())

const to = (opts) =>
  (opts && typeof opts.timeout !== 'undefined')
    ? opts.timeout
    : DEFAULT_DRIVE_API_TIMEOUT

export default {
  async createDrive ({title, description, type, author, visibility, links, theme, prompt} = {}) {
    var newDriveUrl

    // only allow these vars to be set by beaker, for now
    if (!isSenderBeaker(this.sender)) {
      visibility = theme = undefined
      author = _get(windows.getUserSessionFor(this.sender), 'url')
    }

    if (prompt !== false) {
      // run the creation modal
      let res
      try {
        res = await modals.create(this.sender, 'create-drive', {title, description, type, author, visibility, links})
      } catch (e) {
        if (e.name !== 'Error') {
          throw e // only rethrow if a specific error
        }
      }
      if (!res || !res.url) throw new UserDeniedError()
      newDriveUrl = res.url
    } else {
      // no modal, ask for permission
      await assertCreateDrivePermission(this.sender)

      // create
      let newDrive
      try {
        let manifest = {title, description, type, author, links}
        if (type === 'theme') {
          manifest.theme = {drive_types: ['website']}
        }
        newDrive = await drives.createNewDrive(manifest)
        await filesystem.configDrive(newDrive.url, {seeding: true})
      } catch (e) {
        console.log(e)
        throw e
      }
      newDriveUrl = newDrive.url
    }
    let newDriveKey = await lookupUrlDriveKey(newDriveUrl)

    if (theme) {
      await setTheme(drives.getDrive(newDriveKey), theme)
    }

    if (!isSenderBeaker(this.sender)) {
      // grant write permissions to the creating app
      permissions.grantPermission('modifyDat:' + newDriveKey, this.sender.getURL())
    }
    return newDriveUrl
  },

  async cloneDrive (url, {title, description, type, author, visibility, links, prompt} = {}) {
    var newDriveUrl

    // only allow these vars to be set by beaker, for now
    if (!isSenderBeaker(this.sender)) {
      visibility = undefined
      author = _get(windows.getUserSessionFor(this.sender), 'url')
    }

    if (prompt !== false) {
      // run the clone modal
      let key1 = await lookupUrlDriveKey(url)
      let key2 = await lookupUrlDriveKey(this.sender.getURL())
      let isSelfClone = key1 === key2
      let res
      try {
        res = await modals.create(this.sender, 'clone-drive', {url, title, description, type, author, visibility, links, isSelfClone})
      } catch (e) {
        if (e.name !== 'Error') {
          throw e // only rethrow if a specific error
        }
      }
      if (!res || !res.url) throw new UserDeniedError()
      newDriveUrl = res.url
    } else {
      // no modal, ask for permission
      await assertCreateDrivePermission(this.sender)

      // create
      let key = await lookupUrlDriveKey(url)
      let newDrive = await drives.cloneDrive(key, {title, description, type, author, links})
      await filesystem.configDrive(newDrive.url, {seeding: true})
      newDriveUrl = newDrive.url
    }

    if (!isSenderBeaker(this.sender)) {
      // grant write permissions to the creating app
      let newDriveKey = await lookupUrlDriveKey(newDriveUrl)
      permissions.grantPermission('modifyDat:' + newDriveKey, this.sender.getURL())
    }
    return newDriveUrl
  },

  async loadDrive (url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    url = await hyperDns.resolveName(url)
    await drives.getOrLoadDrive(url)
    return Promise.resolve(true)
  },

  async getInfo (url, opts = {}) {
    return auditLog.record(this.sender.getURL(), 'getInfo', {url}, undefined, () => (
      timer(to(opts), async () => {
        var info = await drives.getDriveInfo(url)

        // request from beaker internal sites: give all data
        if (isSenderBeaker(this.sender)) {
          return info
        }

        // request from userland: return a subset of the data
        return {
          key: info.key,
          url: info.url,
          // domain: info.domain, TODO
          writable: info.writable,

          // state
          version: info.version,
          peers: info.peers,

          // manifest
          title: info.title,
          description: info.description,
          type: info.type
        }
      })
    ))
  },

  async configure (url, settings, opts) {
    return auditLog.record(this.sender.getURL(), 'configure', {url, ...settings}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')

        var {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
        if (!settings || typeof settings !== 'object') throw new Error('Invalid argument')

        // handle 'visibility' specially
        // also, only allow beaker to set 'visibility' for now
        if (('visibility' in settings) && isSenderBeaker(this.sender)) {
          // TODO uwg await datLibrary.configureDrive(drive, {visibility: settings.visibility})
        }

        // only allow beaker to set these manifest updates for now
        if (!isSenderBeaker(this.sender)) {
          delete settings.author
        }

        // manifest updates
        let manifestUpdates = pick(settings, DRIVE_CONFIGURABLE_FIELDS)
        if (Object.keys(manifestUpdates).length === 0) {
          // no manifest updates
          return
        }

        pause() // dont count against timeout, there may be user prompts
        var senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
        await assertWritePermission(drive, this.sender)
        await assertQuotaPermission(drive, senderOrigin, Buffer.byteLength(JSON.stringify(settings), 'utf8'))
        resume()

        checkin('updating drive')
        await checkoutFS.pda.updateManifest(manifestUpdates)
        await drives.pullLatestDriveMeta(drive)

        var oldTheme = await getTheme(checkoutFS)
        if (settings.theme !== oldTheme) {
          await setTheme(drive, settings.theme)
        }
      })
    ))
  },

  async diff (url, other, prefix, opts = {}) {
    return auditLog.record(this.sender.getURL(), 'diff', {url, other, prefix}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, opts)
        checkin('diffing')
        return checkoutFS.pda.diff(other, prefix)
      })
    ))
  },

  async stat (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'stat', {url, filepath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, opts)
        checkin('stating file')
        return checkoutFS.pda.stat(filepath)
      })
    ))
  },

  async readFile (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'readFile', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, opts)
        checkin('reading file')
        return checkoutFS.pda.readFile(filepath, opts)
      })
    ))
  },

  async writeFile (url, filepath, data, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    const sourceSize = Buffer.byteLength(data, opts.encoding)
    return auditLog.record(this.sender.getURL(), 'writeFile', {url, filepath}, sourceSize, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
        await assertWritePermission(drive, this.sender)
        await assertQuotaPermission(drive, senderOrigin, sourceSize)
        assertValidFilePath(filepath)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('writing file')
        return checkoutFS.pda.writeFile(filepath, data, opts)
      })
    ))
  },

  async unlink (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'unlink', {url, filepath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('deleting file')
        return checkoutFS.pda.unlink(filepath)
      })
    ))
  },

  async copy (url, srcpath, dstpath, opts = {}) {
    srcpath = normalizeFilepath(srcpath || '')
    dstpath = normalizeFilepath(dstpath || '')
    const src = await lookupDrive(this.sender, srcpath.includes('://') ? srcpath : url)
    const sourceSize = await src.drive.pda.readSize(srcpath)
    return auditLog.record(this.sender.getURL(), 'copy', {url, srcpath, dstpath}, sourceSize, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')

        const dst = await lookupDrive(this.sender, dstpath.includes('://') ? dstpath : url)

        if (srcpath.includes('://')) srcpath = (new URL(srcpath)).pathname
        if (dstpath.includes('://')) dstpath = (new URL(dstpath)).pathname

        pause() // dont count against timeout, there may be user prompts
        const senderOrigin = archivesDb.extractOrigin(this.sender.getURL())
        await assertWritePermission(dst.drive, this.sender)
        assertUnprotectedFilePath(dstpath, this.sender)
        await assertQuotaPermission(dst.drive, senderOrigin, sourceSize)
        resume()

        checkin('copying')
        return src.checkoutFS.pda.copy(srcpath, dst.checkoutFS.session.drive, dstpath)
      })
    ))
  },

  async rename (url, srcpath, dstpath, opts = {}) {
    srcpath = normalizeFilepath(srcpath || '')
    dstpath = normalizeFilepath(dstpath || '')
    return auditLog.record(this.sender.getURL(), 'rename', {url, srcpath, dstpath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')

        const src = await lookupDrive(this.sender, srcpath.includes('://') ? srcpath : url)
        const dst = await lookupDrive(this.sender, dstpath.includes('://') ? dstpath : url)

        if (srcpath.includes('://')) srcpath = (new URL(srcpath)).pathname
        if (dstpath.includes('://')) dstpath = (new URL(dstpath)).pathname

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(dst.drive, this.sender)
        assertValidFilePath(dstpath)
        assertUnprotectedFilePath(srcpath, this.sender)
        assertUnprotectedFilePath(dstpath, this.sender)
        resume()

        checkin('renaming file')
        return src.checkoutFS.pda.rename(srcpath, dst.checkoutFS.session.drive, dstpath)
      })
    ))
  },

  async download (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'download', {url, filepath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, version} = await lookupDrive(this.sender, url)
        if (version) throw new Error('Not yet supported: can\'t download() old versions yet. Sorry!') // TODO
        if (drive.writable) {
          return // no need to download
        }

        checkin('downloading file')
        await drive.pda.download(filepath)
      })
    ))
  },

  async updateMetadata (url, filepath, metadata, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'updateMetadata', {url, filepath, metadata}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        assertValidPath(filepath)
        resume()

        checkin('updating metadata')
        return checkoutFS.pda.updateMetadata(filepath, metadata)
      })
    ))
  },

  async deleteMetadata (url, filepath, keys, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'deleteMetadata', {url, filepath, keys}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        assertValidPath(filepath)
        resume()

        checkin('updating metadata')
        return checkoutFS.pda.deleteMetadata(filepath, keys)
      })
    ))
  },

  async readdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'readdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, opts)

        checkin('reading directory')
        var names = await checkoutFS.pda.readdir(filepath, opts)
        if (opts.includeStats) {
          names = names.map(obj => ({name: obj.name, stat: obj.stat}))
        }
        return names
      })
    ))
  },

  async mkdir (url, filepath, opts) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'mkdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        await assertValidPath(filepath)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('making directory')
        return checkoutFS.pda.mkdir(filepath)
      })
    ))
  },

  async rmdir (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'rmdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('removing directory')
        return checkoutFS.pda.rmdir(filepath, opts)
      })
    ))
  },

  async symlink (url, target, linkname, opts) {
    target = normalizeFilepath(target || '')
    linkname = normalizeFilepath(linkname || '')
    return auditLog.record(this.sender.getURL(), 'symlink', {url, target, linkname}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        await assertValidPath(linkname)
        assertUnprotectedFilePath(linkname, this.sender)
        resume()

        checkin('symlinking')
        return checkoutFS.pda.symlink(target, linkname)
      })
    ))
  },

  async mount (url, filepath, mount, opts) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'mount', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        await assertValidPath(filepath)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('mounting drive')
        return checkoutFS.pda.mount(filepath, mount)
      })
    ))
  },

  async unmount (url, filepath, opts = {}) {
    filepath = normalizeFilepath(filepath || '')
    return auditLog.record(this.sender.getURL(), 'unmount', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, url, opts)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('unmounting drive')
        return checkoutFS.pda.unmount(filepath)
      })
    ))
  },

  async query (url, opts) {
    return auditLog.record(this.sender.getURL(), 'query', {url, ...opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, opts)
        checkin('running query')
        return query(checkoutFS, opts)
      })
    ))
  },

  async watch (url, pathPattern) {
    var {drive} = await lookupDrive(this.sender, url)
    return drive.pda.watch(pathPattern)
  },

  async createNetworkActivityStream (url) {
    var {drive} = await lookupDrive(this.sender, url)
    return drive.pda.createNetworkActivityStream()
  },

  async resolveName (name) {
    if (HYPERDRIVE_HASH_REGEX.test(name)) return name
    return hyperDns.resolveName(name)
  },

  async beakerDiff (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of diff() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of diff() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupDrive(this.sender, srcUrl), lookupDrive(this.sender, dstUrl)])
    return pda.diff(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async beakerMerge (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of merge() must be a dat URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of merge() must be a dat URL')
    }
    var [src, dst] = await Promise.all([lookupDrive(this.sender, srcUrl), lookupDrive(this.sender, dstUrl)])
    if (!dst.drive.writable) throw new ArchiveNotWritableError('The destination drive is not writable')
    if (dst.isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.merge(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async importFromFilesystem (opts) {
    assertBeakerOnly(this.sender)
    var {checkoutFS, filepath, isHistoric} = await lookupDrive(this.sender, opts.dst, opts)
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

    var {checkoutFS, filepath} = await lookupDrive(this.sender, opts.src, opts)
    return pda.exportArchiveToFilesystem({
      srcArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
      srcPath: filepath,
      dstPath: opts.dst,
      ignore: opts.ignore,
      overwriteExisting: opts.overwriteExisting,
      skipUndownloadedFiles: opts.skipUndownloadedFiles !== false
    })
  },

  async exportToDrive (opts) {
    assertBeakerOnly(this.sender)
    var src = await lookupDrive(this.sender, opts.src, opts)
    var dst = await lookupDrive(this.sender, opts.dst, opts)
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
  if (isSenderBeaker(sender)) {
    return // can write any file
  }
  if (filepath === '/' + DRIVE_MANIFEST_FILENAME) {
    throw new ProtectedFileNotWritableError()
  }
}

// temporary helper to make sure the call is made by a beaker: page
function assertBeakerOnly (sender) {
  if (!isSenderBeaker(sender)) {
    throw new PermissionsError()
  }
}

async function assertCreateDrivePermission (sender) {
  // beaker: always allowed
  if (isSenderBeaker(sender)) {
    return true
  }

  // ask the user
  let allowed = await permissions.requestPermission('createDat', sender)
  if (!allowed) {
    throw new UserDeniedError()
  }
}

async function assertWritePermission (drive, sender) {
  var newDriveKey = drive.key.toString('hex')
  var details = await drives.getDriveInfo(newDriveKey)
  const perm = ('modifyDat:' + newDriveKey)

  // ensure we have the drive's private key
  if (!drive.writable) {
    throw new ArchiveNotWritableError()
  }

  // beaker: always allowed
  if (isSenderBeaker(sender)) {
    return true
  }

  // self-modification ALWAYS allowed
  var senderDatKey = await lookupUrlDriveKey(sender.getURL())
  if (senderDatKey === newDriveKey) {
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

async function assertDeleteDrivePermission (drive, sender) {
  var driveKey = drive.key.toString('hex')
  const perm = ('deleteDat:' + driveKey)

  // beaker: always allowed
  if (isSenderBeaker(sender)) {
    return true
  }

  // ask the user
  var details = await drives.getDriveInfo(driveKey)
  var allowed = await permissions.requestPermission(perm, sender, { title: details.title })
  if (!allowed) throw new UserDeniedError()
  return true
}

function assertDriveDeletable (drive) {
  var driveUrl = 'hyper://' + drive.key.toString('hex')
  if (users.isUser(driveUrl)) {
    throw new PermissionsError('Unable to delete the user profile.')
  }
}

async function assertQuotaPermission (drive, senderOrigin, byteLength) {
  // beaker: always allowed
  if (senderOrigin.startsWith('beaker:')) {
    return
  }

  // fetch the drive meta
  const meta = await archivesDb.getMeta(drive.key)

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
  if (!DRIVE_VALID_PATH_REGEX.test(fileOrFolderPath)) {
    throw new InvalidPathError('Path contains invalid characters')
  }
}

// async function assertSenderIsFocused (sender) {
//   if (!sender.isFocused()) {
//     throw new UserDeniedError('Application must be focused to spawn a prompt')
//   }
// }

async function parseUrlParts (url) {
  var driveKey, filepath, version
  if (HYPERDRIVE_HASH_REGEX.test(url)) {
    // simple case: given the key
    driveKey = url
    filepath = '/'
  } else {
    var urlp = parseDriveUrl(url)

    // validate
    if (urlp.protocol !== 'hyper:') {
      throw new InvalidURLError('URL must be a hyper: scheme')
    }
    if (!HYPERDRIVE_HASH_REGEX.test(urlp.host)) {
      urlp.host = await hyperDns.resolveName(url)
    }

    driveKey = urlp.host
    filepath = decodeURIComponent(urlp.pathname || '') || '/'
    version = urlp.version
  }
  return {driveKey, filepath, version}
}

function normalizeFilepath (str) {
  str = decodeURIComponent(str)
  if (!str.includes('://') && str.charAt(0) !== '/') {
    str = '/' + str
  }
  return str
}

// helper to handle the URL argument that's given to most args
// - can get a dat hash, or dat url
// - returns {drive, filepath, version}
// - sets checkoutFS to what's requested by version
// - throws if the filepath is invalid
export async function lookupDrive (sender, url, opts = {}) {
  var {driveKey, filepath, version} = await parseUrlParts(url)
  var drive = drives.getDrive(driveKey)
  if (!drive) drive = await drives.loadDrive(driveKey)
  var {checkoutFS, isHistoric} = await drives.getDriveCheckout(drive, version)
  return {drive, filepath, version, isHistoric, checkoutFS}
}

async function lookupUrlDriveKey (url) {
  if (HYPERDRIVE_HASH_REGEX.test(url)) return url
  if (!url.startsWith('hyper://')) {
    return false // not a drive site
  }

  var urlp = parseDriveUrl(url)
  try {
    return await hyperDns.resolveName(urlp.hostname)
  } catch (e) {
    return false
  }
}

export async function getTheme (drive) {
  var themeStat = await drive.pda.stat('/theme').catch(e => undefined)
  if (themeStat) {
    if (themeStat.mount) {
      return `hyper://${themeStat.mount.key.toString('hex')}`
    } else {
      return drive.pda.readFile('/theme/.beaker-theme').catch(e => 'custom')
    }
  }
  return undefined
}

export async function setTheme (drive, theme) {
  try {
    await drive.pda.rmdir('/theme', {recursive: true}).catch(e => undefined)
    await drive.pda.unmount('/theme').catch(e => undefined)
    if (theme.startsWith('builtin:')) {
      let themePath = path.join(__dirname, 'assets', 'themes', theme.slice('builtin:'.length))
      await pda.exportFilesystemToArchive({
        srcPath: themePath,
        dstArchive: drive.session.drive,
        dstPath: '/theme/',
        inplaceImport: true
      })
    } else if (theme.startsWith('hyper:')) {
      await drive.pda.mount('/theme', theme)
    }
  } catch (e) {
    console.error('Failed to set theme', e)
  }
}