import { app, dialog, BrowserWindow, webContents, ipcMain, shell, Menu, screen, session, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import os from 'os'
import path from 'path'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import ICO from 'icojs'
import toIco from 'to-ico'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import LRU from 'lru'
const exec = require('util').promisify(require('child_process').exec)
import * as logLib from './logger'
import * as adblocker from './adblocker'
const logger = logLib.child({category: 'browser'})
import * as settingsDb from './dbs/settings'
import { convertDatArchive } from './dat/index'
import datDns from './dat/dns'
import { open as openUrl } from './open-url'
import * as windows from './ui/windows'
import { createMenuItem as createContextMenuItem, shouldShowMenuItem as shouldShowContextMenuItem } from './ui/context-menu'
import * as tabManager from './ui/tabs/manager'
import { updateSetupState } from './ui/setup-flow'
import * as modals from './ui/subwindows/modals'
import * as siteInfo from './ui/subwindows/site-info'
import { findWebContentsParentWindow } from './lib/electron'
import * as hyperDaemon from './hyper/daemon'
import * as bookmarks from './filesystem/bookmarks'
import { getDriveIdent } from './filesystem/index'
import * as wcTrust from './wc-trust'
import { spawnAndExecuteJs } from './lib/electron'

// constants
// =

const IS_FROM_SOURCE = (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath))
const IS_LINUX = !(/^win/.test(process.platform)) && process.platform !== 'darwin'
const DOT_DESKTOP_FILENAME = 'appimagekit-jolly-browser.desktop'
const isBrowserUpdatesSupported = !(IS_LINUX || IS_FROM_SOURCE) // linux is temporarily not supported

// how long between scheduled auto updates?
const SCHEDULED_AUTO_UPDATE_DELAY = 24 * 60 * 60 * 1e3 // once a day

// possible updater states
const UPDATER_STATUS_IDLE = 'idle'
const UPDATER_STATUS_CHECKING = 'checking'
const UPDATER_STATUS_DOWNLOADING = 'downloading'
const UPDATER_STATUS_DOWNLOADED = 'downloaded'

// globals
// =

// dont automatically check for updates (need to respect user preference)
autoUpdater.autoDownload = false

// what's the updater doing?
var updaterState = UPDATER_STATUS_IDLE
var updaterError = undefined // has there been an error?

// content-type tracker
var resourceContentTypes = new LRU(100) // URL -> Content-Type

// certificate tracker
var originCerts = new LRU(100) // hostname -> {issuerName, subjectName, validExpiry}

// events emitted to rpc clients
var browserEvents = new EventEmitter()

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason, reason.stack)
  logger.error(`Unhandled Rejection at: Promise ${p.toString()} reason: ${reason.toString()} ${reason.stack}`)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  logger.error(`Uncaught exception: ${err.toString()}`)
})

// exported methods
// =

