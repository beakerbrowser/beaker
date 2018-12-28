import {app, BrowserWindow} from 'electron'

// globals
// =

var hiddenWindows = {}

// exported api
// =

export async function spawn (id, modulePath) {
  var fullModulePath = require.resolve(modulePath)
  var win = new BrowserWindow({show: false, webPreferences: {nodeIntegration: true}})
  // win.webContents.toggleDevTools()
  console.log('[', id, '] Starting...')
  win.loadURL(`beaker-hidden-window://loader/?module=${encodeURIComponent(fullModulePath)}&userDataPath=${encodeURIComponent(app.getPath('userData'))}`)
  win.webContents.on('console-message', (e, level, msg) => {
    console.log('[', id, ']', msg)
  })
  await new Promise((resolve, reject) => {
    win.webContents.on('did-finish-load', resolve)
  })
  hiddenWindows[id] = win
  return win
}

export function close (id) {
  hiddenWindows[id].close()
  delete hiddenWindows[id]
}

export async function exec (id, script) {
  return hiddenWindows[id].executeJavaScript(script)
}

export async function send (id, ...args) {
  return hiddenWindows[id].webContents.send(...args)
}