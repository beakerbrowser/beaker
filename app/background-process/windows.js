import { app, BrowserWindow } from 'electron'
import path from 'path'
import log from '../log'

// exported methods
// =

export function setup () {
  // create first shell window
  createShellWindow()
}

export function createShellWindow () {
  // create window
  var win = new BrowserWindow({})
  loadURL(win, 'file://'+path.join(__dirname, 'shell-window.html'))

  return win
}

// internal methods
// =

function loadURL (win, url) {
  win.loadURL(url)
  log('Opening', url)  
}