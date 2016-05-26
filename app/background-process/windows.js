import { BrowserWindow } from 'electron'
import path from 'path'
import log from '../log'

export function create (opts) {
  var win = new BrowserWindow({
    width: 1000,
    height: 600
  })

  var startPagePath = 'file://'+path.join(__dirname, 'builtin-pages/start.html')
  win.loadURL(startPagePath)
  log('Opening', startPagePath)
  return win
}