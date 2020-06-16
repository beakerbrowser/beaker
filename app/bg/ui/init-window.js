import * as path from 'path'
import { BrowserWindow } from 'electron'
import { ICON_PATH } from './windows'
import * as logger from '../logger'

// globals
// =

var initWindow

// exported api
// =

export function open ({isShutdown} = {isShutdown: false}) {
  initWindow = new BrowserWindow({
    autoHideMenuBar: true,
    fullscreenable: false,
    resizable: false,
    fullscreenWindowTitle: true,
    frame: false,
    width: 400,
    height: 300,
    backgroundColor: '#fff',
    webPreferences: {
      preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
      defaultEncoding: 'utf-8',
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      webSecurity: true,
      enableRemoteModule: false,
      allowRunningInsecureContent: false
    },
    icon: ICON_PATH,
    show: true
  })
  initWindow.loadURL(`beaker://init/${isShutdown ? 'shutdown.html' : ''}`)
}

export function close () {
  if (initWindow) {
    initWindow.close()
    initWindow = undefined
  }
}
