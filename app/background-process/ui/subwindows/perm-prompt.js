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
import * as viewManager from '../view-manager'
import permPromptRPCManifest from '../../rpc-manifests/perm-prompt'
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

export async function create (parentWindow, parentView, params) {
  // make sure a prompt window doesnt already exist
  if (parentView.id in views) {
    return false // abort
  }

  // create the window
  var view = views[parentView.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'perm-prompt.build.js')
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
  view.destroy()
  delete views[parentView.id]
  return decision
}

export function get (parentView) {
  return views[parentView.id]
}

export function show (parentView) {
  if (parentView.id in views) {
    var win = viewManager.findContainingWindow(parentView)
    if (!win) win = findWebContentsParentWindow(views[parentView.id].webContents)
    if (win) win.addBrowserView(views[parentView.id])
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
    views[parentView.id].destroy()
    delete views[parentView.id]
  }
}

// rpc api
// =

rpc.exportAPI('background-process-perm-prompt', permPromptRPCManifest, {
  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    viewManager.create(win, url, {setActive: true})
  },

  async resizeSelf (dimensions) {
    var view = BrowserView.fromWebContents(this.sender)
    var parentWindow = findWebContentsParentWindow(this.sender)
    setBounds(view, parentWindow, dimensions)
    // var win = BrowserWindow.fromWebContents(this.sender)
    // var [width, height] = win.getSize()
    // win.setSize(dimensions.width || width, dimensions.height || height)
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
