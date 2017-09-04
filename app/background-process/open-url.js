// handle OSX open-url event
import {ipcMain} from 'electron'
import * as windows from './ui/windows'
var queue = []
var isLoaded = false

export function setup () {
  ipcMain.on('shell-window-ready', function (e) {
    queue.forEach(url => e.sender.send('command', 'file:new-tab', url))
    queue.length = 0
    isLoaded = true
  })
}

export function open (url) {
  var win = windows.getActiveWindow()
  if (isLoaded && win) {
    // send command now
    win.webContents.send('command', 'file:new-tab', url)
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
