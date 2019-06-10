/**
 * Modal
 *
 * NOTES
 * - Modal views are created as-needed, and desroyed when not in use
 * - Modal views are attached to individual BrowserView instances
 * - Modal views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { app, BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { ModalActiveError } from 'beaker-error-constants'
import * as viewManager from '../view-manager'
import modalsRPCManifest from '../../rpc-manifests/modals'
import { findWebContentsParentWindow } from '../../../lib/electron'

// globals
// =

const MARGIN_SIZE = 10
var views = {} // map of {[parentView.id] => BrowserView}

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

export async function create (webContents, modalName, params = {}) {
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
    throw new ModalActiveError()
  }

  // create the view
  var view = views[parentView.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'modals.build.js')
    }
  })
  parentWindow.addBrowserView(view)
  setBounds(view, parentWindow)
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Modals window says:', message)
  })
  view.webContents.loadURL('beaker://modals/')
  view.webContents.focus()

  // run the modal flow
  var result
  var err
  try {
    result = await view.webContents.executeJavaScript(`runModal("${modalName}", ${JSON.stringify(params)})`)
  } catch (e) {
    err = e
  }

  // destroy the window
  parentWindow.removeBrowserView(view)
  view.destroy()
  delete views[parentView.id]

  // return/throw
  if (err) throw err
  return result
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
})

// internal methods
// =

function setBounds (view, parentWindow, {width, height} = {}) {
  width = width || 500
  height = height || 300
  var parentBounds = parentWindow.getContentBounds()
  view.setBounds({
    x: Math.round(parentBounds.width / 2) - Math.round(width / 2) - MARGIN_SIZE, // centered
    y: 74,
    width: width + (MARGIN_SIZE * 2),
    height: height + MARGIN_SIZE
  })
}
