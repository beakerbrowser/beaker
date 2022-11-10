/**
 * Prompts
 *
 * NOTES
 * - Prompt views are created as-needed, and desroyed when not in use
 * - Prompt views are attached to individual BrowserView instances
 * - Prompt views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import * as tabManager from '../tabs/manager'
import promptsRPCManifest from '../../rpc-manifests/prompts'
import { findWebContentsParentWindow } from '../../lib/electron'
import { getAddedWindowSettings } from '../windows'
import * as setupFlow from '../setup-flow'

// globals
// =

const MARGIN_SIZE = 10
var views = {} // map of {[tab.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
}

export function destroy (parentWindow) {
  // destroy all under this window
  for (let tab of tabManager.getAll(parentWindow)) {
    if (tab.id in views) {
      views[tab.id].webContents.destroy()
      delete views[tab.id]
    }
  }
}

export function reposition (parentWindow) {
  // reposition all under this window
  for (let tab of tabManager.getAll(parentWindow)) {
    if (tab.id in views) {
      setBounds(views[tab.id], tab)
    }
  }
}

export async function create (webContents, promptName, params = {}) {
  var parentWindow = findWebContentsParentWindow(webContents)
  var tab = tabManager.getActive(parentWindow)

  // make sure a prompt window doesnt already exist
  if (tab.id in views) {
    return
  }

  if (!tab.isActive) {
    await tab.awaitActive()
  }

  // create the view
  var view = views[tab.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'prompts', 'index.build.js')
    }
  })
  view.promptName = promptName
  view.tab = tab
  if (tabManager.getActive(parentWindow).id === tab.id) {
    parentWindow.addBrowserView(view)
  }
  setBounds(view, tab)
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Prompts window says:', message)
  })
  view.webContents.loadURL('beaker://prompts/')
  await view.webContents.executeJavaScript(`showPrompt("${promptName}", ${JSON.stringify(params)}); undefined`)
  return view
}

export function get (tab) {
  return views[tab.id]
}

export function show (tab) {
  if (tab.id in views) {
    var view = views[tab.id]
    if (tab.browserWindow) {
      tab.browserWindow.addBrowserView(view)
      setBounds(view, tab)
    }
  }
}

export function hide (tab) {
  if (tab.id in views) {
    if (tab.browserWindow) {
      tab.browserWindow.removeBrowserView(views[tab.id])
    }
  }
}

export function close (tab) {
  if (tab.id in views) {
    var view = views[tab.id]
    if (tab.browserWindow) {
      tab.browserWindow.removeBrowserView(view)
    }
    view.webContents.destroy()
    delete views[tab.id]
  }
}

// rpc api
// =

rpc.exportAPI('background-process-prompts', promptsRPCManifest, {
  async close () {
    close(tabManager.findTab(this.sender))
  },

  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    tabManager.create(win, url, {setActive: true, adjacentActive: true})
  },

  async loadURL (url) {
    var win = findWebContentsParentWindow(this.sender)
    tabManager.getActive(win).loadURL(url)
  }
})

// internal methods
// =

function getDefaultWidth (view) {
  return 380
}

function getDefaultHeight (view) {
  return 80
}

function setBounds (view, tab, {width, height} = {}) {
  var parentBounds = tab.browserWindow.getContentBounds()
  width = Math.min(width || getDefaultWidth(view), parentBounds.width - 20)
  height = Math.min(height || getDefaultHeight(view), parentBounds.height - 20)
  var y = getAddedWindowSettings(tab.browserWindow).isShellInterfaceHidden ? 10 : 95
  view.setBounds({
    x: parentBounds.width - width - (MARGIN_SIZE * 2),
    y,
    width: width + (MARGIN_SIZE * 2),
    height: height + MARGIN_SIZE
  })
}
