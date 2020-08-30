/**
 * Perm Prompt
 *
 * NOTES
 * - Perm Prompt views are created as-needed, and desroyed when not in use
 * - Perm Prompt views are attached to individual BrowserView instances
 * - Perm Prompt views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import * as tabManager from '../tabs/manager'
import permPromptRPCManifest from '../../rpc-manifests/perm-prompt'
import { findWebContentsParentWindow } from '../../lib/electron'

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
      setBounds(views[tab.id], parentWindow)
    }
  }
}

export async function create (parentWindow, tab, params) {
  // make sure a prompt window doesnt already exist
  if (tab.id in views) {
    return false // abort
  }

  if (!tab.isActive) {
    await tab.awaitActive()
  }

  // create the window
  var view = views[tab.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'perm-prompt', 'index.build.js')
    }
  })
  parentWindow.addBrowserView(view)
  setBounds(view, parentWindow)
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Perm-Prompt window says:', message)
  })
  view.webContents.loadURL('beaker://perm-prompt/')
  view.webContents.focus()

  // run the prompt flow
  var decision = false
  try {
    decision = await view.webContents.executeJavaScript(`runPrompt(${JSON.stringify(params)})`)
  } catch (e) {
    console.error('Failed to run permission prompt', e)
  }

  // destroy the window
  parentWindow.removeBrowserView(view)
  view.webContents.destroy()
  delete views[tab.id]
  return decision
}

export function get (tab) {
  return views[tab.id]
}

export function show (tab) {
  if (tab.id in views) {
    if (tab.browserWindow) {
      tab.browserWindow.addBrowserView(views[tab.id])
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
    views[tab.id].webContents.destroy()
    delete views[tab.id]
  }
}

// rpc api
// =

rpc.exportAPI('background-process-perm-prompt', permPromptRPCManifest, {
  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    tabManager.create(win, url, {setActive: true, adjacentActive: true})
  },

  async resizeSelf (dimensions) {
    var view = Object.values(views).find(view => view.webContents === this.sender)
    if (!view) return
    var parentWindow = findWebContentsParentWindow(this.sender)
    setBounds(view, parentWindow, dimensions)
  }
})

// internal methods
// =

function setBounds (view, parentWindow, {width, height} = {}) {
  width = width || 300
  height = height || 118
  view.setBounds({
    x: 100 - MARGIN_SIZE,
    y: 74,
    width: width + (MARGIN_SIZE * 2),
    height: height + MARGIN_SIZE
  })
}
