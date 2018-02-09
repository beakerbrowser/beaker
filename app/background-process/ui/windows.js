import { app, BrowserWindow, ipcMain, webContents, dialog } from 'electron'
import EventEmitter from 'events';
import { register as registerShortcut, unregister as unregisterShortcut, unregisterAll as unregisterAllShortcuts } from 'electron-localshortcut'
import os from 'os'
import jetpack from 'fs-jetpack'
import * as keybindings from './keybindings'
import path from 'path'
import * as openURL from '../open-url'
import * as downloads from './downloads'
import * as permissions from './permissions'
import {debounce} from '../../lib/functions'

const IS_WIN = process.platform === 'win32'

// globals
// =
var userDataDir
var stateStoreFile = 'shell-window-state.json'
var numActiveWindows = 0;
let firstWindow = null;
let sessionWatcher = null;
const ICON_PATH = path.join(__dirname, (process.platform === 'win32') ?
                    './assets/img/logo.ico' : './assets/img/logo.png');

let windowSetState;

// exported methods
// =

export function setup () {
  // DEBUG
  app.on('browser-window-focus', () => console.log('[app] browser-window-focus'))
  ipcMain.on('shell-window:pages-ready', () => console.log('[ipc] shell-window:pages-ready'))
  ipcMain.on('shell-window:ready', () => console.log('[ipc] shell-window:ready'))
  // config
  userDataDir = jetpack.cwd(app.getPath('userData'))

  // set up app events
  app.on('activate', () => {
    // wait for ready (not waiting can trigger errors)
    if (app.isReady()) ensureOneWindowExists()
    else app.on('ready', ensureOneWindowExists)
  })
  app.on('open-url', (e, url) => {
    // wait for ready (not waiting can trigger errors)
    if (app.isReady()) openURL.open(url)
    else app.on('ready', () => openURL.open(url))
  })
  ipcMain.on('new-window', createShellWindow)

  app.on('before-quit', async e => {
    sessionWatcher.stopRecording()
  })

  app.on('web-contents-created', (e, wc) => {
    // if this is a webview's web contents, attach the keybinding protections
    if (wc.hostWebContents) {
      const parentWindow = BrowserWindow.fromWebContents(wc.hostWebContents)
      wc.on('before-input-event', keybindings.createBeforeInputEventHandler(parentWindow))
    }
  })

  ipcMain.on('shell-window:ready', ({ sender }) => {
    if (sender.id === firstWindow) {
      // if this is the first window opened (since app start or since all windows closing)
      sender.send('command', 'load-pinned-tabs')
      BrowserWindow.fromId(sender.id).focus()
    }
  })

  sessionWatcher = new SessionWatcher();

  if (true /* previous session crashed */ && userWantsToRestoreSession()) {
    restoreBrowsingSession()
  } else {
    createShellWindow()
  }
}

export function createShellWindow (windowState) {
  // create window
  let state = ensureVisibleOnSomeDisplay(Object.assign({}, defaultWindowState(), windowState))
  var { x, y, width, height } = state
  var win = new BrowserWindow({
    titleBarStyle: 'hidden-inset',
    autoHideMenuBar: true,
    fullscreenable: true,
    fullscreenWindowTitle: true,
    frame: !IS_WIN,
    x,
    y,
    width,
    height,
    defaultEncoding: 'UTF-8',
    webPreferences: {
      webSecurity: false, // disable same-origin-policy in the shell window, webviews have it restored
      allowRunningInsecureContent: false,
      nativeWindowOpen: true
    },
    icon: ICON_PATH
  })
  downloads.registerListener(win)
  win.loadURL('beaker://shell-window')
  sessionWatcher.watchWindow(win, state)

  function handlePagesReady({ sender }) {
    if (sender === win.webContents) {
      win.webContents.send('command', 'initialize', state.pages)
    }
  }

  numActiveWindows++

  if (numActiveWindows === 1) {
    firstWindow = win.webContents.id
    console.log('first shell')
  }

  ipcMain.on('shell-window:pages-ready', handlePagesReady)
  win.on('closed', () => {
    ipcMain.removeListener('shell-window:pages-ready', handlePagesReady)
  })

  // register shortcuts
  for (var i = 1; i <= 8; i++) { registerShortcut(win, 'CmdOrCtrl+' + i, onTabSelect(win, i - 1)) }
  registerShortcut(win, 'CmdOrCtrl+9', onLastTab(win))
  registerShortcut(win, 'Ctrl+Tab', onNextTab(win))
  registerShortcut(win, 'Ctrl+Shift+Tab', onPrevTab(win))
  registerShortcut(win, 'Ctrl+PageUp', onPrevTab(win))
  registerShortcut(win, 'Ctrl+PageDown', onNextTab(win))
  registerShortcut(win, 'CmdOrCtrl+[', onGoBack(win))
  registerShortcut(win, 'CmdOrCtrl+]', onGoForward(win))

  // register event handlers
  win.on('scroll-touch-begin', sendScrollTouchBegin)
  win.on('scroll-touch-end', sendToWebContents('scroll-touch-end'))
  win.on('focus', sendToWebContents('focus'))
  win.on('blur', sendToWebContents('blur'))
  win.on('enter-full-screen', e => {
    registerShortcut(win, 'Esc', onEscape(win))
    sendToWebContents('enter-full-screen')(e)
  })
  win.on('leave-full-screen', e => {
    unregisterShortcut(win, 'Esc')
    sendToWebContents('leave-full-screen')(e)
  })
  win.on('closed', onClosed(win))

  return win
}

