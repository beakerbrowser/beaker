import { dialog } from 'electron'
import pda from 'pauls-dat-api2'
import * as modals from '../../ui/subwindows/modals'
import * as prompts from '../../ui/subwindows/prompts'
import * as drives from '../../hyper/drives'
import { getDriveConfig, configDrive, listDrives as fsListDrives, removeDrive } from '../../filesystem/index'
import { lookupDrive } from './hyperdrive'
import { isHyperUrl, parseDriveUrl } from '../../../lib/urls'
import { joinPath } from '../../../lib/strings'
import * as permissions from '../../ui/permissions'
import assert from 'assert'
import { UserDeniedError, ArchiveNotWritableError } from 'beaker-error-constants'
import _pick from 'lodash.pick'
import * as wcTrust from '../../wc-trust'

// typedefs
// =

/**
 * @typedef {Object} BeakerShellPublicAPIDriveRecord
 * @prop {string} url
 * @prop {string} title
 * @prop {string} description
 */

// exported api
// =

/**
 * @param {string} url 
 * @returns {Promise<void>}
 */
export async function drivePropertiesDialog (url) {
  assert(url && typeof url === 'string', '`url` must be a string')
  var info = await drives.getDriveInfo(url)
  var cfg = getDriveConfig(info.key)
  await modals.create(this.sender, 'drive-properties', {
    url: info.url,
    writable: info.writable,
    props: Object.assign(_pick(info, ['title', 'description']), {tags: cfg.tags || []})
  })
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.buttonLabel]
 * @param {string} [opts.drive]
 * @param {string} [opts.defaultPath]
 * @param {string[]} [opts.select]
 * @param {Object} [opts.filters]
 * @param {string[]} [opts.filters.extensions]
 * @param {boolean} [opts.filters.writable]
 * @param {boolean} [opts.filters.networked]
 * @param {boolean} [opts.allowMultiple]
 * @param {boolean} [opts.disallowCreate]
 * @returns {Promise<string[]>}
 */
export async function selectFileDialog (opts = {}) {
  // validate
  assert(opts && typeof opts === 'object', 'Must pass an options object')
  assert(!opts.title || typeof opts.title === 'string', '.title must be a string')
  assert(!opts.buttonLabel || typeof opts.buttonLabel === 'string', '.buttonLabel must be a string')
  assert(!opts.drive || typeof opts.drive === 'string', '.drive must be a string')
  assert(!opts.defaultPath || typeof opts.defaultPath === 'string', '.defaultPath must be a string')
  assert(!opts.select || isStrArray(opts.select), '.select must be an array of strings')
  if (opts.filters) {
    assert(typeof opts.filters === 'object', '.filters must be an object')
    assert(!opts.filters.extensions || isStrArray(opts.filters.extensions), '.filters.extensions must be an array of strings')
    assert(!opts.filters.writable || typeof opts.filters.writable === 'boolean', '.filters.writable must be a boolean')
    assert(!opts.filters.networked || typeof opts.filters.networked === 'boolean', '.filters.networked must be a boolean')
  }
  assert(!opts.allowMultiple || typeof opts.allowMultiple === 'boolean', '.filters.allowMultiple must be a boolean')
  assert(!opts.disallowCreate || typeof opts.disallowCreate === 'boolean', '.filters.disallowCreate must be a boolean')

  // initiate the modal
  var res
  try {
    while (true) {
      res = await modals.create(this.sender, 'select-file', opts)
      if (res && res.gotoCreateDrive) {
        res = await modals.create(this.sender, 'create-drive').catch(e => undefined)
        if (res && res.gotoSync) {
          await modals.create(this.sender, 'folder-sync', {url: res.url, closeAfterSync: true})
        }
        if (res) opts.drive = res.url
      } else {
        break
      }
    }
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res) throw new UserDeniedError()
  return res
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.buttonLabel]
 * @param {string} [opts.drive]
 * @param {string} [opts.defaultPath]
 * @param {string} [opts.defaultFilename]
 * @param {string} [opts.extension]
 * @param {Object} [opts.filters]
 * @param {string[]} [opts.filters.extensions]
 * @param {boolean} [opts.filters.networked]
 * @returns {Promise<string[]>}
 */
