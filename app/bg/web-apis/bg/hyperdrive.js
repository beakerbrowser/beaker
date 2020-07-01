import path from 'path'
import { parseDriveUrl } from '../../../lib/urls'
import pda from 'pauls-dat-api2'
import pick from 'lodash.pick'
import _get from 'lodash.get'
import _flattenDeep from 'lodash.flattendeep'
import * as modals from '../../ui/subwindows/modals'
import * as permissions from '../../ui/permissions'
import * as hyperDns from '../../hyper/dns'
import * as capabilities from '../../hyper/capabilities'
import * as drives from '../../hyper/drives'
import * as archivesDb from '../../dbs/archives'
import * as auditLog from '../../dbs/audit-log'
import { timer } from '../../../lib/time'
import * as filesystem from '../../filesystem/index'
import { query } from '../../filesystem/query'
import drivesAPI from './drives'
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
  async createDrive ({title, description, author, visibility, prompt} = {}) {
    var newDriveUrl

    // only allow these vars to be set by beaker, for now
    if (!isSenderBeaker(this.sender)) {
      visibility = undefined
      author = undefined // TODO _get(windows.getUserSessionFor(this.sender), 'url')
    }

    if (prompt !== false) {
      // run the creation modal
      let res
      try {
        res = await modals.create(this.sender, 'create-drive', {title, description, author, visibility})
        if (res && res.gotoSync) {
          await modals.create(this.sender, 'folder-sync', {url: res.url, closeAfterSync: true})
        }
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
        let manifest = {title, description, /*TODO author,*/}
        newDrive = await drives.createNewDrive(manifest)
        await filesystem.configDrive(newDrive.url)
      } catch (e) {
        console.log(e)
        throw e
      }
      newDriveUrl = newDrive.url
    }
    let newDriveKey = await lookupUrlDriveKey(newDriveUrl)

    if (!isSenderBeaker(this.sender)) {
      // grant write permissions to the creating app
      permissions.grantPermission('modifyDrive:' + newDriveKey, this.sender.getURL())
    }
    return newDriveUrl
  },

  async forkDrive (url, {detached, title, description, label, prompt} = {}) {
    var newDriveUrl

    // only allow these vars to be set by beaker, for now
    if (!isSenderBeaker(this.sender)) {
      label = undefined
    }

    if (prompt !== false) {
      // run the fork modal
      let res
      let forks = await drivesAPI.getForks(url)
      try {
        res = await modals.create(this.sender, 'fork-drive', {url, title, description, forks, detached, label})
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

      let key = await lookupUrlDriveKey(url)

      // save the parent if needed
      if (!filesystem.getDriveConfig(key)) {
        await filesystem.configDrive(key)
      }

      // create
      let newDrive = await drives.forkDrive(key, {
        title: detached ? title : undefined,
        description: detached ? description : undefined,
        detached
      })
      await filesystem.configDrive(newDrive.url, {
        forkOf: detached ? undefined : {key, label}
      })
      newDriveUrl = newDrive.url
    }

    return newDriveUrl
  },

  async loadDrive (url) {
    if (!url || typeof url !== 'string') {
      return Promise.reject(new InvalidURLError())
    }
    var urlp = parseDriveUrl(url)
    await lookupDrive(this.sender, urlp.hostname, urlp.version)
    return Promise.resolve(true)
  },

  async getInfo (url, opts = {}) {
    return auditLog.record(this.sender.getURL(), 'getInfo', {url}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        var urlp = parseDriveUrl(url)
        var {driveKey, version} = await lookupDrive(this.sender, urlp.hostname, urlp.version, true)
        var info = await drives.getDriveInfo(driveKey)
        var isCap = urlp.hostname.endsWith('.cap')

        // request from beaker internal sites: give all data
        if (isSenderBeaker(this.sender)) {
          return info
        }

        pause() // dont count against timeout, there may be user prompts
        await assertReadPermission(driveKey, this.sender)
        resume()

        // request from userland: return a subset of the data
        return {
          key: isCap ? urlp.hostname : info.key,
          url: isCap ? urlp.origin : info.url,
          // domain: info.domain, TODO
          writable: info.writable,

          // state
          version: info.version,
          peers: info.peers,

          // manifest
          title: info.title,
          description: info.description
        }
      })
    ))
  },

  async configure (url, settings, opts) {
    return auditLog.record(this.sender.getURL(), 'configure', {url, ...settings}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')

        var urlp = parseDriveUrl(url)
        var {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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
      })
    ))
  },

  async diff (url, other, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var prefix = urlp.pathname
    return auditLog.record(this.sender.getURL(), 'diff', {url, other, prefix}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, url, urlp.version)
        pause() // dont count against timeout, there may be user prompts
        await assertReadPermission(checkoutFS, this.sender)
        resume()
        checkin('diffing')
        return checkoutFS.pda.diff(other, prefix)
      })
    ))
  },

  async stat (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'stat', {url, filepath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
        pause() // dont count against timeout, there may be user prompts
        await assertReadPermission(checkoutFS, this.sender)
        resume()
        checkin('stating file')
        return checkoutFS.pda.stat(filepath, opts)
      })
    ))
  },

  async readFile (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'readFile', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {checkoutFS} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
        pause() // dont count against timeout, there may be user prompts
        await assertReadPermission(checkoutFS, this.sender)
        resume()
        checkin('reading file')
        return checkoutFS.pda.readFile(filepath, opts)
      })
    ))
  },

  async writeFile (url, data, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    if (typeof opts === 'string') {
      opts = {encoding: opts}
    }
    if (opts.encoding === 'json') {
      data = JSON.stringify(data, null, 2)
      opts.encoding = 'utf8'
    }
    const sourceSize = Buffer.byteLength(data, opts.encoding)
    return auditLog.record(this.sender.getURL(), 'writeFile', {url, filepath}, sourceSize, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async unlink (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'unlink', {url, filepath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async copy (url, dstpath, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var srcpath = normalizeFilepath(urlp.pathname || '')
    dstpath = normalizeFilepath(dstpath || '')
    const src = await lookupDrive(this.sender, urlp.hostname, urlp.version)
    const sourceSize = await src.drive.pda.readSize(srcpath)
    return auditLog.record(this.sender.getURL(), 'copy', {url, srcpath, dstpath}, sourceSize, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')

        const dst = await lookupDrive(this.sender, dstpath.includes('://') ? dstpath : url)

        if (srcpath.includes('://')) srcpath = normalizeFilepath((new URL(srcpath)).pathname)
        if (dstpath.includes('://')) dstpath = normalizeFilepath((new URL(dstpath)).pathname)

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

  async rename (url, dstpath, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var srcpath = normalizeFilepath(urlp.pathname || '')
    dstpath = normalizeFilepath(dstpath || '')
    return auditLog.record(this.sender.getURL(), 'rename', {url, srcpath, dstpath}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')

        const src = await lookupDrive(this.sender, urlp.hostname, urlp.version)
        const dst = await lookupDrive(this.sender, dstpath.includes('://') ? dstpath : url)

        if (srcpath.includes('://')) srcpath = normalizeFilepath((new URL(srcpath)).pathname)
        if (dstpath.includes('://')) dstpath = normalizeFilepath((new URL(dstpath)).pathname)

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(dst.drive, this.sender)
        assertValidPath(dstpath)
        assertUnprotectedFilePath(srcpath, this.sender)
        assertUnprotectedFilePath(dstpath, this.sender)
        resume()

        checkin('renaming file')
        return src.checkoutFS.pda.rename(srcpath, dst.checkoutFS.session.drive, dstpath)
      })
    ))
  },

  async updateMetadata (url, metadata, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'updateMetadata', {url, filepath, metadata}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async deleteMetadata (url, keys, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'deleteMetadata', {url, filepath, keys}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async readdir (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'readdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {checkoutFS} = await lookupDrive(this.sender, urlp.hostname, urlp.version)

        pause() // dont count against timeout, there may be user prompts
        await assertReadPermission(checkoutFS, this.sender)
        resume()

        checkin('reading directory')
        var names = await checkoutFS.pda.readdir(filepath, opts)
        if (opts.includeStats) {
          names = names.map(obj => ({name: obj.name, stat: obj.stat}))
        }
        return names
      })
    ))
  },

  async mkdir (url, opts) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'mkdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
        if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

        pause() // dont count against timeout, there may be user prompts
        await assertWritePermission(drive, this.sender)
        await assertValidPath(filepath)
        assertUnprotectedFilePath(filepath, this.sender)
        resume()

        checkin('making directory')
        return checkoutFS.pda.mkdir(filepath, opts)
      })
    ))
  },

  async rmdir (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'rmdir', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async symlink (url, linkname, opts) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var target = normalizeFilepath(urlp.pathname || '')
    linkname = normalizeFilepath(linkname || '')
    return auditLog.record(this.sender.getURL(), 'symlink', {url, target, linkname}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async mount (url, mount, opts) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    var mountKey = typeof mount === "object" ? mount.key : mount
    if (mountKey.includes('.cap')) throw new Error('Unable to mount capability URLs')
    return auditLog.record(this.sender.getURL(), 'mount', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async unmount (url, opts = {}) {
    var urlp = parseDriveUrl(url)
    var url = urlp.origin
    var filepath = normalizeFilepath(urlp.pathname || '')
    return auditLog.record(this.sender.getURL(), 'unmount', {url, filepath, opts}, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('searching for drive')
        const {drive, checkoutFS, isHistoric} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
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

  async query (opts) {
    if (!opts.drive) return []
    if (!Array.isArray(opts.drive)) opts.drive = [opts.drive]
    return auditLog.record(this.sender.getURL(), 'query', opts, undefined, () => (
      timer(to(opts), async (checkin, pause, resume) => {
        checkin('looking up drives')
        var capUrls = {}
        for (let i = 0; i < opts.drive.length; i++) {
          let urlp = parseDriveUrl(opts.drive[i])
          opts.drive[i] = (await
            auditLog.record('-query', 'lookupDrive', {url: opts.drive[i]}, undefined, () => (
              lookupDrive(this.sender, urlp.hostname, urlp.version)
            ), {ignoreFast: true})
          ).checkoutFS
          if (urlp.hostname.endsWith('.cap')) {
            capUrls[opts.drive[i].key.toString('hex')] = urlp.hostname
          }
        }
        pause() // dont count against timeout, there may be user prompts
        for (let drive of opts.drive) {
          await assertReadPermission(drive, this.sender)
        }
        resume()
        checkin('running query')
        var queryOpts = opts
        if (opts.drive.length > 1) {
          // HACK we need to get more results in the individual drive queries so that we can correctly
          // merge, re-sort, and slice after -prf
          queryOpts = Object.assign({}, opts)
          queryOpts.limit = queryOpts.offset + queryOpts.limit
          queryOpts.offset = 0
        }
        var queriesResults = await Promise.all(opts.drive.map(drive => query(drive, queryOpts)))
        var results = _flattenDeep(queriesResults)
        if (opts.drive.length > 1) {
          // HACK re-sort and slice here because each query was run separately -prf
          if (opts.sort === 'name') {
            results.sort((a, b) => (opts.reverse) ? path.basename(b.path).toLowerCase().localeCompare(path.basename(a.path).toLowerCase()) : path.basename(a.path).toLowerCase().localeCompare(path.basename(b.path).toLowerCase()))
          } else if (opts.sort === 'mtime') {
            results.sort((a, b) => (opts.reverse) ? b.stat.mtime - a.stat.mtime : a.stat.mtime - b.stat.mtime)
          } else if (opts.sort === 'ctime') {
            results.sort((a, b) => (opts.reverse) ? b.stat.ctime - a.stat.ctime : a.stat.ctime - b.stat.ctime)
          }
          if (opts.offset && opts.limit) results = results.slice(opts.offset, opts.offset + opts.limit)
          else if (opts.offset) results = results.slice(opts.offset)
          else if (opts.limit) results = results.slice(0, opts.limit)
        }
        if (Object.keys(capUrls).length > 0) {
          // mask capability URLs
          for (let res of results) {
            for (let key in capUrls) {
              res.drive = res.drive.replace(key, capUrls[key])
              res.url = res.url.replace(key, capUrls[key])
            }
          }
        }
        return results
      })
    ))
  },

  async watch (url, pathPattern) {
    var {drive} = await lookupDrive(this.sender, url)
    await assertReadPermission(drive, this.sender)
    return drive.pda.watch(pathPattern)
  },

  async createNetworkActivityStream (url) {
    var {drive} = await lookupDrive(this.sender, url)
    await assertReadPermission(drive, this.sender)
    return drive.pda.createNetworkActivityStream()
  },

  async beakerDiff (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of diff() must be a hyperdrive URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of diff() must be a hyperdrive URL')
    }
    var [src, dst] = await Promise.all([lookupDrive(this.sender, srcUrl), lookupDrive(this.sender, dstUrl)])
    return pda.diff(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async beakerMerge (srcUrl, dstUrl, opts) {
    assertBeakerOnly(this.sender)
    if (!srcUrl || typeof srcUrl !== 'string') {
      throw new InvalidURLError('The first parameter of merge() must be a hyperdrive URL')
    }
    if (!dstUrl || typeof dstUrl !== 'string') {
      throw new InvalidURLError('The second parameter of merge() must be a hyperdrive URL')
    }
    var [src, dst] = await Promise.all([lookupDrive(this.sender, srcUrl), lookupDrive(this.sender, dstUrl)])
    if (!dst.drive.writable) throw new ArchiveNotWritableError('The destination drive is not writable')
    if (dst.isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.merge(src.checkoutFS.pda, src.filepath, dst.checkoutFS.pda, dst.filepath, opts)
  },

  async importFromFilesystem (opts) {
    assertBeakerOnly(this.sender)
    var {checkoutFS, filepath, isHistoric} = await lookupDrive(this.sender, opts.dst)
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

    var {checkoutFS, filepath} = await lookupDrive(this.sender, opts.src)
    return pda.exportArchiveToFilesystem({
      srcArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
      srcPath: filepath,
      dstPath: opts.dst,
      ignore: opts.ignore,
      overwriteExisting: opts.overwriteExisting,
      skipUndownloadedFiles: opts.skipUndownloadedFiles
    })
  },

  async exportToDrive (opts) {
    assertBeakerOnly(this.sender)
    var src = await lookupDrive(this.sender, opts.src)
    var dst = await lookupDrive(this.sender, opts.dst)
    if (dst.isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
    return pda.exportArchiveToArchive({
      srcArchive: src.checkoutFS.session ? src.checkoutFS.session.drive : src.checkoutFS,
      srcPath: src.filepath,
      dstArchive: dst.checkoutFS.session ? dst.checkoutFS.session.drive : dst.checkoutFS,
      dstPath: dst.filepath,
      ignore: opts.ignore,
      skipUndownloadedFiles: opts.skipUndownloadedFiles
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
  let allowed = await permissions.requestPermission('createDrive', sender)
  if (!allowed) {
    throw new UserDeniedError()
  }
}

async function assertReadPermission (drive, sender) {
  var driveUrl
  if (typeof drive === 'string') {
    driveUrl = `hyper://${await drives.fromURLToKey(drive, true)}/`
  } else {
    driveUrl = drive.url
  }

  if (filesystem.isRootUrl(driveUrl)) {
    if (isSenderBeaker(sender)) {
      return true
    }
    throw new PermissionsError('Cannot read the system drive')
  }

  return true
}

async function assertWritePermission (drive, sender) {
  var newDriveKey = drive.key.toString('hex')
  var details = await drives.getDriveInfo(newDriveKey)
  const perm = ('modifyDrive:' + newDriveKey)

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
  const perm = ('deleteDrive:' + driveKey)

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

function normalizeFilepath (str) {
  str = decodeURIComponent(str)
  if (!str.includes('://') && str.charAt(0) !== '/') {
    str = '/' + str
  }
  return str
}

// helper to handle the URL argument that's given to most args
// - can get a hyperdrive hash, or hyperdrive url
// - sets checkoutFS to what's requested by version
export async function lookupDrive (sender, driveHostname, version, dontGetDrive = false) {
  var driveKey
  
  if (driveHostname.endsWith('.cap')) {
    let cap = capabilities.lookupCap(driveHostname)
    if (cap) {
      driveKey = cap.target.key
      version = cap.target.version
    } else {
      throw new Error('Capability does not exist')
    }
  }
  
  if (!driveKey) {
    driveKey = await drives.fromURLToKey(driveHostname, true)
  }

  if (dontGetDrive) {
    return {driveKey, version}
  }

  var drive = drives.getDrive(driveKey)
  if (!drive) drive = await drives.loadDrive(driveKey)
  var {checkoutFS, isHistoric} = await drives.getDriveCheckout(drive, version)
  return {drive, version, isHistoric, checkoutFS}
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
