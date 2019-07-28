import * as beakerCore from '@beaker/core'
import {app, dialog, BrowserWindow, webContents, ipcMain, shell, Menu, screen, session, nativeImage} from 'electron'
import {autoUpdater} from 'electron-updater'
import os from 'os'
import path from 'path'
import fs from 'fs'
import slugify from 'slugify'
import jetpack from 'fs-jetpack'
import ICO from 'icojs'
import toIco from 'to-ico'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import LRU from 'lru'
const exec = require('util').promisify(require('child_process').exec)
const debug = beakerCore.debugLogger('beaker')
const settingsDb = beakerCore.dbs.settings
import {open as openUrl} from './open-url'
import {getUserSessionFor, setUserSessionFor} from './ui/windows'
import * as viewManager from './ui/view-manager'
import * as modals from './ui/subwindows/modals'
import { findWebContentsParentWindow } from '../lib/electron'
import {INVALID_SAVE_FOLDER_CHAR_REGEX} from '@beaker/core/lib/const'

// constants
// =

const IS_FROM_SOURCE = (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath))
const IS_LINUX = !(/^win/.test(process.platform)) && process.platform !== 'darwin'
const DOT_DESKTOP_FILENAME = 'appimagekit-beaker-browser.desktop'
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
var updaterError = false // has there been an error?

// where is the user in the setup flow?
var userSetupStatus = false
var userSetupStatusLookupPromise

// content-type tracker
var resourceContentTypes = new LRU(100) // URL -> Content-Type

// events emitted to rpc clients
var browserEvents = new EventEmitter()