export async function saveFileDialog (opts = {}) {
  // validate
  assert(opts && typeof opts === 'object', 'Must pass an options object')
  assert(!opts.title || typeof opts.title === 'string', '.title must be a string')
  assert(!opts.buttonLabel || typeof opts.buttonLabel === 'string', '.buttonLabel must be a string')
  assert(!opts.drive || typeof opts.drive === 'string', '.drive must be a string')
  assert(!opts.defaultPath || typeof opts.defaultPath === 'string', '.defaultPath must be a string')
  assert(!opts.defaultFilename || typeof opts.defaultFilename === 'string', '.defaultFilename must be a string')
  if (opts.filters) {
    assert(typeof opts.filters === 'object', '.filters must be an object')
    assert(!opts.filters.extensions || isStrArray(opts.filters.extensions), '.filters.extensions must be an array of strings')
    assert(!opts.filters.networked || typeof opts.filters.networked === 'boolean', '.filters.networked must be a boolean')
  }

  // initiate the modal
  opts.saveMode = true
  var res
  try {
    while (true) {
      res = await modals.create(this.sender, 'select-file', opts)
      if (res && res.gotoCreateDrive) {
        res = await modals.create(this.sender, 'create-drive').catch(e => undefined)
        if (res && res.gotoSync) {
          await modals.create(this.sender, 'folder-sync', {url: res.url, closeAfterSync: true})
        }
        if (res) opts.drive = res.url
      } else {
        break
      }
    }
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res) throw new UserDeniedError()
  return res
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.title]
 * @param {string} [opts.buttonLabel]
 * @param {boolean} [opts.writable]
 * @param {string} [opts.tag]
 * @param {boolean} [opts.allowMultiple]
 * @param {string} [opts.template]
 * @returns {Promise<string|string[]>}
 */
export async function selectDriveDialog (opts = {}) {
  // validate
  assert(opts && typeof opts === 'object', 'Must pass an options object')
  assert(!opts.title || typeof opts.title === 'string', '.title must be a string')
  assert(!opts.buttonLabel || typeof opts.buttonLabel === 'string', '.buttonLabel must be a string')
  assert(!opts.tag || typeof opts.tag === 'string', '.tag must be a string')
  assert(!opts.writable || typeof opts.writable === 'boolean', '.writable must be a boolean')
  assert(!opts.allowMultiple || typeof opts.allowMultiple === 'boolean', '.allowMultiple must be a boolean')
  assert(!opts.template || typeof opts.template === 'string', '.template must be a string')
  if (opts.template && !isHyperUrl(opts.template)) {
    throw new Error('.template must be a hyper:// URL')
  }

  // initiate the modal
  var res
  try {
    res = await modals.create(this.sender, 'select-drive', opts)
    if (res && res.gotoCreate) {
      if (opts.template) {
        res = await modals.create(this.sender, 'fork-drive', {
          url: opts.template,
          forks: [{url: opts.template}],
          detached: true,
          isTemplate: true,
          title: '',
          description: '',
          tags: [opts.tag]
        })
      } else {
        res = await modals.create(this.sender, 'create-drive', {tags: [opts.tag]})
        if (res && res.gotoSync) {
          await modals.create(this.sender, 'folder-sync', {url: res.url, closeAfterSync: true})
        }
      }
    }
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res) throw new UserDeniedError()
  return res.urls || res.url
}

/**
 * @param {Object} [opts]
 * @param {string} [opts.tags]
 * @returns {Promise<void>}
 */
export async function saveDriveDialog (url, {tags} = {tags: ''}) {
  if (Array.isArray(tags)) {
    tags = tags.filter(t => typeof t === 'string').join(' ')
  } else if (typeof tags !== 'string') {
    tags = ''
  }

  var res
  try {
    res = await modals.create(this.sender, 'add-drive', {url, tags})
  } catch (e) {
    if (e.name !== 'Error') {
      throw e // only rethrow if a specific error
    }
  }
  if (!res) throw new UserDeniedError()
  await configDrive(res.key, {tags: res.tags})
}

/**
 * @param {Object} [opts]
 * @param {boolean} [opts.writable]
 * @param {string} [opts.tag]
 * @returns {Promise<BeakerShellPublicAPIDriveRecord[]>}
 */
export async function listDrives (opts = {}) {
  // validate
  assert(opts && typeof opts === 'object', 'Must pass an options object')
  assert(!opts.tag || typeof opts.tag === 'string', '.tag must be a string')
  assert(!opts.writable || typeof opts.writable === 'boolean', '.writable must be a boolean')

  let perm = opts.tag ? `listDrives:${opts.tag || ''}` : 'listDrives'
  if (!(await permissions.requestPermission(perm, this.sender))) {
    throw new UserDeniedError()
  }

  let drivesList = fsListDrives()
  let records = []
  for (let drive of drivesList) {
    let url = `hyper://${drive.key}/`
    let info = await drives.getDriveInfo(drive.key, {onlyCache: true})
    if (typeof opts.writable === 'boolean' && info.writable !== opts.writable) {
      continue
    }
    if (typeof opts.tag === 'string' && !drive.tags?.includes?.(opts.tag)) {
      continue
    }
    records.push({url, title: info.title, description: info.description})
  }
  return records
}

