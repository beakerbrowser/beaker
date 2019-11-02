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
import * as tabManager from '../tab-manager'
import modalsRPCManifest from '../../rpc-manifests/modals'
import { findWebContentsParentWindow } from '../../lib/electron'

// globals
// =

const MARGIN_SIZE = 10
var views = {} // map of {[tab.id] => BrowserView}

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

export async function create (webContents, modalName, params = {}) {
  // find parent window
  var parentWindow = BrowserWindow.fromWebContents(webContents)
  var parentView = BrowserView.fromWebContents(webContents)
  var tab
  if (parentView && !parentWindow) {
    // if there's no window, then a web page or "sub-window" created the prompt
    // use its containing window
    tab = tabManager.findTab(parentView)
    parentWindow = findWebContentsParentWindow(parentView.webContents)
  } else if (!parentView) {
    // if there's no view, then the shell window created the prompt
    // attach it to the active view
    tab = tabManager.getActive(parentWindow)
    parentWindow = tab.browserWindow
  }

  // make sure a prompt window doesnt already exist
  if (tab.id in views) {
    throw new ModalActiveError()
  }

  // create the view
  var view = views[tab.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'modals', 'index.build.js')
    }
  })
  view.modalName = modalName
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
  delete views[tab.id]

  // return/throw
  if (err) throw err
  return result
}

export function get (tab) {
  return views[tab.id]
}

export function show (tab) {
  if (tab.id in views) {
    var win = tabManager.findContainingWindow(tab)
    if (!win) win = findWebContentsParentWindow(views[tab.id].webContents)
    if (win) win.addBrowserView(views[tab.id])
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
    var view = views[tab.id]
    var win = tabManager.findContainingWindow(tab)
    win.removeBrowserView(view)
    view.destroy()
    delete views[tab.id]
  }
}

// rpc api
// =

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
})

// internal methods
// =

function getDefaultWidth (view) {
  return 500
}

function getDefaultHeight (view) {
  return 300
}

function setBounds (view, parentWindow, {width, height} = {}) {
  var parentBounds = parentWindow.getContentBounds()
  width = Math.min(width || getDefaultWidth(view), parentBounds.width - 20)
  height = Math.min(height || getDefaultHeight(view), parentBounds.height - 20)
  view.setBounds({
    x: Math.round(parentBounds.width / 2) - Math.round(width / 2) - MARGIN_SIZE, // centered
    y: 72,
    width: width + (MARGIN_SIZE * 2),
    height: height + MARGIN_SIZE
  })
}
