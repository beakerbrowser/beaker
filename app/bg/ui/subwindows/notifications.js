/**
 * Notifications
 *
 * NOTES
 * - There can only ever be one Notification view for a given browser window
 * - Notification views are created with each browser window and then shown/hidden as needed
 * - When unfocused, the Notification view is hidden (it's meant to act as a popup menu)
 */

import path from 'path'
import Events from 'events'
import { BrowserView } from 'electron'
import * as tabManager from '../tabs/manager'

// globals
// =

const WIDTH = 500
const HEIGHT = 350
var events = new Events()
var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
      nodeIntegrationInSubFrames: true,
      contextIsolation: true,
      worldSafeExecuteJavaScript: false,
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nativeWindowOpen: true,
      nodeIntegration: false,
      scrollBounce: true,
      navigateOnDragDrop: false
    }
  })
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Notifications window says:', message)
  })
  view.webContents.loadURL('beaker://notifications/')
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).webContents.destroy()
    delete views[parentWindow.id]
  }
}

export function get (parentWindow) {
  return views[parentWindow.id]
}

export function reposition (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    let parentBounds = parentWindow.getContentBounds()
    view.setBounds({
      x: parentBounds.width - WIDTH - 65,
      y: 70,
      width: WIDTH,
      height: HEIGHT
    })
  }
}

export function resize (parentWindow, bounds = {}) {
  return reposition(parentWindow)
}

export function toggle (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    if (view.isVisible) {
      return hide(parentWindow)
    } else {
      return show(parentWindow, opts)
    }
  }
}

export async function show (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.addBrowserView(view)
    reposition(parentWindow)
    view.isVisible = true

    await view.webContents.executeJavaScript(`init(); undefined`)
    view.webContents.focus()

    // await till hidden
    await new Promise(resolve => {
      events.once('hide', resolve)
    })
  }
}

export function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    view.webContents.executeJavaScript(`reset(); undefined`)
    parentWindow.removeBrowserView(view)
    view.currentBounds = null
    view.isVisible = false
    events.emit('hide')
  }
}