export function getActiveWindow () {
  // try to pull the focused window; if there isnt one, fallback to the last created
  var win = BrowserWindow.getFocusedWindow()
  if (!win) {
    win = BrowserWindow.getAllWindows().pop()
  }
  return win
}

export async function getFocusedWebContents (win) {
  win = win || getActiveWindow()
  var id = await win.webContents.executeJavaScript(`
    (function () {
      var webview = document.querySelector('webview:not(.hidden)')
      return webview && webview.getWebContents().id
    })()
  `)
  if (id) {
    return webContents.fromId(id)
  }
}

export function ensureOneWindowExists () {
  if (numActiveWindows === 0) {
    createShellWindow()
  }
}

// internal methods
// =

function openTab (location) {
  return () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      let win = createShellWindow()
      if (location) {
        ipcMain.once('shell-window:ready', () => {
          win.webContents.send('command', 'file:new-tab', location)
        })
      }
    } else {
      let win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
      if (win) win.webContents.send('command', 'file:new-tab', location)
    }
  }
}

function getCurrentPosition (win) {
  var position = win.getPosition()
  var size = win.getSize()
  return {
    x: position[0],
    y: position[1],
    width: size[0],
    height: size[1]
  }
}

function windowWithinBounds (windowState, bounds) {
  return windowState.x >= bounds.x &&
    windowState.y >= bounds.y &&
    windowState.x + windowState.width <= bounds.x + bounds.width &&
    windowState.y + windowState.height <= bounds.y + bounds.height
}

function userWantsToRestoreSession () {
  let answer = dialog.showMessageBox({
    type: "question",
    message: "Sorry! It Looks Like Beaker Crashed",
    detail: "Would you like to restore your previous browsing session?",
    buttons: [ "Restore Session", "Cancel" ],
    defaultId: 0,
    icon: ICON_PATH
  })
  return answer === 0
}

function restoreBrowsingSession() {
  windowSetState = restoreWindowSetState()
  restoreWindowSet(windowSetState)
}

function restoreWindowSetState() {
  var restoredState = {}
  try {
    restoredState = userDataDir.read(stateStoreFile, 'json')
  } catch (err) {
    // For some reason json can't be read (might be corrupted).
    // No worries, we have defaults.
  }
  return Object.assign({}, defaultWindowSetState(), restoredState)
}

function restoreWindowSet(windowSetState) {
  let { windows } = windowSetState;
  if (windows.length) {
    for (let windowState of windows) {
      if (windowState) createShellWindow(windowState)
    }
  } else {
    createShellWindow();
  }
}

function defaultWindowSetState() {
  return {
    windows: [ defaultWindowState() ]
  }
}

function defaultWindowState () {
  // HACK
  // for some reason, electron.screen comes back null sometimes
  // not sure why, shouldn't be happening
  // check for existence for now, see #690
  // -prf
  const screen = getScreenAPI()
  var bounds = screen ? screen.getPrimaryDisplay().bounds : {width: 800, height: 600}
  var width = Math.max(800, Math.min(1800, bounds.width - 50))
  var height = Math.max(600, Math.min(1200, bounds.height - 50))
  return {
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
    width,
    height,
    pages: defaultPageState()
  }
}

function defaultPageState () {
  return [ 'beaker://start' ]
}

function ensureVisibleOnSomeDisplay (windowState) {
  // HACK
  // for some reason, electron.screen comes back null sometimes
  // not sure why, shouldn't be happening
  // check for existence for now, see #690
  // -prf
  const screen = getScreenAPI()
  var visible = screen && screen.getAllDisplays().some(display => windowWithinBounds(windowState, display.bounds))
  if (!visible) {
    // Window is partially or fully not visible now.
    // Reset it to safe defaults.
    return defaultWindowState(windowState)
  }
  return windowState
}

