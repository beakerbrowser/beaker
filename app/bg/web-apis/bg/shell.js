import { dialog, BrowserView } from 'electron'
import pda from 'pauls-dat-api2'
import * as modals from '../../ui/subwindows/modals'
import * as prompts from '../../ui/subwindows/prompts'
import * as drives from '../../hyper/drives'
import { lookupDrive } from './hyperdrive'
import { parseDriveUrl } from '../../../lib/urls'
import { joinPath } from '../../../lib/strings'
import { findTab } from '../../ui/tabs/manager'
import assert from 'assert'
import { UserDeniedError, ArchiveNotWritableError } from 'beaker-error-constants'
import _pick from 'lodash.pick'

// typedefs
// =

// exported api
// =

export default {
  /**
   * @param {string} url 
   * @returns {Promise<void>}
   */
  async drivePropertiesDialog (url) {
    assert(url && typeof url === 'string', '`url` must be a string')
    var drive = await drives.getOrLoadDrive(url)
    var info = await drives.getDriveInfo(url)
    await modals.create(this.sender, 'drive-properties', {
      url: info.url,
      writable: info.writable,
      props: _pick(info, ['title', 'description'])
    })
  },

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
  async selectFileDialog (opts = {}) {
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
      res = await modals.create(this.sender, 'select-file', opts)
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()
    return res
  },

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
  async saveFileDialog (opts = {}) {
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
      res = await modals.create(this.sender, 'select-file', opts)
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res) throw new UserDeniedError()
    return res
  },

  /**
   * @param {Object} [opts]
   * @param {string} [opts.title]
   * @param {string} [opts.buttonLabel]
   * @param {boolean} [opts.writable]
   * @param {string} [opts.type]
   * @returns {Promise<string[]>}
   */
  async selectDriveDialog (opts = {}) {
    // validate
    assert(opts && typeof opts === 'object', 'Must pass an options object')
    assert(!opts.title || typeof opts.title === 'string', '.title must be a string')
    assert(!opts.buttonLabel || typeof opts.buttonLabel === 'string', '.buttonLabel must be a string')
    assert(!opts.type || typeof opts.type === 'string', '.type must be a string')
    assert(!opts.writable || typeof opts.writable === 'boolean', '.writable must be a boolean')

    // initiate the modal
    var res
    try {
      res = await modals.create(this.sender, 'select-drive', opts)
      if (res && res.gotoCreate) {
        res = await modals.create(this.sender, 'create-drive')
        if (res && res.gotoSync) {
          await modals.create(this.sender, 'folder-sync', {url: res.url, closeAfterSync: true})
        }
      }
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  async importFilesAndFolders (url, filePaths) {
    if (!(await isBeakerApp(this.sender))) return
    return doImport(this.sender, url, filePaths)
  },

  async importFilesDialog (url) {
    if (!(await isBeakerApp(this.sender))) return

    var res = await dialog.showOpenDialog({
      title: 'Import files',
      buttonLabel: 'Import',
      properties: ['openFile', 'multiSelections', 'createDirectory']
    })
    if (res.filePaths.length) {
      return doImport(this.sender, url, res.filePaths)
    }
    return {numImported: 0}
  },

  async importFoldersDialog (url) {
    if (!(await isBeakerApp(this.sender))) return

    var res = await dialog.showOpenDialog({
      title: 'Import folders',
      buttonLabel: 'Import',
      properties: ['openDirectory', 'multiSelections', 'createDirectory']
    })
    if (res.filePaths.length) {
      return doImport(this.sender, url, res.filePaths)
    }
    return {numImported: 0}
  },

  async exportFilesDialog (urls) {
    if (!(await isBeakerApp(this.sender))) return

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
}

async function isBeakerApp (sender) {
  if (/^(beaker:|https?:\/\/(.*\.)?hyperdrive\.network(:|\/))/.test(sender.getURL())) {
    return true
  }
  return false
}

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