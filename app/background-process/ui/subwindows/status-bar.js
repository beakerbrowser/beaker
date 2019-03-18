/**
 * Status Bar
 *
 * NOTES
 * - There can only ever be one Status Bar window for a given browser window
 * - Status Bar windows are created with each browser window and then shown/hidden as needed
 */
import { BrowserWindow } from 'electron'

const WIDTH = 400
const HEIGHT = 24

// globals
// =

var windows = {} // map of {[parentWindow.id] => BrowserWindow}

// exported api
// =

export function setup (parentWindow) {
  var win = windows[parentWindow.id] = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    parent: parentWindow,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    show: false,
    fullscreenable: false,
    hasShadow: false,
    focusable: false,
    backgroundColor: '#00000000', // transparent black
    webPreferences: {
      defaultEncoding: 'utf-8'
    }
  })
  win.setIgnoreMouseEvents(true)
  win.loadFile('status-bar.html')
  win.showInactive()
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).close()
    delete windows[parentWindow.id]
  }
}

export function get (parentWindow) {
  return windows[parentWindow.id]
}

export function reposition (parentWindow) {
  var win = get(parentWindow)
  if (win) {
    var {x, y, height} = parentWindow.getBounds()
    win.setBounds({x, y: y + height - HEIGHT})
  }
}

export function show (parentWindow) {
  var win = get(parentWindow)
  if (win) {
    reposition(parentWindow)
    win.setOpacity(1)
  }
}

export function hide (parentWindow) {
  var win = get(parentWindow)
  if (win) {
    win.setOpacity(0)
  }
}

export function set (parentWindow, value) {
  var win = get(parentWindow)
  if (win) {
    if (value) show(parentWindow)
    win.webContents.executeJavaScript(`set(${JSON.stringify(value)})`)
    if (!value) hide(parentWindow)
  }
}