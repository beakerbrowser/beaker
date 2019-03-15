/**
 * Location Bar
 *
 * NOTES
 * - There can only ever be one Location Bar window for a given browser window
 * - Location Bar windows are created with each browser window and then shown/hidden as needed
 * - When unfocused, the Location Bar window is hidden (it's meant to act as a popup menu)
 */
import path from 'path'
import Events from 'events'
import { BrowserWindow } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import locationBarRPCManifest from '../../rpc-manifests/location-bar'
import * as viewManager from '../view-manager'

const WIDTH = 800
const HEIGHT = 310

// globals
// =

var events = new Events()
var windows = {} // map of {[parentWindow.id] => BrowserWindow}

// exported api
// =

export function setup (parentWindow) {
  var win = windows[parentWindow.id] = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    parent: parentWindow,
    frame: false,
    resizable: false,
    maximizable: false,
    show: false,
    fullscreenable: false,
    acceptFirstMouse: true,
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'location-bar.build.js')
    }
  })
  win.webContents.on('console-message', (e, level, message) => {
    console.log('Location-Bar window says:', message)
  })
  win.loadURL('beaker://location-bar/')
  win.on('blur', () => hide(parentWindow))
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
  if (win && win.boundsOpt) {
    var parentBounds = parentWindow.getBounds()
    win.setBounds({
      x: parentBounds.x + win.boundsOpt.x,
      y: parentBounds.y + win.boundsOpt.y,
      width: win.boundsOpt.width,
      height: 310
    })
  }
}

export async function show (parentWindow, opts) {
  var win = get(parentWindow)
  if (win) {
    win.boundsOpt = opts && opts.bounds
    reposition(parentWindow)
    win.webContents.executeJavaScript(`setup()`)
    win.showInactive()

    // await till hidden
    await new Promise(resolve => {
      events.once('hide', resolve)
    })
  }
}

export function hide (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).hide()
  }
}

export async function runCmd (parentWindow, cmd, opts) {
  var win = get(parentWindow)
  if (win) {
    if (!win.isVisible()) {
      if (cmd === 'set-value') {
        // show first
        show(parentWindow, opts)
      } else {
        return
      }
    }
    return win.webContents.executeJavaScript(`command("${cmd}", ${JSON.stringify(opts)})`)
  }
}

// rpc api
// =

rpc.exportAPI('background-process-location-bar', locationBarRPCManifest, {
  async close () {
    hide(getParentWindow(this.sender))
  },

  async createTab (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the location bar
    viewManager.create(win, url, {setActive: true})
  },

  async loadURL (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the location bar
    viewManager.getActive(win).loadURL(url)
    win.webContents.send('command', 'unfocus-location') // we have to manually unfocus the location bar
  },

  async resizeSelf (dimensions) {
    var win = BrowserWindow.fromWebContents(this.sender)
    if (process.platform === 'win32') {
      // on windows, add space for the border
      if (dimensions.width) dimensions.width += 2
      if (dimensions.height) dimensions.height += 2
    }
    win.setBounds(dimensions)
  }
})

// internal methods
// =

function getParentWindow (sender) {
  return BrowserWindow.fromWebContents(sender).getParentWindow()
}