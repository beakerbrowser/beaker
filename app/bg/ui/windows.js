import {app, BrowserWindow, BrowserView, ipcMain, webContents, dialog} from 'electron'
import {defaultBrowsingSessionState, defaultWindowState} from './default-state'
import SessionWatcher from './session-watcher'
import jetpack from 'fs-jetpack'
import * as tabManager from './tab-manager'
import {
  createGlobalKeybindingsHandler,
  createKeybindingProtectionsHandler,
  registerGlobalKeybinding
} from './keybindings'
import path from 'path'
import * as openURL from '../open-url'
import * as downloads from './downloads'
import * as permissions from './permissions'
import * as statusBarSubwindow from './subwindows/status-bar'
import * as shellMenusSubwindow from './subwindows/shell-menus'
import * as locationBarSubwindow from './subwindows/location-bar'
import * as promptsSubwindow from './subwindows/prompts'
import * as permPromptSubwindow from './subwindows/perm-prompt'
import * as modalsSubwindow from './subwindows/modals'
import * as sidebarsSubwindow from './subwindows/sidebars'
import * as siteInfoSubwindow from './subwindows/site-info'
import * as tabSwitcherSubwindow from './subwindows/tab-switcher'
import { findWebContentsParentWindow } from '../lib/electron'
import * as settingsDb from '../dbs/settings'
import { getEnvVar } from '../lib/env'
import * as users from '../filesystem/users'
import _pick from 'lodash.pick'

const IS_WIN = process.platform === 'win32'
const subwindows = {
  statusBar: statusBarSubwindow,
  locationBar: locationBarSubwindow,
  menu: shellMenusSubwindow,
  prompts: promptsSubwindow,
  permPrompt: permPromptSubwindow,
  modals: modalsSubwindow,
  sidebars: sidebarsSubwindow,
  siteInfo: siteInfoSubwindow,
  tabSwitcher: tabSwitcherSubwindow
}

// globals
// =

var userDataDir
var numActiveWindows = 0
var firstWindow = null
var sessionWatcher = null
var focusedDevtoolsHost
var hasFirstWindowLoaded = false
var isTabSwitcherActive = {} // map of {[window.id] => Boolean}
const BROWSING_SESSION_PATH = './shell-window-state.json'
export const ICON_PATH = path.join(__dirname, (process.platform === 'win32') ? './assets/img/logo.ico' : './assets/img/logo.png')
export const PRELOAD_PATH = path.join(__dirname, 'fg', 'shell-window', 'index.build.js')

// exported methods
// =