export async function setup () {
  wcTrust.setup()

  // setup auto-updater
  if (isBrowserUpdatesSupported) {
    try {
      autoUpdater.setFeedURL(getAutoUpdaterFeedSettings())
      autoUpdater.on('update-available', onUpdateAvailable)
      autoUpdater.on('update-not-available', onUpdateNotAvailable)
      autoUpdater.on('update-downloaded', onUpdateDownloaded)
      autoUpdater.on('error', onUpdateError)
    } catch (e) {
      logger.error(`Auto-updater error: ${e.toString()}`)
    }
    setTimeout(scheduledAutoUpdate, 15e3) // wait 15s for first run
  }

  // wire up events
  app.on('web-contents-created', onWebContentsCreated)

  // window.prompt handling
  //  - we have use ipc directly instead of using rpc, because we need custom
  //    response-lifecycle management in the main thread
  ipcMain.on('page-prompt-dialog', async (e, message, def) => {
    var wc = e.sender
    var res = await modals.create(e.sender, 'prompt', {message, default: def}).catch(e => false)
    wc.focus()
    e.returnValue = res && res.value ? res.value : false
  })

  // HACK
  // Electron has an issue where browserviews fail to calculate click regions after a resize
  // https://github.com/electron/electron/issues/14038
  // we can solve this by forcing a recalculation after every resize
  // -prf
  ipcMain.on('resize-hackfix', (e, message) => {
    var win = findWebContentsParentWindow(e.sender)
    if (win) {
      win.webContents.executeJavaScript(`if (window.forceUpdateDragRegions) { window.forceUpdateDragRegions() }; undefined`)
    }
  })

  // request blocking for security purposes
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    if (details.url.startsWith('asset:') || details.url.startsWith('beaker:')) {
      if (details.resourceType === 'mainFrame') {
        // allow toplevel navigation
        return cb({cancel: false})
      } else if (details.webContentsId && wcTrust.isWcTrusted(details.webContentsId)) {
        // allow trusted WCs
        return cb({cancel: false})
      } else {
        // disallow all other requesters
        return cb({cancel: true})
      }
    } else if (details.url.startsWith('hyper://private')) {
      if (!details.webContentsId) {
        if (details.resourceType === 'mainFrame') {
          // allow toplevel navigation
          return cb({cancel: false})
        } else {
          // not enough info, cancel
          return cb({cancel: true})
        }
      }
      let wc = webContents.fromId(details.webContentsId)
      if (/^(beaker:\/\/|hyper:\/\/private\/)/.test(wc.getURL())) {
        // allow access from self and from beaker
        cb({cancel: false})
      } else {
        cb({cancel: true})
      }
    } else {
      adblocker.onBeforeRequest(details, cb)
    }
  })

  // HACK
  // Electron doesn't give us a convenient way to check the content-types of responses
  // or to fetch the certs of a hostname
  // so we track the last 100 responses' headers to accomplish this
  // -prf
  session.defaultSession.webRequest.onCompleted(onCompleted)
  session.defaultSession.setCertificateVerifyProc((request, cb) => {
    originCerts.set('https://' + request.hostname + '/', {
      issuerName: request.certificate.issuerName,
      subjectName: request.certificate.subjectName,
      validExpiry: request.certificate.validExpiry
    })
    cb(request.errorCode)
  })
}