process.on('unhandledRejection', (reason, p) => {
  console.error('Unhandled Rejection at: Promise', p, 'reason:', reason)
  debug('Unhandled Rejection at: Promise', p, 'reason:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  debug('Uncaught exception:', err)
})

// exported methods
// =

export async function setup () {
  // setup auto-updater
  if (isBrowserUpdatesSupported) {
    try {
      autoUpdater.setFeedURL(getAutoUpdaterFeedSettings())
      autoUpdater.on('update-available', onUpdateAvailable)
      autoUpdater.on('update-not-available', onUpdateNotAvailable)
      autoUpdater.on('update-downloaded', onUpdateDownloaded)
      autoUpdater.on('error', onUpdateError)
    } catch (e) {
      debug('[AUTO-UPDATE] error', e.toString())
    }
    setTimeout(scheduledAutoUpdate, 15e3) // wait 15s for first run
  }

  // fetch user setup status
  userSetupStatusLookupPromise = settingsDb.get('user-setup-status')

  // create a new user if none exists
  var defaultUser = await beakerCore.users.getDefault()
  if (!defaultUser) {
    let newUserUrl = await beakerCore.dat.library.createNewArchive({
      title: 'Anonymous',
      type: 'unwalled.garden/person'
    })
    let archive = beakerCore.dat.library.getArchive(newUserUrl)
    await archive.pda.writeFile('/thumb.jpg', await jetpack.cwd(__dirname).cwd('assets/img').readAsync('default-user-thumb.jpg', 'buffer'), 'binary')
    await beakerCore.users.add('anonymous', newUserUrl, true)
  }

  // wire up events
  app.on('web-contents-created', onWebContentsCreated)
  beakerCore.users.on('user-thumb-changed', onUserThumbChanged)

  // window.prompt handling
  //  - we have use ipc directly instead of using rpc, because we need custom
  //    response-lifecycle management in the main thread
  ipcMain.on('page-prompt-dialog', async (e, message, def) => {
    try {
      var res = await modals.create(e.sender, 'prompt', {message, default: def})
      e.returnValue = res && res.value ? res.value : false
    } catch (e) {
      e.returnValue = false
    }
  })

  // HACK
  // Electron doesn't give us a convenient way to check the content-types of responses
  // so we track the last 100 responses' headers to accomplish this
  // -prf
  session.defaultSession.webRequest.onCompleted(onCompleted)
}

export const WEBAPI = {
  createEventsStream,
  getInfo,
  checkForUpdates,
  restartBrowser,

  getUserSession,
  setUserSession,
  showEditProfileModal,

  getSetting,
  getSettings,
  setSetting,
  getUserSetupStatus,
  setUserSetupStatus,
  getDefaultLocalPath,
  setStartPageBackgroundImage,
  getDefaultProtocolSettings,
  setAsDefaultProtocolClient,
  removeAsDefaultProtocolClient,

  fetchBody,
  downloadURL,
  readFile,

  getResourceContentType,

  listBuiltinFavicons,
  getBuiltinFavicon,
  uploadFavicon,
  imageToIco,

  toggleSidebar,
  toggleLiveReloading,
  setWindowDimensions,
  setWindowDragModeEnabled,
  moveWindow,
  maximizeWindow,
  showOpenDialog,
  showContextMenu,
  async showModal (name, opts) {
    return modals.create(this.sender, name, opts)
  },
  gotoUrl,
  openUrl: (url, opts) => { openUrl(url, opts) }, // dont return anything
  openFolder,
  doWebcontentsCmd,
  doTest,
  closeModal: () => {} // DEPRECATED, probably safe to remove soon
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

function readFile (pathname, opts) {
  return new Promise((resolve, reject) => {
    fs.readFile(pathname, opts, (err, res) => {
      if (err) reject(err)
      else resolve(res)
    })
  })
}

export function getResourceContentType (url) {
  let i = url.indexOf('#')
  if (i !== -1) url = url.slice(0, i) // strip the fragment
  return resourceContentTypes.get(url)
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
  let favicon = dialog.showOpenDialog({
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

async function toggleSidebar () {
  var win = findWebContentsParentWindow(this.sender)
  viewManager.getActive(win).toggleSidebar()
}

export async function toggleLiveReloading () {
  var win = findWebContentsParentWindow(this.sender)
  viewManager.getActive(win).toggleLiveReloading()
}

export async function setWindowDimensions ({width, height} = {}) {
  var win = findWebContentsParentWindow(this.sender)
  var [currentWidth, currentHeight] = win.getSize()
  width = width || currentWidth
  height = height || currentHeight
  win.setSize(width, height)
}

var _dragModeIntervals = {}
export async function setWindowDragModeEnabled (enabled) {
  var win = findWebContentsParentWindow(this.sender)
  if (enabled) {
    if (win.id in _dragModeIntervals) return

    // poll the mouse cursor every 15ms
    var lastPt = screen.getCursorScreenPoint()
    _dragModeIntervals[win.id] = setInterval(() => {
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
        clearInterval(_dragModeIntervals[win.id])
        delete _dragModeIntervals[win.id]
      }
    }, 15)
  } else {
    // stop the poll
    if (!(win.id in _dragModeIntervals)) return
    clearInterval(_dragModeIntervals[win.id])
    delete _dragModeIntervals[win.id]
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
    let [httpHandler, datHandler] = await Promise.all([
      // If there is no default specified, be sure to catch any error
      // from exec and return '' otherwise Promise.all errors out.
      exec('xdg-mime query default "x-scheme-handler/http"').catch(err => ''),
      exec('xdg-mime query default "x-scheme-handler/dat"').catch(err => '')
    ])
    if (httpHandler && httpHandler.stdout) httpHandler = httpHandler.stdout
    if (datHandler && datHandler.stdout) datHandler = datHandler.stdout
    return {
      http: (httpHandler || '').toString().trim() === DOT_DESKTOP_FILENAME,
      dat: (datHandler || '').toString().trim() === DOT_DESKTOP_FILENAME
    }
  }

  return Promise.resolve(['http', 'dat'].reduce((res, x) => {
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
    }
  }
}

export function checkForUpdates (opts = {}) {
  // dont overlap
  if (updaterState != UPDATER_STATUS_IDLE) { return }

  // update global state
  debug('[AUTO-UPDATE] Checking for a new version.')
  updaterError = false
  setUpdaterState(UPDATER_STATUS_CHECKING)
  if (opts.prerelease) {
    debug('[AUTO-UPDATE] Jumping to pre-releases.')
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
    debug('[AUTO-UPDATE] Quitting and installing.')
  } else {
    debug('Restarting Beaker by restartBrowser()')
    // do a simple restart
    app.relaunch()
    setTimeout(() => app.exit(0), 1e3)
  }
}

async function getUserSession () {
  var sess = getUserSessionFor(this.sender)
  // get session user info
  if (!sess) return null
  return beakerCore.users.get(sess.url)
}

async function setUserSession (url) {
  // normalize the url
  var urlp = new URL(url)
  url = urlp.origin

  // lookup the user
  var user = await beakerCore.get(url)
  if (!user) throw new Error('Invalid user URL')

  // set the session
  var userSession = {url: user.url}
  setUserSessionFor(this.sender, userSession)
}

async function showEditProfileModal () {
  var sess = await getUserSession.call(this)
  return showShellModal(this.sender, 'edit-profile', sess)
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

const SCROLLBAR_WIDTH = 16
export async function capturePage (url, opts) {
  var width = opts.width || 1024
  var height = opts.height || 768

  var win = new BrowserWindow({
    width: width + SCROLLBAR_WIDTH,
    height,
    show: false,
    defaultEncoding: 'UTF-8',
    partition: 'session-' + Date.now() + Math.random(),
    preload: 'file://' + path.join(app.getAppPath(), 'webview-preload.build.js'),
    webPreferences: {
      webSecurity: true,
      allowRunningInsecureContent: false,
      nativeWindowOpen: true
    }
  })
  win.loadURL(url)

  // wait for load
  await new Promise((resolve, reject) => {
    win.webContents.on('did-finish-load', resolve)
  })
  await new Promise(r => setTimeout(r, 200)) // give an extra 200ms for rendering

  // capture the page
  var image = await new Promise((resolve, reject) => {
    win.webContents.capturePage({x: 0, y: 0, width, height}, resolve)
  })

  // resize if asked
  if (opts.resizeTo) {
    image = image.resize(opts.resizeTo)
  }

  return image.toPNG()
}

// rpc methods
// =

function createEventsStream () {
  return emitStream(browserEvents)
}

function showOpenDialog (opts = {}) {
  var wc = this.sender
  return new Promise((resolve) => {
    dialog.showOpenDialog({
      title: opts.title,
      buttonLabel: opts.buttonLabel,
      filters: opts.filters,
      properties: opts.properties,
      defaultPath: opts.defaultPath
    }, filenames => {
      wc.focus() // return focus back to the the page
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
    if (beakerCore.getEnvVar('NODE_ENV') === 'develop' || beakerCore.getEnvVar('NODE_ENV') === 'test') {
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
    var win = findWebContentsParentWindow(this.sender)
    var menu = Menu.buildFromTemplate(menuDefinition)
    menu.popup({window: win})
    resolve(selection)
  })
}

async function gotoUrl (url) {
  var win = findWebContentsParentWindow(this.sender)
  viewManager.getActive(win).loadURL(url)
}

function openFolder (folderPath) {
  shell.openExternal('file://' + folderPath)
}

async function getDefaultLocalPath (dir, title) {
  // massage the title
  title = typeof title === 'string' ? title : ''
  title = title.replace(INVALID_SAVE_FOLDER_CHAR_REGEX, '')
  if (!title.trim()) {
    title = 'Untitled'
  }
  title = slugify(title).toLowerCase()

  // find an available variant of title
  let tryNum = 1
  let titleVariant = title
  while (await jetpack.existsAsync(path.join(dir, titleVariant))) {
    titleVariant = `${title}-${++tryNum}`
  }
  return path.join(dir, titleVariant)
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

function setUpdaterState (state) {
  updaterState = state
  browserEvents.emit('updater-state-changed', {state})
}

function getAutoUpdaterFeedSettings () {
  return {
    provider: 'github',
    repo: 'beaker',
    owner: 'beakerbrowser',
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
  debug('[AUTO-UPDATE] New version available. Downloading...')
  autoUpdater.downloadUpdate()
  setUpdaterState(UPDATER_STATUS_DOWNLOADING)
}

function onUpdateNotAvailable () {
  debug('[AUTO-UPDATE] No browser update available.')
  setUpdaterState(UPDATER_STATUS_IDLE)
}

function onUpdateDownloaded () {
  debug('[AUTO-UPDATE] New browser version downloaded. Ready to install.')
  setUpdaterState(UPDATER_STATUS_DOWNLOADED)
}

function onUpdateError (e) {
  console.error(e)
  debug('[AUTO-UPDATE] error', e.toString(), e)
  setUpdaterState(UPDATER_STATUS_IDLE)
  updaterError = {message: (e.toString() || '').split('\n')[0]}
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

function onUserThumbChanged (user) {
  browserEvents.emit('user-thumb-changed', user)
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

function onCompleted (details) {
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
