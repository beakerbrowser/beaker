/**
 * Sidebar
 *
 * NOTES
 * - Sidebar views are created as-needed, and desroyed when not in use
 * - Sidebar views are attached to individual BrowserView instances
 * - Sidebar views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { BrowserView } from 'electron'
import * as tabManager from '../tab-manager'
import { findWebContentsParentWindow } from '../../../lib/electron'

// globals
// =

export const SIDEBAR_Y = 76
var views = {} // map of {[tab.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
}

export function destroy (parentWindow) {
  // destroy all under this window
  for (let tab of tabManager.getAll(parentWindow)) {
    if (tab.id in views) {
      views[tab.id].destroy()
      delete views[tab.id]
    }
  }
}

export function reposition (parentWindow) {
  // reposition all under this window
  for (let tab of tabManager.getAll(parentWindow)) {
    if (tab.id in views) {
      setBounds(views[tab.id], parentWindow)
    }
  }
}

export function create (tab) {
  // make sure a sidebar doesnt already exist
  if (tab.id in views) {
    return
  }
  var win = tabManager.findContainingWindow(tab)
  if (!win) win = findWebContentsParentWindow(views[tab.id].webContents)

  // create the view
  var view = views[tab.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js')
    }
  })
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Sidebar window says:', message)
  })
  view.webContents.loadURL('beaker://sidebar/')
  return view
}

export function get (tab) {
  return views[tab.id]
}

export function findContainingWindow (sidebarView) {
  return findWebContentsParentWindow(sidebarView.webContents)
}

export function show (tab) {
  if (tab.id in views) {
    var win = tabManager.findContainingWindow(tab)
    if (!win) win = findWebContentsParentWindow(views[tab.id].webContents)
    if (win) {
      win.addBrowserView(views[tab.id])
      setBounds(views[tab.id], win)
      views[tab.id].webContents.executeJavaScript(`window.sidebarShow()`)
    }
  }
}

export function hide (tab) {
  if (tab.id in views) {
    var win = tabManager.findContainingWindow(tab)
    if (!win) win = findWebContentsParentWindow(views[tab.id].webContents)
    if (win) win.removeBrowserView(views[tab.id])
  }
}

export function close (tab) {
  if (tab.id in views) {
    var win = tabManager.findContainingWindow(tab)
    if (!win) win = findWebContentsParentWindow(views[tab.id].webContents)
    win.removeBrowserView(views[tab.id])
    views[tab.id].destroy()
    delete views[tab.id]
  }
}

// rpc api
// =
/*
rpc.exportAPI('background-process-modals', modalsRPCManifest, {
  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    tabManager.create(win, url, {setActive: true})
  },

  async resizeSelf (dimensions) {
    var view = BrowserView.fromWebContents(this.sender)
    var parentWindow = findWebContentsParentWindow(this.sender)
    setBounds(view, parentWindow, dimensions)
  }
})*/

// internal methods
// =

function setBounds (sidebarView, parentWindow) {
  var parentBounds = parentWindow.getContentBounds()
  sidebarView.setBounds({
    x: 0,
    y: SIDEBAR_Y,
    width: Math.floor(parentBounds.width / 2),
    height: parentBounds.height - SIDEBAR_Y
  })
}
