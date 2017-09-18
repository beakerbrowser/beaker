import {app, dialog, autoUpdater, BrowserWindow, webContents, ipcMain, shell, Menu, screen} from 'electron'
import os from 'os'
import path from 'path'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
var debug = require('debug')('beaker')
import * as settingsDb from './dbs/settings'
import {open as openUrl} from './open-url'
import {showModal, closeModal} from './ui/modals'
import {setIsReadyToQuit} from './ui/windows'

// constants
// =

// how long between scheduled auto updates?
const SCHEDULED_AUTO_UPDATE_DELAY = 24 * 60 * 60 * 1e3 // once a day

// possible updater states
const UPDATER_STATUS_IDLE = 'idle'
const UPDATER_STATUS_CHECKING = 'checking'
const UPDATER_STATUS_DOWNLOADING = 'downloading'
const UPDATER_STATUS_DOWNLOADED = 'downloaded'

// globals
// =

// what's the updater doing?
var updaterState = UPDATER_STATUS_IDLE
var updaterError = false // has there been an error?

// is the updater available? must be on certain platform, and may be disabled if there's an error
var isBrowserUpdatesSupported = (os.platform() == 'darwin' || os.platform() == 'win32')

// where is the user in the setup flow?
var userSetupStatus = false
var userSetupStatusLookupPromise

// events emitted to rpc clients
var browserEvents = new EventEmitter()

// exported methods
// =

export function setup () {
  // setup auto-updater
  try {
    if (!isBrowserUpdatesSupported) { throw new Error('Disabled. Only available on macOS and Windows.') }
    autoUpdater.setFeedURL(getAutoUpdaterFeedURL())
    autoUpdater.once('update-available', onUpdateAvailable)
    autoUpdater.on('error', onUpdateError)
  } catch (e) {
    debug('[AUTO-UPDATE] error', e.toString())
    isBrowserUpdatesSupported = false
  }
  setTimeout(scheduledAutoUpdate, 15e3) // wait 15s for first run

  // fetch user setup status
  userSetupStatusLookupPromise = settingsDb.get('user-setup-status')

  // wire up events
  app.on('web-contents-created', onWebContentsCreated)

  // window.prompt handling
  //  - we have use ipc directly instead of using rpc, because we need custom
  //    response-lifecycle management in the main thread
  ipcMain.on('page-prompt-dialog', async (e, message, def) => {
    var win = BrowserWindow.fromWebContents(e.sender.hostWebContents)
    try {
      var res = await showModal(win, 'prompt', {message, default: def})
      e.returnValue = res && res.value ? res.value : false
    } catch (e) {
      e.returnValue = false
    }
  })
}

export const WEBAPI = {
  createEventsStream,
  getInfo,
  checkForUpdates,
  restartBrowser,

  getSetting,
  getSettings,
  setSetting,

  getUserSetupStatus,
  setUserSetupStatus,

  fetchBody,
  downloadURL,

  setStartPageBackgroundImage,

  getDefaultProtocolSettings,
  setAsDefaultProtocolClient,
  removeAsDefaultProtocolClient,

  showOpenDialog,
  showContextMenu,
  openUrl: url => { openUrl(url) }, // dont return anything
  openFolder,
  doWebcontentsCmd,

  closeModal
}

export function fetchBody (url) {
  return new Promise((resolve) => {
    var http = url.startsWith('https') ? require('https') : require('http')

    http.get(url, (res) => {
      var body = ''
      res.setEncoding('utf8')
      res.on('data', (data) => { body += data })
      res.on('end', () => resolve(body))
    })
  })
}

export async function downloadURL (url) {
  this.sender.downloadURL(url)
}

export function setStartPageBackgroundImage (srcPath, appendCurrentDir) {
  if (appendCurrentDir) {
    srcPath = path.join(__dirname, `/${srcPath}`)
  }

  var destPath = path.join(app.getPath('userData'), 'start-background-image')

  return new Promise((resolve) => {
    if (srcPath) {
      fs.readFile(srcPath, (_, data) => {
        fs.writeFile(destPath, data, () => resolve())
      })
    } else {
      fs.unlink(destPath, () => resolve())
    }
  })
}

