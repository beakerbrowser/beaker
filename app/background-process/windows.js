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
  var win = new BrowserWindow({ titleBarStyle: 'hidden-inset', 'standard-window': false, width: 1000, height: 700 })
  loadURL(win, 'beaker:shell-window')

  // register shortcuts
  for (var i=1; i <= 9; i++)
    registerShortcut(win, 'CmdOrCtrl+'+i, onTabSelect(win, i-1))

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
  return () => {
    win.webContents.send('command', 'set-tab', tabIndex)
  }
}

// window event handlers
// =

function sendToWebContents (event) {
  return e => e.sender.webContents.send('window-event', event)
}