export async function setup () {
  // config
  userDataDir = jetpack.cwd(app.getPath('userData'))
  sessionWatcher = new SessionWatcher(userDataDir)
  var previousSessionState = getPreviousBrowsingSession()
  var customStartPage = await settingsDb.get('custom_start_page')
  var isTestDriverActive = !!getEnvVar('BEAKER_TEST_DRIVER')
  var isOpenUrlEnvVar = !!getEnvVar('BEAKER_OPEN_URL')

  // set up app events
  app.on('activate', () => {
    // wait for ready (not waiting can trigger errors)
    if (app.isReady()) ensureOneWindowExists()
    else app.on('ready', ensureOneWindowExists)
  })
  ipcMain.on('new-window', () => createShellWindow())
  app.on('custom-window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  openURL.setup()
  tabManager.setup()

  app.on('before-quit', async e => {
    sessionWatcher.exit()
    sessionWatcher.stopRecording()
  })

  app.on('web-contents-created', async (e, wc) => {
    // await setup
    await new Promise(resolve => wc.once('did-start-loading', resolve))

    // handle shell-window webcontents
    const window = BrowserWindow.fromWebContents(wc)
    if (window) {
      // attach global keybindings
      wc.on('before-input-event', globalTabSwitcherKeyHandler)
      wc.on('before-input-event', createGlobalKeybindingsHandler(window))
      return
    }

    // handle tab & sidebar webcontents
    var parentView = BrowserView.fromWebContents(wc)
    if (!parentView) return
    var parentWindow = findWebContentsParentWindow(parentView)
    if (!parentWindow) {
      parentWindow = tabManager.findContainingWindow(parentView)
      if (!parentWindow) {
        return 
      }
    }

    // attach global keybindings
    wc.on('before-input-event', globalTabSwitcherKeyHandler)
    wc.on('before-input-event', createGlobalKeybindingsHandler(parentWindow))
    wc.on('before-input-event', createKeybindingProtectionsHandler(parentWindow))

    // HACK
    // add link-click handling to page devtools
    // (it would be much better to update Electron to support this, rather than overriding like this)
    // -prf
    wc.on('devtools-opened', () => {
      if (wc.devToolsWebContents) {
        wc.devToolsWebContents.executeJavaScript('InspectorFrontendHost.openInNewTab = (url) => window.open(url)')
        wc.devToolsWebContents.on('new-window', (e, url) => {
          if (url.startsWith('chrome-devtools://')) return // ignore
          tabManager.create(parentWindow, url, {setActive: true})
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
  })

  if (!isTestDriverActive && !isOpenUrlEnvVar && (customStartPage === 'previous' || (!previousSessionState.cleanExit && userWantsToRestoreSession()))) {
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
      opts.pages = [getEnvVar('BEAKER_OPEN_URL')]
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
    webPreferences: {
      preload: PRELOAD_PATH,
      defaultEncoding: 'utf-8',
      nodeIntegration: false,
      contextIsolation: false,
      webviewTag: false,
      sandbox: true,
      webSecurity: false, // disable same-origin-policy in the shell window, webviews have it restored
      // enableRemoteModule: false, TODO would prefer this were true, but shell window needs this to get the webviews' webContents IDs -prf
      allowRunningInsecureContent: false,
      nativeWindowOpen: true
    },
    icon: ICON_PATH,
    show: false // will show when ready
  })
  win.once('ready-to-show', () => {
    win.show()
    if (!hasFirstWindowLoaded) {
      hasFirstWindowLoaded = true
      app.emit('custom-ready-to-show')
    }
  })
  for (let k in subwindows) {
    subwindows[k].setup(win)
  }
  downloads.registerListener(win)
  win.loadURL('beaker://shell-window')
  sessionWatcher.watchWindow(win, state)

  // load the user session
  if (!isValidUserSession(state.userSession)) {
    users.getDefault().then(defaultUser => {
      if (defaultUser) {
        setUserSessionFor(win.webContents, {url: defaultUser.url})
      }
    })
  }

  numActiveWindows++
  if (numActiveWindows === 1) {
    firstWindow = win.webContents.id
  }

  ipcMain.on('shell-window:ready', handlePagesReady)
  win.on('close', () => {
    ipcMain.removeListener('shell-window:ready', handlePagesReady)
    for (let k in subwindows) {
      subwindows[k].destroy(win)
    }
  })

  async function handlePagesReady ({ sender }) {
    if (!win || win.isDestroyed()) return

    if (sender === win.webContents) {
      if (win.webContents.id === firstWindow) {
        // if this is the first window opened (since app start or since all windows closing)
        tabManager.loadPins(win)
      }
      tabManager.initializeFromSnapshot(win, state.pages)
      win.emit('custom-pages-ready')

      // DISABLED
      // not sure whether we'll need this
      // -prf
      // run setup modal
      // let isTestDriverActive = !!getEnvVar('BEAKER_TEST_DRIVER')
      // let hasDoneSetup = Number(await sitedataDb.get('beaker://shell-window', 'has_done_setup')) === 1
      // if (!!getEnvVar('BEAKER_RUN_SETUP_FLOW')) {
      //   hasDoneSetup = false
      // }
      // if (!isTestDriverActive && !hasDoneSetup) {
      //   subwindows.modals.create(win.webContents, 'setup')
      //   await sitedataDb.set('beaker://shell-window', 'has_done_setup', 1)
      // }
    }
  }

  // register shortcuts
  for (var i = 1; i <= 8; i++) { registerGlobalKeybinding(win, 'CmdOrCtrl+' + i, onTabSelect(i - 1)) }
  registerGlobalKeybinding(win, 'CmdOrCtrl+9', onLastTab)
  registerGlobalKeybinding(win, 'Ctrl+PageUp', onPrevTab)
  registerGlobalKeybinding(win, 'Ctrl+PageDown', onNextTab)
  registerGlobalKeybinding(win, 'CmdOrCtrl+[', onGoBack)
  registerGlobalKeybinding(win, 'CmdOrCtrl+]', onGoForward)
  registerGlobalKeybinding(win, 'Alt+D', onFocusLocation)
  registerGlobalKeybinding(win, 'F5', onReload)
  registerGlobalKeybinding(win, 'F6', onFocusLocation)

  // register event handlers
  win.on('browser-backward', onGoBack)
  win.on('browser-forward', onGoForward)
  // win.on('scroll-touch-begin', sendScrollTouchBegin) // TODO readd?
  // win.on('scroll-touch-end', sendToWebContents('scroll-touch-end')) // TODO readd?
  win.on('focus', e => {
    // sendToWebContents('focus')(e) TODO readd?
    var active = tabManager.getActive(win)
    if (active) active.focus()
  })
  win.on('blur', e => {
    statusBarSubwindow.set(win, false) // hide the statusbar on blur
    // sendToWebContents('blur')(e) TODO readd?
  })
  win.on('app-command', (e, cmd) => { onAppCommand(win, e, cmd) })
  win.on('enter-full-screen', e => {
    // update UI
    tabManager.emitReplaceState(win)

    // TODO
    // registerGlobalKeybinding(win, 'Esc', onEscape(win))
    // sendToWebContents('enter-full-screen')(e)
  })
  win.on('leave-full-screen', e => {
    // update UI
    tabManager.emitReplaceState(win)

    // TODO
    // unregisterGlobalKeybinding(win, 'Esc')
    // sendToWebContents('leave-full-screen')(e)
  })
  function onMaxChange () {
    tabManager.resize(win)
    // on ubuntu, the maximize/unmaximize animations require multiple resizings
    setTimeout(() => tabManager.resize(win), 250)
    setTimeout(() => tabManager.resize(win), 500)
  }
  win.on('maximize', onMaxChange)
  win.on('unmaximize', onMaxChange)
  win.on('resize', () => {
    tabManager.resize(win)
    for (let k in subwindows) {
      subwindows[k].reposition(win)
    }
  })
  win.on('move', () => {
    for (let k in subwindows) {
      subwindows[k].reposition(win)
    }
  })
  win.on('close', onClose(win))

  return win
}

export function getActiveWindow () {
  // try to pull the `focus`ed window; if there isnt one, fallback to the last created
  var win = BrowserWindow.getFocusedWindow()
  if (!win || win.webContents.getURL() !== 'beaker://shell-window/') {
    win = BrowserWindow.getAllWindows().filter(win => win.webContents.getURL() === 'beaker://shell-window/').pop()
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

export function getUserSessionFor (wc) {
  // fetch current session
  var win = findWebContentsParentWindow(wc)
  if (!win) win = tabManager.findContainingWindow(BrowserView.fromWebContents(wc))
  if (!win) win = sidebarsSubwindow.findContainingWindow(BrowserView.fromWebContents(wc))
  var sess = win ? sessionWatcher.getState(win).userSession : undefined

  // return if good
  if (sess && users.isUser(sess.url)) {
    return sess
  }

  // fallback to default
  let defUserUrl = users.getDefaultUrl()
  if (defUserUrl) {
    sess = {url: defUserUrl}
    setUserSessionFor(wc, sess)
    console.log('Window had to fallback to default user:', sess.url)
    return sess
  }

  console.error('No user session available for window')
  return null
}

export function setUserSessionFor (wc, userSession) {
  var win = findWebContentsParentWindow(wc)
  if (!win) win = tabManager.findContainingWindow(BrowserView.fromWebContents(wc))
  return sessionWatcher.updateState(win, {userSession})
}

export function openProfileEditor (wc, sess) {
  // return showShellModal(wc, 'edit-profile', sess) NEEDED? -prf
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
      if (windowState) {
        if (windowState.userSession && windowState.userSession.isTemporary) {
          // dont recreate temporary user sessions
          continue
        }
        createShellWindow(windowState)
      }
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
    return Object.assign({}, windowState, _pick(defaultWindowState(), ['x', 'y', 'width', 'height', 'minWidth', 'minHeight']))
  }
  return windowState
}

// shortcut event handlers
// =

function onClose (win) {
  return e => {
    numActiveWindows--
    if (numActiveWindows === 0) {
      // emit a custom 'window-all-closed'
      // we need to do this because we have hidden windows running additional behaviors
      app.emit('custom-window-all-closed')
    }

    // deny any outstanding permission requests
    permissions.denyAllRequests(win)
  }
}

function onTabSelect (tabIndex) {
  return () => {  
    var win = BrowserWindow.getFocusedWindow()
    tabManager.setActive(win, tabIndex)
  }
}

function onLastTab () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.setActive(win, tabManager.getAll(win).slice(-1)[0])
}

function onNextTab () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.changeActiveBy(win, 1)
}

function onPrevTab () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.changeActiveBy(win, -1)
}

function onGoBack () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.getActive(win).webContents.goBack()
}

function onGoForward () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.getActive(win).webContents.goForward()
}

function onReload () {
  var win = BrowserWindow.getFocusedWindow()
  tabManager.getActive(win).webContents.reload()
}

function onFocusLocation () {
  var win = BrowserWindow.getFocusedWindow()
  win.webContents.send('command', 'focus-location')
}

function onAppCommand (win, e, cmd) {
  // handles App Command events (Windows)
  // see https://electronjs.org/docs/all#event-app-command-windows
  switch (cmd) {
    case 'browser-backward':
      tabManager.getActive(win).webContents.goBack()
      break
    case 'browser-forward':
      tabManager.getActive(win).webContents.goForward()
      break
    default:
      break
  }
}

function onEscape (win) {
  return () => win.webContents.send('window-event', 'leave-page-full-screen')
}

// tab switcher input handling
// =

function globalTabSwitcherKeyHandler (e, input) {
  var win = getActiveWindow()

  if (input.type === 'keyDown' && input.key === 'Tab' && input.control) {
    if (!isTabSwitcherActive[win.id]) {
      isTabSwitcherActive[win.id] = true
      tabSwitcherSubwindow.show(win)
    } else {
      if (input.shift) {
        tabSwitcherSubwindow.moveSelection(win, -1)
      } else {
        tabSwitcherSubwindow.moveSelection(win, 1)
      }
    }
  } else if (isTabSwitcherActive[win.id] && input.type === 'keyUp' && input.key === 'Control') {
    isTabSwitcherActive[win.id] = false
    tabSwitcherSubwindow.hide(win)
  }
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

function isValidUserSession (userSession) {
  return userSession && typeof userSession === 'object'
}