export function getDefaultProtocolSettings () {
  return Promise.resolve(['http', 'dat'].reduce((res, x) => {
    res[x] = app.isDefaultProtocolClient(x)
    return res
  }, {}))
}

export function setAsDefaultProtocolClient (protocol) {
  return Promise.resolve(app.setAsDefaultProtocolClient(protocol))
}

export function removeAsDefaultProtocolClient (protocol) {
  return Promise.resolve(app.removeAsDefaultProtocolClient(protocol))
}

export function getInfo () {
  return Promise.resolve({
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    chromiumVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: os.platform(),
    updater: {
      isBrowserUpdatesSupported,
      error: updaterError,
      state: updaterState
    },
    paths: {
      userData: app.getPath('userData')
    }
  })
}

// this method was written, as it is, when there was an in-app plugins installer
// since it works well enough, and the in-app installer may return, Im leaving it this way
// ... but, that would explain the somewhat odd design
// -prf
export function checkForUpdates () {
  // dont overlap
  if (updaterState != UPDATER_STATUS_IDLE) { return }

  // track result states for this run
  var isBrowserChecking = false // still checking?
  var isBrowserUpdated = false // got an update?

  // update global state
  debug('[AUTO-UPDATE] Checking for a new version.')
  updaterError = false
  setUpdaterState(UPDATER_STATUS_CHECKING)

  if (isBrowserUpdatesSupported) {
    // check the browser auto-updater
    // - because we need to merge the electron auto-updater, and the npm plugin flow...
    //   ... it's best to set the result events here
    //   (see note above -- back when there WAS a plugin updater, this made since -prf)
    isBrowserChecking = true
    autoUpdater.checkForUpdates()
    autoUpdater.once('update-not-available', () => {
      debug('[AUTO-UPDATE] No browser update available.')
      isBrowserChecking = false
      checkDone()
    })
    autoUpdater.once('update-downloaded', () => {
      debug('[AUTO-UPDATE] New browser version downloaded. Ready to install.')
      isBrowserChecking = false
      isBrowserUpdated = true
      checkDone()
    })

    // cleanup
    autoUpdater.once('update-not-available', removeAutoUpdaterListeners)
    autoUpdater.once('update-downloaded', removeAutoUpdaterListeners)
    function removeAutoUpdaterListeners () {
      autoUpdater.removeAllListeners('update-not-available')
      autoUpdater.removeAllListeners('update-downloaded')
    }
  }

  // check the result states and emit accordingly
  function checkDone () {
    if (isBrowserChecking) { return } // still checking

    // done, emit based on result
    if (isBrowserUpdated) {
      setUpdaterState(UPDATER_STATUS_DOWNLOADED)
    } else {
      setUpdaterState(UPDATER_STATUS_IDLE)
    }
  }

  // just return a resolve; results will be emitted
  return Promise.resolve()
}

export function restartBrowser () {
  if (updaterState == UPDATER_STATUS_DOWNLOADED) {
    // run the update installer
    setIsReadyToQuit(true)
    autoUpdater.quitAndInstall()
    debug('[AUTO-UPDATE] Quitting and installing.')
  } else {
    debug('Restarting Beaker by restartBrowser()')
    // do a simple restart
    app.relaunch()
    setTimeout(() => app.exit(0), 1e3)
  }
}

export function getSetting (key) {
  return settingsDb.get(key)
}

export function getSettings () {
  return settingsDb.getAll()
}

export function setSetting (key, value) {
  return settingsDb.set(key, value)
}

export async function getUserSetupStatus () {
  // if not cached, defer to the lookup promise
  return (userSetupStatus) || userSetupStatusLookupPromise
}

export function setUserSetupStatus (status) {
  userSetupStatus = status // cache
  return settingsDb.set('user-setup-status', status)
}

// rpc methods
// =

function createEventsStream () {
  return emitStream(browserEvents)
}

