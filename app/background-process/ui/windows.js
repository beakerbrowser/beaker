import * as beakerCore from '@beaker/core'
import {app, BrowserWindow, ipcMain, webContents, dialog} from 'electron'
import {register as registerShortcut, unregister as unregisterShortcut, unregisterAll as unregisterAllShortcuts} from 'electron-localshortcut'
import {defaultBrowsingSessionState, defaultWindowState} from './default-state'
import SessionWatcher from './session-watcher'
import jetpack from 'fs-jetpack'
import * as keybindings from './keybindings'
import path from 'path'
import * as openURL from '../open-url'
import * as downloads from './downloads'
import * as permissions from './permissions'
const settingsDb = beakerCore.dbs.settings

const IS_WIN = process.platform === 'win32'

// globals
// =
let userDataDir
let numActiveWindows = 0
let firstWindow = null
let sessionWatcher = null
let focusedDevtoolsHost
const BROWSING_SESSION_PATH = './shell-window-state.json'
const ICON_PATH = path.join(__dirname, (process.platform === 'win32') ? './assets/img/logo.ico' : './assets/img/logo.png')

// exported methods
// =

export async function setup () {
  // config
  userDataDir = jetpack.cwd(app.getPath('userData'))

  // set up app events
  app.on('activate', () => {
    // wait for ready (not waiting can trigger errors)
    if (app.isReady()) ensureOneWindowExists()
    else app.on('ready', ensureOneWindowExists)
  })
  ipcMain.on('new-window', () => createShellWindow())
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  openURL.setup()

  app.on('before-quit', async e => {
    sessionWatcher.exit()
    sessionWatcher.stopRecording()
  })

  app.on('web-contents-created', (e, wc) => {
    if (wc.hostWebContents) {
      // attach keybinding protections
      const parentWindow = BrowserWindow.fromWebContents(wc.hostWebContents)
      wc.on('before-input-event', keybindings.createBeforeInputEventHandler(parentWindow))

      // HACK
      // add link-click handling to page devtools
      // (it would be much better to update Electron to support this, rather than overriding like this)
      // -prf
      wc.on('devtools-opened', () => {
        if (wc.devToolsWebContents) {
          wc.devToolsWebContents.executeJavaScript('InspectorFrontendHost.openInNewTab = (url) => window.open(url)')
          wc.devToolsWebContents.on('new-window', (e, url) => {
            wc.hostWebContents.send('command', 'file:new-tab', url)
          })
        }
      })

      // track focused devtools host
      wc.on('devtools-focused', () => { focusedDevtoolsHost = wc })
      wc.on('devtools-closed', unfocusDevtoolsHost)
      wc.on('destroyed', unfocusDevtoolsHost)
      function unfocusDevtoolsHost () {
        if (focusedDevtoolsHost === wc) {
          focusedDevtoolsHost = undefined
        }
      }
    }
  })

  ipcMain.on('shell-window:ready', ({ sender }) => {
    if (sender.id === firstWindow) {
      // if this is the first window opened (since app start or since all windows closing)
      sender.send('command', 'load-pinned-tabs')
    }
  })

  let previousSessionState = getPreviousBrowsingSession()
  sessionWatcher = new SessionWatcher(userDataDir)
  let customStartPage = await settingsDb.get('custom_start_page')
  let isTestDriverActive = !!beakerCore.getEnvVar('BEAKER_TEST_DRIVER')
  let isOpenUrlEnvVar = !!beakerCore.getEnvVar('BEAKER_OPEN_URL')

  if (!isTestDriverActive && !isOpenUrlEnvVar && (customStartPage === 'previous' || !previousSessionState.cleanExit && userWantsToRestoreSession())) {
    // restore old window
    restoreBrowsingSession(previousSessionState)
  } else {
    let opts = {}
    if (previousSessionState.windows[0]) {
      // use the last session's window position
      let {x, y, width, height} = previousSessionState.windows[0]
      opts.x = x
      opts.y = y
      opts.width = width
      opts.height = height
    }
    if (isOpenUrlEnvVar) {
      // use the env var if specified
      opts.pages = [beakerCore.getEnvVar('BEAKER_OPEN_URL')]
    }
    // create new window
    createShellWindow(opts)
  }
}

