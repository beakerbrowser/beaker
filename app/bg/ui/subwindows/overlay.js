/**
 * Overlay
 *
 * NOTES
 * - There can only ever be one overlay for a given browser window
 * - Overlay views are created with each browser window and then shown/hidden as needed
 */
import { BrowserWindow, BrowserView } from 'electron'
import path from 'path'
import * as rpc from 'pauls-electron-rpc'
import overlayRPCManifest from '../../rpc-manifests/overlay'

// globals
// =

var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8'
    }
  })
  view.webContents.loadFile(path.join(__dirname, 'fg', 'overlay', 'index.html'))
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).destroy()
    delete views[parentWindow.id]
  }
}

export function get (parentWindow) {
  return views[parentWindow.id]
}

export function reposition (parentWindow) {
  // noop
}

export function show (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.addBrowserView(view)
  }
}

export function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.removeBrowserView(view)
  }
}

export function set (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    if (opts) {
      show(parentWindow)
      view.setBounds(opts.bounds)
      view.webContents.executeJavaScript(`set(${JSON.stringify(opts)})`)
    } else { 
      hide(parentWindow)
      view.webContents.executeJavaScript(`set({})`)
    }
  }
} 
// rpc api
// =

rpc.exportAPI('background-process-overlay', overlayRPCManifest, {
  async set (opts) {
    set(getParentWindow(this.sender), opts)
  }
})

// internal methods
// =

function getParentWindow (sender) {
  var win = BrowserWindow.fromWebContents(sender)
  if (win) return win
  throw new Error('Parent window not found')
}