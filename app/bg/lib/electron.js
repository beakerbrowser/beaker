import path from 'path'
import { BrowserWindow } from 'electron'

export function findWebContentsParentWindow (wc) {
  for (let win of BrowserWindow.getAllWindows()) {
    for (let view of win.getBrowserViews()) {
      if (view.webContents === wc) {
        return win
      }
    }
  }
  let win = BrowserWindow.fromWebContents(wc)
  while (win && win.getParentWindow()) {
    win = win.getParentWindow()
  }
  // it might not be attached because it was a shell menu that has closed
  // in that case, just go with the focused window
  if (!win) win = BrowserWindow.getFocusedWindow()
  return win
}

export async function spawnAndExecuteJs (url, js) {
  var win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
      nodeIntegrationInSubFrames: true,
      contextIsolation: true,
      worldSafeExecuteJavaScript: false, // TODO- this causes promises to fail in executeJavaScript, need to file an issue with electron
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nativeWindowOpen: true,
      nodeIntegration: false,
      scrollBounce: true,
      navigateOnDragDrop: true,
      enableRemoteModule: false,
      safeDialogs: true
    }
  })
  win.loadURL(url)
  var wc = win.webContents

  wc.on('new-window', e => e.preventDefault())
  wc.on('will-navigate', e => e.preventDefault())
  wc.on('will-redirect', e => e.preventDefault())

  try {
    await new Promise((resolve, reject) => {
      wc.once('dom-ready', resolve)
      wc.once('did-fail-load', reject)
    })

    var res = await wc.executeJavaScript(js)
    return res
  } finally {
    win.close()
  }
}