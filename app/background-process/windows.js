import { app, BrowserWindow } from 'electron'
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
  // create window
  var win = new BrowserWindow({ titleBarStyle: 'hidden', 'standard-window': false })
  loadURL(win, 'beaker:shell-window')

  // register shortcuts
  for (var i=1; i <= 9; i++)
    registerShortcut(win, 'CmdOrCtrl+'+i, onTabSelect(win, i-1))

  // register event handlers
  win.on('scroll-touch-begin', onScrollTouchBegin)
  win.on('scroll-touch-end', onScrollTouchEnd)
  win.on('focus', onFocus)
  win.on('blur', onBlur)

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
  return () => {
    win.webContents.send('command', 'set-tab', tabIndex)
  }
}

// window event handlers
// =

function onScrollTouchBegin (e) {
  e.sender.webContents.send('window-event', 'scroll-touch-begin')
}

function onScrollTouchEnd (e) {
  e.sender.webContents.send('window-event', 'scroll-touch-end')
}

function onFocus (e) {
  e.sender.webContents.send('window-event', 'focus')
}

function onBlur (e) {
  e.sender.webContents.send('window-event', 'blur')
}