export function createShellWindow (windowState) {
  // create window
  let state = ensureVisibleOnSomeDisplay(Object.assign({}, defaultWindowState(), windowState))
  var { x, y, width, height, minWidth, minHeight } = state
  var win = new BrowserWindow({
    titleBarStyle: 'hiddenInset',
    autoHideMenuBar: true,
    fullscreenable: true,
    fullscreenWindowTitle: true,
    frame: !IS_WIN,
    x,
    y,
    width,
    height,
    minWidth,
    minHeight,
    backgroundColor: '#ddd',
    defaultEncoding: 'UTF-8',
    webPreferences: {
      webSecurity: false, // disable same-origin-policy in the shell window, webviews have it restored
      allowRunningInsecureContent: false,
      nativeWindowOpen: true
    },
    icon: ICON_PATH,
    show: false // will show when ready
  })
  win.once('ready-to-show', () => win.show())
  downloads.registerListener(win)
  win.loadURL('beaker://shell-window')
  sessionWatcher.watchWindow(win, state)

  function handlePagesReady ({ sender }) {
    if (win && !win.isDestroyed() && sender === win.webContents) {
      win.webContents.send('command', 'initialize', state.pages)
    }
  }

  numActiveWindows++

  if (numActiveWindows === 1) {
    firstWindow = win.webContents.id
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
  registerShortcut(win, 'alt+d', onFocusLocation(win))

  // register event handlers
  win.on('browser-backward', onGoBack(win))
  win.on('browser-forward', onGoForward(win))
  win.on('scroll-touch-begin', sendScrollTouchBegin)
  win.on('scroll-touch-end', sendToWebContents('scroll-touch-end'))
  win.on('focus', sendToWebContents('focus'))
  win.on('blur', sendToWebContents('blur'))
  win.on('app-command', (e, cmd) => { onAppCommand(win, e, cmd) })
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

export function getFocusedDevToolsHost () {
  // check first if it's the shell window's devtools
  let win = BrowserWindow.getAllWindows().find(w => w.webContents.isDevToolsFocused())
  if (win) return win.webContents
  // fallback to our manually tracked devtools host
  return focusedDevtoolsHost
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

function windowWithinBounds (windowState, bounds) {
  return windowState.x >= bounds.x &&
    windowState.y >= bounds.y &&
    windowState.x + windowState.width <= bounds.x + bounds.width &&
    windowState.y + windowState.height <= bounds.y + bounds.height
}

function userWantsToRestoreSession () {
  let answer = dialog.showMessageBox({
    type: 'question',
    message: 'Sorry! It looks like Beaker crashed',
    detail: 'Would you like to restore your previous browsing session?',
    buttons: [ 'Restore Session', 'Start New Session' ],
    defaultId: 0,
    icon: ICON_PATH
  })
  return answer === 0
}

function restoreBrowsingSession (previousSessionState) {
  let { windows } = previousSessionState
  if (windows.length) {
    for (let windowState of windows) {
      if (windowState) createShellWindow(windowState)
    }
  } else {
    createShellWindow()
  }
}

function getPreviousBrowsingSession () {
  var restoredState = {}
  try {
    restoredState = userDataDir.read(BROWSING_SESSION_PATH, 'json')
  } catch (err) {
    // For some reason json can't be read (might be corrupted).
    // No worries, we have defaults.
  }
  return Object.assign({}, defaultBrowsingSessionState(), restoredState)
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

function onFocusLocation (win) {
  return () => win.webContents.send('command', 'file:open-location')
}

function onAppCommand (win, e, cmd) {
  // handles App Command events (Windows)
  // see https://electronjs.org/docs/all#event-app-command-windows
  switch (cmd) {
    case 'browser-backward':
      win.webContents.send('command', 'history:back')
      break
    case 'browser-forward':
      win.webContents.send('command', 'history:forward')
      break
    default:
      break
  }
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
