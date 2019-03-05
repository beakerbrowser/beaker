// handle OSX open-url event
import {BrowserWindow, ipcMain} from 'electron'
import * as windows from './ui/windows'
import * as viewManager from './ui/view-manager'
var queue = []
var isLoaded = false
var isSetup = false

export function setup () {
  if (isSetup) return
  isSetup = true
  ipcMain.on('shell-window:ready', function (e) {
    var win = BrowserWindow.fromWebContents(e.sender)
    queue.forEach(url => viewManager.create(win, url))
    queue.length = 0
    isLoaded = true
  })
}

export function open (url) {
  setup()
  var win = windows.getActiveWindow()
  if (isLoaded && win) {
    // send command now
    viewManager.create(win, url)
    win.show()
  } else {
    // queue for later
    queue.push(url)

    // no longer loaded?
    if (isLoaded) {
      isLoaded = false
      // spawn a new window
      windows.createShellWindow()
    }
  }
  return win && win.webContents
}
