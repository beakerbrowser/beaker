/**
 * Perm Prompt
 * 
 * NOTES
 * - Perm Prompt windows are created as-needed, and desroyed when not in use
 * - Perm Prompt windows are attached to individual BrowserView instances
 * - Perm Prompt windows are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import {BrowserWindow, BrowserView} from 'electron'
import * as rpc from 'pauls-electron-rpc'
import * as viewManager from '../view-manager'
import permPromptRPCManifest from '../../rpc-manifests/perm-prompt'

// globals
// =

var windows = {} // map of {[parentView.id] => BrowserWindow}

// exported api
// =

export function setup (parentWindow) {
}

export function destroy (parentWindow) {
  // destroy all under this window
  for (let view of viewManager.getAll(parentWindow)) {
    if (view.id in windows) {
      windows[view.id].close()
      delete windows[view.id]
    }
  }
}

export function reposition (parentWindow) {
  // reposition all under this window
  for (let view of viewManager.getAll(parentWindow)) {
    if (view.id in windows) {
      setBounds(windows[view.id], parentWindow)
    }
  }
}

export async function create (parentWindow, parentView, params) {
  // make sure a prompt window doesnt already exist
  if (parentView.id in windows) {
    return false // abort
  }

  // create the window
  var win = windows[parentView.id] = new BrowserWindow({
    parent: parentWindow,
    frame: false,
    resizable: false,
    maximizable: false,
    show: true,
    fullscreenable: false,
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'perm-prompt.build.js')
    }
  })
  setBounds(win, parentWindow)
  win.webContents.on('console-message', (e, level, message) => {
    console.log('Perm-Prompt window says:', message)
  })
  win.loadURL('beaker://perm-prompt/')

  // run the prompt flow
  var decision = false
  try {
    decision = await win.webContents.executeJavaScript(`runPrompt(${JSON.stringify(params)})`)
  } catch (e) {
    console.error('Failed to run permission prompt', e)
  }

  // destroy the window
  win.close()
  delete windows[parentView.id]
  return decision
}

export async function show (parentView) {
  if (parentView.id in windows) {
    windows[parentView.id].show()
  }
}

export async function hide (parentView) {
  if (parentView.id in windows) {
    windows[parentView.id].hide()
  }
}

export async function close (parentView) {
  if (parentView.id in windows) {
    windows[parentView.id].close()
    delete windows[parentView.id]
  }
}

// rpc api
// =

rpc.exportAPI('background-process-perm-prompt', permPromptRPCManifest, {
  async createTab (url) {
    var win = getParentWindow(this.sender)
    viewManager.create(win, url, {setActive: true})
  },

  async resizeSelf (dimensions) {
    var win = BrowserWindow.fromWebContents(this.sender)
    var [width, height] = win.getSize()
    win.setSize(dimensions.width || width, dimensions.height || height)
  }
})

// internal methods
// =

function setBounds (win, parentWindow) {
  var parentBounds = parentWindow.getBounds()
  win.setBounds({
    x: parentBounds.x + 100,
    y: parentBounds.y + 74,
    width: 300,
    height: 118
  })
}

function getParentWindow (sender) {
  return BrowserWindow.fromWebContents(sender).getParentWindow()
}