// shortcut event handlers
// =

function onClosed (win) {
  return e => {
    numActiveWindows--

    // deny any outstanding permission requests
    permissions.denyAllRequests(win)

    // unregister shortcuts
    unregisterAllShortcuts(win)
  }
}

function onTabSelect (win, tabIndex) {
  return () => win.webContents.send('command', 'set-tab', tabIndex)
}

function onLastTab (win) {
  return () => win.webContents.send('command', 'window:last-tab')
}

function onNextTab (win) {
  return () => win.webContents.send('command', 'window:next-tab')
}

function onPrevTab (win) {
  return () => win.webContents.send('command', 'window:prev-tab')
}

function onGoBack (win) {
  return () => win.webContents.send('command', 'history:back')
}

function onGoForward (win) {
  return () => win.webContents.send('command', 'history:forward')
}

function onEscape (win) {
  return () => win.webContents.send('window-event', 'leave-page-full-screen')
}

// window event handlers
// =

function sendToWebContents (event) {
  return e => e.sender.webContents.send('window-event', event)
}

function sendScrollTouchBegin (e) {
  // get the cursor x/y within the window
  const screen = getScreenAPI()
  if (!screen) return
  var cursorPos = screen.getCursorScreenPoint()
  var winPos = e.sender.getBounds()
  cursorPos.x -= winPos.x; cursorPos.y -= winPos.y
  e.sender.webContents.send('window-event', 'scroll-touch-begin', {
    cursorX: cursorPos.x,
    cursorY: cursorPos.y
  })
}

// helpers
// =

function getScreenAPI () {
  return require('electron').screen
}

const SNAPSHOT_PATH = 'shell-window-state.json';

class SessionWatcher {
  static get emptySnapshot() {
    return {
      windows: [],
      // We set this to false by default and clean this up when the session
      // exits. If we ever open up a snapshot and this isn't cleaned up assume
      // there was a crash
      clean_exit: false
    }
  }

  constructor () {
    this.snapshot = SessionWatcher.emptySnapshot
    this.recording = true
  }

  startRecording() { this.recording = true }
  stopRecording() { this.recording = false }

  watchWindow(win, initialState) {
    let state = initialState
    this.snapshot.windows.push(state)
    let watcher = new WindowWatcher(win, initialState)

    watcher.on('change', (nextState) => {
      if (this.recording) {
        let { windows } = this.snapshot
        let i = windows.indexOf(state);
        state = windows[i] = nextState;
        this.writeSnapshot();
      }
    })

    watcher.on('remove', () => {
      if (this.recording) {
        let { windows } = this.snapshot
        let i = windows.indexOf(state);
        this.snapshot.windows = windows.splice(1, i);
        this.writeSnapshot();
      }
      watcher.removeAllListeners();
    })
  }

  writeSnapshot () {
    userDataDir.write(SNAPSHOT_PATH, this.snapshot, { atomic: true })
    console.log('[watchers] write:', this.snapshot)
  }
}

class WindowWatcher extends EventEmitter {
  constructor(win, initialState) {
    super();
    this.handleClosed = this.handleClosed.bind(this)
    this.handlePagesUpdated = this.handlePagesUpdated.bind(this)
    this.handlePositionChange = this.handlePositionChange.bind(this)

    // right now this class trusts that the initial state is correctly formed by this point
    this.snapshot = initialState;
    this.winId = win.id;
    win.on('closed', this.handleClosed)
    win.on('resize', debounce(this.handlePositionChange, 1000))
    win.on('moved', this.handlePositionChange)
    ipcMain.on('shell-window:pages-updated', this.handlePagesUpdated)
  }

  getWindow () {
    return BrowserWindow.fromId(this.winId)
  }

  /*==========*\
  *  Handlers  *
  \*==========*/

  handleClosed() {
    ipcMain.removeListener('shell-window:pages-updated', this.handlePagesUpdated)
    this.emit('remove')
  }

  handlePagesUpdated({ sender }, pages) {
    if (sender === this.getWindow().webContents) {
      this.snapshot.pages = (pages && pages.length) ? pages : defaultPageState()
      console.log('[watchers] pages:', this.snapshot.pages)
      this.emit('change', this.snapshot)
    }
  }

  handlePositionChange() {
    Object.assign(this.snapshot, getCurrentPosition(this.getWindow()))
    this.emit('change', this.snapshot)
  }
}
