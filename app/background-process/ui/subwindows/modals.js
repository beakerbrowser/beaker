/**
 * Modal
 * 
 * NOTES
 * - Modal windows are created as-needed, and desroyed when not in use
 * - Modal windows are attached to individual BrowserView instances
 * - Modal windows are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import {app, BrowserWindow, BrowserView} from 'electron'
import * as rpc from 'pauls-electron-rpc'
import {ModalActiveError} from 'beaker-error-constants'
import * as viewManager from '../view-manager'
import modalsRPCManifest from '../../rpc-manifests/modals'

// globals
// =

var windows = {} // map of {[parentView.id] => BrowserWindow}

// exported api
// =

export function setup (parentWindow) {
  // listen for the basic auth login event
  app.on('login', async function (e, webContents, request, authInfo, cb) {
    e.preventDefault() // default is to cancel the auth; prevent that
    var res = await create(webContents, 'basic-auth', authInfo)
    cb(res.username, res.password)
  })
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

export async function create (webContents, modalName, params = {}) {
  // find parent window
  var parentWindow = BrowserWindow.fromWebContents(webContents)
  var parentView = BrowserView.fromWebContents(webContents)
  if (parentView && !parentWindow) {
    // if there's no window, then a web page created the prompt
    // use its containing window
    parentWindow = viewManager.findContainingWindow(parentView)
  } else if (!parentView) {
    // if there's no view, then the shell window created the prompt
    // attach it to the active view
    parentView = viewManager.getActive(parentWindow)
  }

  // make sure a prompt window doesnt already exist
  if (parentView.id in windows) {
    throw new ModalActiveError()
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
      preload: path.join(__dirname, 'modals.build.js')
    }
  })
  setBounds(win, parentWindow)
  win.webContents.on('console-message', (e, level, message) => {
    console.log('Modals window says:', message)
  })
  win.loadURL('beaker://modals/')

  // run the modal flow
  var result
  var err
  try {
    result = await win.webContents.executeJavaScript(`runModal("${modalName}", ${JSON.stringify(params)})`)
  } catch (e) {
    err = e
  }

  // destroy the window
  win.close()
  delete windows[parentView.id]

  // return/throw
  if (err) throw err
  return result
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

rpc.exportAPI('background-process-modals', modalsRPCManifest, {
  async createTab (url) {
    var win = getParentWindow(this.sender)
    viewManager.create(win, url, {setActive: true})
  },

  async resizeSelf (dimensions) {
    var win = BrowserWindow.fromWebContents(this.sender)
    var [width, height] = win.getSize()
    width = dimensions.width || width
    height = dimensions.height || height
    var parentBounds = win.getParentWindow().getBounds()
    win.setBounds({
      x: parentBounds.x + Math.round(parentBounds.width / 2) - Math.round(width / 2), // centered
      y: parentBounds.y + 74,
      width,
      height
    })
  }
})

// internal methods
// =

function setBounds (win, parentWindow) {
  var parentBounds = parentWindow.getBounds()
  win.setBounds({
    x: parentBounds.x + Math.round(parentBounds.width / 2) - 250, // centered
    y: parentBounds.y + 74,
    width: 500,
    height: 300
  })
}

function getParentWindow (sender) {
  return BrowserWindow.fromWebContents(sender).getParentWindow()
}