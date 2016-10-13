import { app, BrowserWindow, screen, ipcMain } from 'electron'
import { register as registerShortcut, unregisterAll as unregisterAllShortcuts } from 'electron-localshortcut'
import jetpack from 'fs-jetpack'
import path from 'path'
import * as downloads from './downloads'
import * as permissions from './permissions'
import log from 'loglevel'

// globals
// =
var userDataDir
var stateStoreFile = 'shell-window-state.json'
var numActiveWindows = 0

// exported methods
// =

export function setup () {
  // config
  userDataDir = jetpack.cwd(app.getPath('userData'))

  // load pinned tabs
  ipcMain.on('shell-window-ready', e => {
    // if this is the first window opened (since app start or since all windows closing)
    if (numActiveWindows === 1) {
      e.sender.webContents.send('command', 'load-pinned-tabs')
    }
  })

  // create first shell window
  return createShellWindow()
}

export function createShellWindow () {
  // create window
  var { x, y, width, height } = ensureVisibleOnSomeDisplay(restoreState())
  var win = new BrowserWindow({ 
    titleBarStyle: 'hidden-inset',
    'standard-window': false,
    x, y, width, height,
    webPreferences: {
      webSecurity: false, // disable same-origin-policy in the shell window, webviews have it restored
      allowRunningInsecureContent: false
    }
  })
  downloads.registerListener(win)
  loadURL(win, 'beaker:shell-window')
  numActiveWindows++

  // register shortcuts
  for (var i=1; i <= 9; i++)
    registerShortcut(win, 'CmdOrCtrl+'+i, onTabSelect(win, i-1))
  registerShortcut(win, 'Ctrl+Tab', onNextTab(win))
  registerShortcut(win, 'Ctrl+Shift+Tab', onPrevTab(win))

  // register event handlers
  win.on('scroll-touch-begin', sendToWebContents('scroll-touch-begin'))
  win.on('scroll-touch-end', sendToWebContents('scroll-touch-end'))
  win.on('focus', sendToWebContents('focus'))
  win.on('blur', sendToWebContents('blur'))
  win.on('enter-full-screen', sendToWebContents('enter-full-screen'))
  win.on('leave-full-screen', sendToWebContents('leave-full-screen'))
  win.on('close', onClose(win))

  return win
}

// internal methods
// =

function loadURL (win, url) {
  win.loadURL(url)
  log.debug('Opening', url)  
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

function restoreState () {
  var restoredState = {}
  try {
    restoredState = userDataDir.read(stateStoreFile, 'json')
  } catch (err) {
    // For some reason json can't be read (might be corrupted).
    // No worries, we have defaults.
  }
  return Object.assign({}, defaultState(), restoredState)
}

function defaultState () {
  var bounds = screen.getPrimaryDisplay().bounds
  var width = Math.max(800, Math.min(1800, bounds.width - 50))
  var height = Math.max(600, Math.min(1200, bounds.height - 50))
  return Object.assign({}, {
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
    width,
    height
  })
}

function ensureVisibleOnSomeDisplay (windowState) {
  var visible = screen.getAllDisplays().some(display => windowWithinBounds(windowState, display.bounds))
  if (!visible) {
    // Window is partially or fully not visible now.
    // Reset it to safe defaults.
    return defaultState(windowState)
  }
  return windowState
}

function onClose (win) {
  return e => {
    numActiveWindows--

    // deny any outstanding permission requests
    permissions.denyAllRequests(win)

    // unregister shortcuts
    unregisterAllShortcuts(win)

    // save state
    // NOTE this is called by .on('close')
    // if quitting multiple windows at once, the final saved state is unpredictable
    if (!win.isMinimized() && !win.isMaximized()) {
      var state = getCurrentPosition(win)
      userDataDir.write(stateStoreFile, state, { atomic: true })
    }
  }
}

// shortcut event handlers
// =

function onTabSelect (win, tabIndex) {
  return () => win.webContents.send('command', 'set-tab', tabIndex)
}

function onNextTab (win) {
  return () => win.webContents.send('command', 'window:next-tab')
}
function onPrevTab (win) {
  return () => win.webContents.send('command', 'window:prev-tab')
}

// window event handlers
// =

function sendToWebContents (event) {
  return e => e.sender.webContents.send('window-event', event)
}