export const WEBAPI = {
  createEventsStream,
  getInfo,
  getDaemonStatus,
  getDaemonNetworkStatus,
  checkForUpdates,
  restartBrowser,

  getSetting,
  getSettings,
  setSetting,
  updateAdblocker,
  updateSetupState,
  migrate08to09,
  setStartPageBackgroundImage,

  getDefaultProtocolSettings,
  setAsDefaultProtocolClient,
  removeAsDefaultProtocolClient,

  fetchBody,
  downloadURL,

  convertDat,

  getResourceContentType,
  getCertificate,

  listBuiltinFavicons,
  getBuiltinFavicon,
  uploadFavicon,
  imageToIco,

  reconnectHyperdriveDaemon () {
    return hyperDaemon.setup()
  },

  executeShellWindowCommand,
  toggleSiteInfo,
  toggleLiveReloading,
  setWindowDimensions,
  setWindowDragModeEnabled,
  moveWindow,
  maximizeWindow,
  toggleWindowMaximized,
  minimizeWindow,
  closeWindow,
  resizeSiteInfo,
  refreshTabState,

  spawnAndExecuteJs,

  showOpenDialog,
  showContextMenu,
  async showModal (name, opts) {
    return modals.create(this.sender, name, opts)
  },
  newWindow,
  newPane,
  gotoUrl,
  getPageUrl,
  refreshPage,
  focusPage,
  executeJavaScriptInPage,
  injectCssInPage,
  uninjectCssInPage,
  openUrl: (url, opts) => { openUrl(url, opts) }, // dont return anything
  openFolder,
  doWebcontentsCmd,
  doTest,
  closeModal: () => {}, // DEPRECATED, probably safe to remove soon
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

export async function convertDat (url) {
  var win = findWebContentsParentWindow(this.sender)
  var key = await datDns.resolveName(url)
  var driveUrl = await convertDatArchive(win, key)
  tabManager.create(win, driveUrl, {setActive: true})
}

export function getResourceContentType (url) {
  let i = url.indexOf('#')
  if (i !== -1) url = url.slice(0, i) // strip the fragment
  return resourceContentTypes.get(url)
}

export async function getCertificate (url) {
  try {
    let urlp = new URL(url)
    url = urlp.protocol + '//' + urlp.hostname + '/'
  } catch (e) {}
  var cert = originCerts.get(url)
  if (cert) {
    return Object.assign({type: 'tls'}, cert)
  } else if (url.startsWith('beaker:')) {
    return {type: 'beaker'}
  } else if (url.startsWith('hyper://')) {
    let ident = await getDriveIdent(url, true)
    return {type: 'hyperdrive', ident}
  }
}

export async function listBuiltinFavicons ({filter, offset, limit} = {}) {
  if (filter) {
    filter = new RegExp(filter, 'i')
  }

  // list files in assets/favicons and filter on the name
  var dir = jetpack.cwd(__dirname).cwd('assets/favicons')
  var items = (await dir.listAsync())
    .filter(filename => {
      if (filter && !filter.test(filename)) {
        return false
      }
      return filename.endsWith('.ico')
    })
  return items.slice(offset || 0, limit || Number.POSITIVE_INFINITY)
}

export async function getBuiltinFavicon (name) {
  var dir = jetpack.cwd(__dirname).cwd('assets/favicons')
  return dir.readAsync(name, 'buffer')
}

export async function uploadFavicon () {
  let favicon = dialog.showOpenDialogSync({
    title: 'Upload Favicon...',
    defaultPath: app.getPath('home'),
    buttonLabel: 'Upload Favicon',
    filters: [
      { name: 'Images', extensions: ['png', 'ico', 'jpg'] }
    ],
    properties: ['openFile']
  })

  if (!favicon) return

  let faviconBuffer = await jetpack.readAsync(favicon[0], 'buffer')
  let extension = path.extname(favicon[0])

  if (extension === '.png') {
    return toIco(faviconBuffer, {resize: true})
  }
  if (extension === '.jpg') {
    let imageToPng = nativeImage.createFromBuffer(faviconBuffer).toPNG()
    return toIco(imageToPng, {resize: true})
  }
  if (extension === '.ico' && ICO.isICO(faviconBuffer)) {
    return faviconBuffer
  }
}

export async function imageToIco (image) {
  // TODO expand on this function to be png/jpg to ico
  let imageToPng = nativeImage.createFromDataURL(image).toPNG()
  return toIco(imageToPng, {resize: true})
}

async function executeShellWindowCommand (...args) {
  var win = findWebContentsParentWindow(this.sender)
  if (!win) return
  win.webContents.send('command', ...args)
}

async function toggleSiteInfo (override) {
  var win = findWebContentsParentWindow(this.sender)
  if (override === true) {
    siteInfo.show(win)
  } else if (override === false) {
    siteInfo.hide(win)
  } else {
    siteInfo.toggle(win)
  }
}

export async function toggleLiveReloading (enabled) {
  var win = findWebContentsParentWindow(this.sender)
  tabManager.getActive(win).toggleLiveReloading(enabled)
}

export async function setWindowDimensions ({width, height} = {}) {
  var win = findWebContentsParentWindow(this.sender)
  var [currentWidth, currentHeight] = win.getSize()
  width = width || currentWidth
  height = height || currentHeight
  win.setSize(width, height)
}

var _windowDragInterval = undefined
export async function setWindowDragModeEnabled (enabled) {
  var win = findWebContentsParentWindow(this.sender)
  if (enabled) {
    if (_windowDragInterval) return

    // poll the mouse cursor every 15ms
    var lastPt = screen.getCursorScreenPoint()
    _windowDragInterval = setInterval(() => {
      var newPt = screen.getCursorScreenPoint()

      // if the mouse has moved, move the window accordingly
      var delta = {x: newPt.x - lastPt.x, y: newPt.y - lastPt.y}
      if (delta.x || delta.y) {
        var pos = win.getPosition()
        win.setPosition(pos[0] + delta.x, pos[1] + delta.y)
        lastPt = newPt
      }

      // if the mouse has moved out of the window, stop
      var bounds = win.getBounds()
      if (newPt.x < bounds.x || newPt.y < bounds.y || newPt.x > (bounds.x + bounds.width) || newPt.y > (bounds.y + bounds.height)) {
        clearInterval(_windowDragInterval)
        _windowDragInterval = undefined
      }
    }, 15)
  } else {
    // stop the poll
    if (!_windowDragInterval) return
    clearInterval(_windowDragInterval)
    _windowDragInterval = undefined
  }
}

export async function moveWindow (x, y) {
  var win = findWebContentsParentWindow(this.sender)
  var pos = win.getPosition()
  win.setPosition(pos[0] + x, pos[1] + y)
}

export async function maximizeWindow () {
  var win = findWebContentsParentWindow(this.sender)
  win.maximize()
}

async function toggleWindowMaximized () {
  var win = findWebContentsParentWindow(this.sender)
  if (win.isMaximized()) {
    win.unmaximize()
  } else {
    win.maximize()
  }
}

async function minimizeWindow () {
  var win = findWebContentsParentWindow(this.sender)
  win.minimize()
}

async function closeWindow () {
  var win = findWebContentsParentWindow(this.sender)
  win.close()
}

export function resizeSiteInfo (bounds) {
  var win = findWebContentsParentWindow(this.sender)
  if (!win) return
  siteInfo.resize(win, bounds)
}

export async function refreshTabState () {
  var win = findWebContentsParentWindow(this.sender)
  if (!win) return
  var tab = tabManager.getActive(win)
  if (!tab) return
  await tab.refreshState()
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

export async function getDefaultProtocolSettings () {
  if (IS_LINUX) {
    // HACK
    // xdb-settings doesnt currently handle apps that you can't `which`
    // we can just use xdg-mime directly instead
    // see https://github.com/beakerbrowser/beaker/issues/915
    // -prf
    let [httpHandler, hyperHandler, datHandler] = await Promise.all([
      // If there is no default specified, be sure to catch any error
      // from exec and return '' otherwise Promise.all errors out.
      exec('xdg-mime query default "x-scheme-handler/http"').catch(err => ''),
      exec('xdg-mime query default "x-scheme-handler/hyper"').catch(err => ''),
      exec('xdg-mime query default "x-scheme-handler/dat"').catch(err => '')
    ])
    if (httpHandler && httpHandler.stdout) httpHandler = httpHandler.stdout
    if (hyperHandler && hyperHandler.stdout) hyperHandler = hyperHandler.stdout
    if (datHandler && datHandler.stdout) datHandler = datHandler.stdout
    return {
      http: (httpHandler || '').toString().trim() === DOT_DESKTOP_FILENAME,
      hyper: (hyperHandler || '').toString().trim() === DOT_DESKTOP_FILENAME,
      dat: (datHandler || '').toString().trim() === DOT_DESKTOP_FILENAME
    }
  }

  return Promise.resolve(['http', 'hyper', 'dat'].reduce((res, x) => {
    res[x] = app.isDefaultProtocolClient(x)
    return res
  }, {}))
}

export async function setAsDefaultProtocolClient (protocol) {
  if (IS_LINUX) {
    // HACK
    // xdb-settings doesnt currently handle apps that you can't `which`
    // we can just use xdg-mime directly instead
    // see https://github.com/beakerbrowser/beaker/issues/915
    // -prf
    await exec(`xdg-mime default ${DOT_DESKTOP_FILENAME} "x-scheme-handler/${protocol}"`)
    return true
  }
  return Promise.resolve(app.setAsDefaultProtocolClient(protocol))
}

export function removeAsDefaultProtocolClient (protocol) {
  return Promise.resolve(app.removeAsDefaultProtocolClient(protocol))
}

export function getInfo () {
  return {
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
    },
    isDaemonActive: hyperDaemon.isActive()
  }
}

export async function getDaemonStatus () {
  return hyperDaemon.getDaemonStatus()
}

export async function getDaemonNetworkStatus () {
  // bit of a hack, this
  return Array.from(hyperDaemon.getClient().drive._drives, drive => {
    var key = drive.drive.key.toString('hex')
    return {
      key,
      peers: hyperDaemon.listPeerAddresses(key)
    }
  })
}

export function checkForUpdates (opts = {}) {
  // dont overlap
  if (updaterState != UPDATER_STATUS_IDLE) { return }

  // update global state
  logger.info('[AUTO-UPDATE] Checking for a new version.')
  updaterError = undefined
  setUpdaterState(UPDATER_STATUS_CHECKING)
  if (opts.prerelease) {
    logger.info('[AUTO-UPDATE] Jumping to pre-releases.')
    autoUpdater.allowPrerelease = true
  }
  autoUpdater.checkForUpdates()

  // just return a resolve; results will be emitted
  return Promise.resolve()
}

export function restartBrowser () {
  if (updaterState == UPDATER_STATUS_DOWNLOADED) {
    // run the update installer
    autoUpdater.quitAndInstall()
    logger.info('[AUTO-UPDATE] Quitting and installing.')
  } else {
    logger.info('Restarting Beaker by restartBrowser()')
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

export function updateAdblocker () {
  return adblocker.setup()
}

export async function migrate08to09 () {
  await bookmarks.migrateBookmarksFromSqlite()
}

const SCROLLBAR_WIDTH = 16
export async function capturePage (url, opts = {}) {
  var width = opts.width || 1024
  var height = opts.height || 768

  var win = new BrowserWindow({
    width: width + SCROLLBAR_WIDTH,
    height,
    show: false,
    webPreferences: {
      preload: 'file://' + path.join(app.getAppPath(), 'fg', 'webview-preload', 'index.build.js'),
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nativeWindowOpen: true,
      nodeIntegration: false,
      navigateOnDragDrop: true,
      enableRemoteModule: false
    }
  })
  win.loadURL(url)

  // wait for load
  await new Promise((resolve, reject) => {
    win.webContents.on('did-finish-load', resolve)
  })
  await new Promise(r => setTimeout(r, 200)) // give an extra 200ms for rendering

  // capture the page
  var image = await win.webContents.capturePage({x: 0, y: 0, width, height})

  // resize if asked
  if (opts.resizeTo) {
    image = image.resize(opts.resizeTo)
  }

  return image
}

// rpc methods
// =

function createEventsStream () {
  return emitStream(browserEvents)
}

async function showOpenDialog (opts = {}) {
  var wc = this.sender
  var res = await dialog.showOpenDialog({
    title: opts.title,
    buttonLabel: opts.buttonLabel,
    filters: opts.filters,
    properties: opts.properties,
    defaultPath: opts.defaultPath
  })
  wc.focus() // return focus back to the the page
  return res.filePaths
}

function showContextMenu (menuDefinition) {
  var webContents = this.sender
  var tab = tabManager.findTab(webContents)
  return new Promise(resolve => {
    var cursorPos = screen.getCursorScreenPoint()

    // add a click item to all menu items
    menuDefinition = massageItems(menuDefinition)
    function massageItems (items) {
      return items.map(item => {
        if (item.id && item.id.startsWith('builtin:')) {
          let id = item.id.slice('builtin:'.length)
          let opts = {webContents, tab, x: cursorPos.x, y: cursorPos.y}
          if (shouldShowContextMenuItem(id, opts)) {
            return createContextMenuItem(id, opts)
          }
          return false
        } else if (item.type === 'submenu' && Array.isArray(item.submenu)) {
          item.submenu = massageItems(item.submenu)
        } else if (item.type !== 'separator' && item.id) {
          item.click = clickHandler
        }
        return item
      }).filter(Boolean)
    }

    // track the selection
    var selection
    function clickHandler (item) {
      selection = item.id
    }

    // show the menu
    var win = findWebContentsParentWindow(this.sender)
    var menu = Menu.buildFromTemplate(menuDefinition)
    menu.popup({window: win, callback () {
      resolve(selection)
    }})
  })
}

async function newWindow (state = {}) {
  windows.createShellWindow(state)
}

async function newPane (url, opts = {}) {
  var tab = tabManager.findTab(this.sender)
  var pane = tab && tab.findPane(this.sender)
  if (tab && pane) {
    if (opts.replaceSameOrigin) {
      let existingPane = tab.findPaneByOrigin(url)
      if (existingPane) {
        existingPane.loadURL(url)
        return
      }
    }
    tab.createPane({url, setActive: true, after: pane, splitDir: opts.splitDir || 'vert'})
  }
}

async function gotoUrl (url) {
  getSenderTab(this.sender).loadURL(url)
}

async function getPageUrl () {
  return getSenderTab(this.sender).url
}

async function refreshPage () {
  getSenderTab(this.sender).webContents.reload()
}

async function focusPage () {
  getSenderTab(this.sender).focus()
}

async function executeJavaScriptInPage (js) {
  return getSenderTab(this.sender).webContents.executeJavaScript(js, true)
    .catch(err => { 
      if (err.toString().includes('Script failed to execute')) {
        throw "Injected script failed to execute"
      }
      throw err
    })
}

async function injectCssInPage (css) {
  return getSenderTab(this.sender).webContents.insertCSS(css)
}

async function uninjectCssInPage (key) {
  return getSenderTab(this.sender).webContents.removeInsertedCSS(key)
}

function openFolder (folderPath) {
  shell.openExternal('file://' + folderPath)
}

async function doWebcontentsCmd (method, wcId, ...args) {
  var wc = webContents.fromId(+wcId)
  if (!wc) throw new Error(`WebContents not found (${wcId})`)
  return wc[method](...args)
}

async function doTest (test) {
}

// internal methods
// =

function getSenderTab (sender) {
  let tab = tabManager.findTab(sender)
  if (tab) return tab
  var win = findWebContentsParentWindow(sender)
  return tabManager.getActive(win)
}

function setUpdaterState (state) {
  updaterState = state
  browserEvents.emit('updater-state-changed', {state})
}

function getAutoUpdaterFeedSettings () {
  return {
    provider: 'github',
    repo: 'jollybrowser',
    owner: 'pirateforge',
    vPrefixedTagName: false
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
  logger.info('[AUTO-UPDATE] New version available. Downloading...')
  autoUpdater.downloadUpdate()
  setUpdaterState(UPDATER_STATUS_DOWNLOADING)
}

function onUpdateNotAvailable () {
  logger.info('[AUTO-UPDATE] No browser update available.')
  setUpdaterState(UPDATER_STATUS_IDLE)
}

function onUpdateDownloaded () {
  logger.info('[AUTO-UPDATE] New browser version downloaded. Ready to install.')
  setUpdaterState(UPDATER_STATUS_DOWNLOADED)
}

function onUpdateError (e) {
  console.error(e)
  logger.error(`[AUTO-UPDATE] error: ${e.toString()}`)
  setUpdaterState(UPDATER_STATUS_IDLE)

  var message = (e.toString() || '').split('\n')[0]
  if (message.includes('[object Object]')) {
    message = typeof e.message === 'string' ? e.message : 'Updater failed to contact the server'
  }
  updaterError = {message}
  browserEvents.emit('updater-error', updaterError)
}

function onWebContentsCreated (e, webContents) {
  webContents.on('will-prevent-unload', onWillPreventUnload)
  webContents.on('remote-require', e => {
    // do not allow
    e.preventDefault()
  })
  webContents.on('remote-get-global', e => {
    // do not allow
    e.preventDefault()
  })
}

function onWillPreventUnload (e) {
  var choice = dialog.showMessageBoxSync({
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

function onCompleted (details) {
  wcTrust.onWebRequestCompleted(details)
  function set (v) {
    resourceContentTypes.set(details.url, Array.isArray(v) ? v[0] : v)
  }
  if (!details.responseHeaders) return
  if ('Content-Type' in details.responseHeaders) {
    set(details.responseHeaders['Content-Type'])
  } else if ('content-type' in details.responseHeaders) {
    set(details.responseHeaders['content-type'])
  }
}
