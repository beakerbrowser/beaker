// handle OSX open-url event
import { ipcMain } from 'electron'
var shellReady = false
var shellWindow
var queue = []

export function setup (win) {
  shellWindow = win
  ipcMain.on('shell-window-ready', function (e) {
    shellReady = true
    queue.forEach((url) => {
      e.sender.send('command', 'file:new-tab', url)
    })
  })

  shellWindow.on('closed', () => {
    shellWindow = null
  })
}

export function open (url) {
  if (shellReady) {
    shellWindow.webContents.send('command', 'file:new-tab', url)
  } else {
    queue.push(url)
  }
}