function showOpenDialog (opts = {}) {
  var wc = this.sender.webContents
  if (wc.hostWebContents) {
    wc = wc.hostWebContents
  }
  return new Promise((resolve) => {
    dialog.showOpenDialog({
      title: opts.title,
      buttonLabel: opts.buttonLabel,
      filters: opts.filters,
      properties: opts.properties
    }, filenames => {
      // return focus back to the the webview
      wc.executeJavaScript(`
        var wv = document.querySelector('webview:not(.hidden)')
        if (wv) wv.focus()
      `)
      resolve(filenames)
    })
  })
}

function showContextMenu (menuDefinition) {
  return new Promise(resolve => {
    var cursorPos = screen.getCursorScreenPoint()

    // add a click item to all menu items
    addClickHandler(menuDefinition)
    function addClickHandler (items) {
      items.forEach(item => {
        if (item.type === 'submenu' && Array.isArray(item.submenu)) {
          addClickHandler(item.submenu)
        } else if (item.type !== 'separator' && item.id) {
          item.click = clickHandler
        }
      })
    }

    // add 'inspect element' in development
    if (process.env.NODE_ENV === 'develop' || process.env.NODE_ENV === 'test') {
      menuDefinition.push({type: 'separator'})
      menuDefinition.push({
        label: 'Inspect Element',
        click: () => {
          this.sender.inspectElement(cursorPos.x, cursorPos.y)
          if (this.sender.isDevToolsOpened()) { this.sender.devToolsWebContents.focus() }
        }
      })
    }

    // track the selection
    var selection
    function clickHandler (item) {
      selection = item.id
    }

    // show the menu
    var win = BrowserWindow.fromWebContents(this.sender.hostWebContents)
    var menu = Menu.buildFromTemplate(menuDefinition)
    menu.popup(win)
    resolve(selection)
  })
}

function openFolder (folderPath) {
  shell.openExternal('file://' + folderPath)
}

async function doWebcontentsCmd (method, wcId, ...args) {
  var wc = webContents.fromId(+wcId)
  if (!wc) throw new Error(`WebContents not found (${wcId})`)
  return wc[method](...args)
}

// internal methods
// =

function setUpdaterState (state) {
  updaterState = state
  browserEvents.emit('updater-state-changed', {state})
}

function getAutoUpdaterFeedURL () {
  if (os.platform() == 'darwin') {
    return 'https://download.beakerbrowser.net/update/osx/' + app.getVersion()
  } else if (os.platform() == 'win32') {
    let bits = (os.arch().indexOf('64') === -1) ? 32 : 64
    return 'https://download.beakerbrowser.net/update/win' + bits + '/' + app.getVersion()
  }
}

// run a daily check for new updates
function scheduledAutoUpdate () {
  settingsDb.get('auto_update_enabled').then(v => {
    // if auto updates are enabled, run the check
    if (+v === 1) { checkForUpdates() }

    // schedule next check
    setTimeout(scheduledAutoUpdate, SCHEDULED_AUTO_UPDATE_DELAY)
  })
}

// event handlers
// =

function onUpdateAvailable () {
  // update status and emit, so the frontend can update
  debug('[AUTO-UPDATE] New version available. Downloading...')
  setUpdaterState(UPDATER_STATUS_DOWNLOADING)
}

function onUpdateError (e) {
  debug('[AUTO-UPDATE] error', e.toString())
  setUpdaterState(UPDATER_STATUS_IDLE)
  updaterError = e.toString()
  browserEvents.emit('updater-error', {message: e.toString()})
}

function onWebContentsCreated (e, webContents) {
  webContents.on('will-prevent-unload', onWillPreventUnload)
}

function onWillPreventUnload (e) {
  var choice = dialog.showMessageBox({
    type: 'question',
    buttons: ['Leave', 'Stay'],
    title: 'Do you want to leave this site?',
    message: 'Changes you made may not be saved.',
    defaultId: 0,
    cancelId: 1
  })
  var leave = (choice === 0)
  if (leave) {
    e.preventDefault()
  }
}
