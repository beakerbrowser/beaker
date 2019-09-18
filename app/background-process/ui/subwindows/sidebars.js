/**
 * Sidebar
 *
 * NOTES
 * - Sidebar views are created as-needed, and desroyed when not in use
 * - Sidebar views are attached to individual BrowserView instances
 * - Sidebar views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { app, BrowserWindow, BrowserView } from 'electron'
import * as viewManager from '../view-manager'
import { findWebContentsParentWindow } from '../../../lib/electron'

// globals
// =

export const SIDEBAR_Y = 76
var views = {} // map of {[parentView.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
}

export function destroy (parentWindow) {
  // destroy all under this window
  for (let view of viewManager.getAll(parentWindow)) {
    if (view.id in views) {
      views[view.id].destroy()
      delete views[view.id]
    }
  }
}

export function reposition (parentWindow) {
  // reposition all under this window
  for (let view of viewManager.getAll(parentWindow)) {
    if (view.id in views) {
      setBounds(views[view.id], parentWindow)
    }
  }
}

export function create (parentView) {
  // make sure a sidebar doesnt already exist
  if (parentView.id in views) {
    return
  }
  var win = viewManager.findContainingWindow(parentView)
  if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)

  // create the view
  var view = views[parentView.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'webview-preload.build.js')
    }
  })
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Sidebar window says:', message)
  })
  view.webContents.loadURL('beaker://sidebar/')
  return view
}

export function get (parentView) {
  return views[parentView.id]
}

export function findContainingWindow (sidebarView) {
  return findWebContentsParentWindow(sidebarView.webContents)
}

export function show (parentView) {
  if (parentView.id in views) {
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)
    if (win) {
      win.addBrowserView(views[parentView.id])
      setBounds(views[parentView.id], win)
      views[parentView.id].webContents.executeJavaScript(`window.sidebarShow()`)
    }
  }
}

export function hide (parentView) {
  if (parentView.id in views) {
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)
    if (win) win.removeBrowserView(views[parentView.id])
  }
}

export function close (parentView) {
  if (parentView.id in views) {
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)
    win.removeBrowserView(views[parentView.id])
    views[parentView.id].destroy()
    delete views[parentView.id]
  }
}

// rpc api
// =
/*
rpc.exportAPI('background-process-modals', modalsRPCManifest, {
  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    viewManager.create(win, url, {setActive: true})
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
    x: Math.floor(parentBounds.width / 2),
    y: SIDEBAR_Y,
    width: Math.floor(parentBounds.width / 2),
    height: parentBounds.height - SIDEBAR_Y
  })
}
