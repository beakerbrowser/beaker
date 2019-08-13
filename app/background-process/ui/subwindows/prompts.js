/**
 * Prompts
 *
 * NOTES
 * - Prompt views are created as-needed, and desroyed when not in use
 * - Prompt views are attached to individual BrowserView instances
 * - Prompt views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import * as viewManager from '../view-manager'
import promptsRPCManifest from '../../rpc-manifests/prompts'
import { findWebContentsParentWindow } from '../../../lib/electron'

// globals
// =

const MARGIN_SIZE = 10
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

export async function create (webContents, promptName, params = {}) {
  // find parent window
  var parentWindow = BrowserWindow.fromWebContents(webContents)
  var parentView = BrowserView.fromWebContents(webContents)
  if (parentView && !parentWindow) {
    // if there's no window, then a web page or "sub-window" created the prompt
    // use its containing window
    parentWindow = findWebContentsParentWindow(parentView.webContents)
  } else if (!parentView) {
    // if there's no view, then the shell window created the prompt
    // attach it to the active view
    parentView = viewManager.getActive(parentWindow)
    parentWindow = parentView.browserWindow
  }

  // make sure a prompt window doesnt already exist
  if (parentView.id in views) {
    return
  }

  // create the view
  var view = views[parentView.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'prompts.build.js')
    }
  })
  view.promptName = promptName
  if (viewManager.getActive(parentWindow).id === parentView.id) {
    parentWindow.addBrowserView(view)
  }
  setBounds(view, parentWindow)
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Prompts window says:', message)
  })
  view.webContents.loadURL('beaker://prompts/')
  await view.webContents.executeJavaScript(`showPrompt("${promptName}", ${JSON.stringify(params)})`)
}

export function get (parentView) {
  return views[parentView.id]
}

export function show (parentView) {
  if (parentView.id in views) {
    var view = views[parentView.id]
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(view.webContents)
    if (win) {
      win.addBrowserView(view)
      setBounds(view, win)
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
    var view = views[parentView.id]
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)
    if (win) win.removeBrowserView(view)
    view.destroy()
    delete views[parentView.id]
  }
}

// rpc api
// =

rpc.exportAPI('background-process-prompts', promptsRPCManifest, {
  async close () {
    close(this.sender)
  },

  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    viewManager.create(win, url, {setActive: true})
  },

  async loadURL (url) {
    var win = findWebContentsParentWindow(this.sender)
    viewManager.getActive(win).loadURL(url)
  },

  async openSidebar (panel) {
    var win = findWebContentsParentWindow(this.sender)
    viewManager.getActive(win).openSidebar(panel)
  }
})

// internal methods
// =

function getDefaultWidth (view) {
  return 360
}

function getDefaultHeight (view) {
  return 80
}

function setBounds (view, parentWindow, {width, height} = {}) {
  var parentBounds = parentWindow.getContentBounds()
  width = Math.min(width || getDefaultWidth(view), parentBounds.width - 20)
  height = Math.min(height || getDefaultHeight(view), parentBounds.height - 20)
  view.setBounds({
    x: 0,
    y: 85,
    width: width + (MARGIN_SIZE * 2),
    height: height + MARGIN_SIZE
  })
}
