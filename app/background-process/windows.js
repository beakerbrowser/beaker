import { app, BrowserWindow, screen } from 'electron'
import path from 'path'
import { register as registerShortcut } from 'electron-localshortcut'
import log from '../log'

// exported methods
// =

export function setup () {
  // create first shell window
  createShellWindow()
}

export function createShellWindow () {
  // calculate screen size
  var { width, height } = screen.getPrimaryDisplay().workAreaSize
  width = Math.max(800, Math.min(1800, width - 50))
  height = Math.max(600, Math.min(1200, height - 50))

  // create window
  var win = new BrowserWindow({ 
    titleBarStyle: 'hidden-inset',
    'standard-window': false,
    width, height,
    webPreferences: {
      webSecurity: false, // disable same-origin policy in the shell-window; the <webview>s of site content will have it re-enabled
    }
  })
  loadURL(win, 'beaker:shell-window')

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

  return win
}

// internal methods
// =

function loadURL (win, url) {
  win.loadURL(url)
  log('Opening', url)  
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