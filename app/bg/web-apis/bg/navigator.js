import { BrowserView, dialog } from 'electron'
import os from 'os'
import pda from 'pauls-dat-api2'
import * as windows from '../../ui/windows'
import * as tabManager from '../../ui/tab-manager'
import * as modals from '../../ui/subwindows/modals'
import * as filesystem from '../../filesystem/index'
import * as drives from '../../hyper/drives'
import { lookupDrive } from './hyperdrive'
import { joinPath } from '../../../lib/strings'
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
    var info = await drives.getDriveInfo(url)
    await modals.create(this.sender, 'drive-properties', {
      url: info.url,
      writable: info.writable,
      props: _pick(info, ['title', 'description', 'type'])
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
    var userSession = windows.getUserSessionFor(this.sender)
    if (!userSession) throw new Error('No active user session')

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

    // set defaults
    if (!opts.drive) {
      opts.drive = filesystem.get().url
    }

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
    var userSession = windows.getUserSessionFor(this.sender)
    if (!userSession) throw new Error('No active user session')

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

    // set defaults
    if (!opts.drive) {
      opts.drive = filesystem.get().url
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
    } catch (e) {
      if (e.name !== 'Error') {
        throw e // only rethrow if a specific error
      }
    }
    if (!res || !res.url) throw new UserDeniedError()
    return res.url
  },

  /**
   * Can only be used by beaker:// sites
   * 
   * @returns {Promise<void>}
   */
  async executeSidebarCommand (...args) {
    var tab = tabManager.findTab(BrowserView.fromWebContents(this.sender))
    if (!tab) return

    var isAllowed = (this.sender.getURL().startsWith('beaker:') || /^https?:\/\/hyperdrive\.network(:|\/)/i.test(this.sender.getURL()))
    if (isAllowed) {
      return tab.executeSidebarCommand(...args)
    }
  },

  async importFilesDialog (url) {
    if (!(await isBeakerApp(this.sender))) return

    var OS_CAN_IMPORT_FOLDERS_AND_FILES = os.platform() === 'darwin'
    var res = await dialog.showOpenDialog({
      title: 'Import files',
      buttonLabel: 'Import',
      properties: ['openFile', OS_CAN_IMPORT_FOLDERS_AND_FILES ? 'openDirectory' : false, 'multiSelections', 'createDirectory'].filter(Boolean)
    })
    if (res.filePaths.length) {
      var {checkoutFS, filepath, isHistoric} = await lookupDrive(this.sender, url)
      if (isHistoric) throw new ArchiveNotWritableError('Cannot modify a historic version')
      for (let srcPath of res.filePaths) {
        await pda.exportFilesystemToArchive({
          srcPath,
          dstArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
          dstPath: filepath,
          ignore: ['index.json'],
          inplaceImport: false,
          dryRun: false
        })
      }
    }
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
        let {checkoutFS, filepath} = await lookupDrive(this.sender, srcUrl)
        let dstPath = joinPath(baseDstPath, filepath.split('/').pop())
        await pda.exportArchiveToFilesystem({
          srcArchive: checkoutFS.session ? checkoutFS.session.drive : checkoutFS,
          srcPath: filepath,
          dstPath,
          overwriteExisting: false,
          skipUndownloadedFiles: false
        })
      }
    }
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
