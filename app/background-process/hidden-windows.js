import {BrowserWindow} from 'electron'

// globals
// =

var hiddenWindows = {}

// exported api
// =

export async function spawn (modulePath) {
  var fullModulePath = require.resolve(modulePath)
  var win = new BrowserWindow({show: false})
  console.log('Spawn', modulePath)
  win.loadURL('beaker-hidden-window://loader/?module='+encodeURIComponent(fullModulePath))
  win.webContents.on('console-message', (e, level, msg) => {
    console.log(modulePath, 'says', msg)
  })
  await new Promise((resolve, reject) => {
    win.webContents.on('did-finish-load', resolve)
  })
  hiddenWindows[modulePath] = win
  return win
}

export function close (modulePath) {
  hiddenWindows[modulePath].close()
  delete hiddenWindows[modulePath]
}

export async function exec (modulePath, script) {
  return hiddenWindows[modulePath].executeJavaScript(script)
}

export async function send (modulePath, ...args) {
  return hiddenWindows[modulePath].webContents.send(...args)
}