export async function unsaveDrive (url) {
  // validate
  assert(url && typeof url === 'string', 'Must provide a URL string')

  var key = await drives.fromURLToKey(url, true)
  var cfg = getDriveConfig(key)
  if (cfg) {
    var info = await drives.getDriveInfo(key, {onlyCache: true})
    if (!(await permissions.requestPermission(`deleteDrive:${key}`, this.sender, { title: info.title }))) {
      throw new UserDeniedError()
    }
    await removeDrive(key)
  }
}

export async function tagDrive (url, tags) {
  // validate
  assert(url && typeof url === 'string', 'Must provide a URL string')
  if (!tags) throw new Error('Tags must be a string or array of strings')
  if (Array.isArray(tags)) {
    tags = tags.filter(v => typeof v === 'string')
    if (tags.length === 0) throw new Error('Tags must be a string or array of strings')
  } else if (typeof tags !== 'string') {
    throw new Error('Tags must be a string or array of strings')
  } else {
    tags = tags.split(' ')
  }

  var key = await drives.fromURLToKey(url, true)
  var cfg = getDriveConfig(key)
  if (!cfg) {
    return saveDriveDialog.call(this, url, {tags})
  }

  if (cfg.tags) {
    // remove any tags already present
    tags = tags.filter(tag => !cfg.tags.includes(tag))
    if (tags.length === 0) {
      return // already tagged with all requested tags
    }
  }

  var info = await drives.getDriveInfo(key, {onlyCache: true})
  if (!(await permissions.requestPermission(`tagDrive:${key}`, this.sender, { title: info.title, tags }))) {
    throw new UserDeniedError()
  }

  if (cfg.tags) tags = tags.concat(cfg.tags)
  await configDrive(key, {tags})
}

export async function importFilesAndFolders (url, filePaths) {
  if (!wcTrust.isWcTrusted(this.sender)) return
  return doImport(this.sender, url, filePaths)
}

export async function importFilesDialog (url) {
  if (!wcTrust.isWcTrusted(this.sender)) return

  var res = await dialog.showOpenDialog({
    title: 'Import files',
    buttonLabel: 'Import',
    properties: ['openFile', 'multiSelections', 'createDirectory']
  })
  if (res.filePaths.length) {
    return doImport(this.sender, url, res.filePaths)
  }
  return {numImported: 0}
}

export async function importFoldersDialog (url) {
  if (!wcTrust.isWcTrusted(this.sender)) return

  var res = await dialog.showOpenDialog({
    title: 'Import folders',
    buttonLabel: 'Import',
    properties: ['openDirectory', 'multiSelections', 'createDirectory']
  })
  if (res.filePaths.length) {
    return doImport(this.sender, url, res.filePaths)
  }
  return {numImported: 0}
}

export async function exportFilesDialog (urls) {
  if (!wcTrust.isWcTrusted(this.sender)) return

  var res = await dialog.showOpenDialog({
    title: 'Export files',
    buttonLabel: 'Export',
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.filePaths.length) {
    var baseDstPath = res.filePaths[0]
    urls = Array.isArray(urls) ? urls : [urls]
    for (let srcUrl of urls) {
      var urlp = parseDriveUrl(srcUrl)
      let {checkoutFS} = await lookupDrive(this.sender, urlp.hostname, urlp.version)
      let dstPath = joinPath(baseDstPath, urlp.pathname.split('/').pop())
      await pda.exportArchiveToFilesystem({
        srcArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
        srcPath: urlp.pathname,
        dstPath,
        overwriteExisting: false,
        skipUndownloadedFiles: false
      })
    }
    return {numExported: res.filePaths.length}
  }
  return {numExported: 0}
}

// internal methods
// =

function isStrArray (v) {
  return (Array.isArray(v) && v.every(el => typeof el === 'string'))
}

async function doImport (wc, url, filePaths) {
  var urlp = parseDriveUrl(url)
  var {checkoutFS, isHistoric} = await lookupDrive(wc, urlp.hostname, urlp.version)
  if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')

  // calculate size of import for progress
  var numFilesToImport = 0
  for (let srcPath of filePaths) {
    let stats = await pda.exportFilesystemToArchive({
      srcPath,
      dstArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
      dstPath: urlp.pathname,
      ignore: ['index.json'],
      inplaceImport: false,
      dryRun: true
    })
    numFilesToImport += stats.fileCount
  }

  var prompt = await prompts.create(wc, 'progress', {label: 'Importing files...'})
  let numImported = 0
  try {
    for (let srcPath of filePaths) {
      let stats = await pda.exportFilesystemToArchive({
        srcPath,
        dstArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
        dstPath: urlp.pathname,
        ignore: ['index.json'],
        inplaceImport: false,
        dryRun: false,
        progress (stats) {
          prompt.webContents.executeJavaScript(`updateProgress(${(numImported + stats.fileCount) / numFilesToImport}); undefined`)
        }
      })
      numImported += stats.fileCount
    }
  } finally {
    prompts.close(prompt.tab)
  }

  return {numImported}
}