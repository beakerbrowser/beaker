/**
 * Modal
 *
 * NOTES
 * - Modal views are created as-needed, and desroyed when not in use
 * - Modal views are attached to individual BrowserView instances
 * - Modal views are shown and hidden based on whether its owning BrowserView is visible
 */

import path from 'path'
import { app, BrowserWindow, BrowserView, Menu, clipboard } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { ModalActiveError } from 'beaker-error-constants'
import * as tabManager from '../tabs/manager'
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
    if (!tab) {
      // this can happen when the passed `webContents` is a shell-menu or similar sub-window
      tab = tabManager.getActive(parentWindow)
    }
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

  // wait for tab to be actives
  if (!tab.isActive) {
    await tab.awaitActive()
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
    if (win) win.removeBrowserView(view)
    view.destroy()
    delete views[tab.id]
  }
}

export function handleContextMenu (webContents, targetWindow, can, props) {
  var menuItems = []
  if (props.linkURL) {
    menuItems.push({ label: 'Open Link in New Tab', click: (item, win) => tabManager.create(win, props.linkURL, {setActive: true, adjacentActive: true}) })
    menuItems.push({ label: 'Copy Link Address', click: () => clipboard.writeText(props.linkURL) })
  }
  if (props.mediaType == 'image') {
    menuItems.push({ label: 'Copy Image', click: () => webContents.copyImageAt(props.x, props.y) })
    menuItems.push({ label: 'Copy Image URL', click: () => clipboard.writeText(props.srcURL) })
    menuItems.push({ label: 'Open Image in New Tab', click: (item, win) => tabManager.create(win, props.srcURL, {adjacentActive: true}) })
  }
  if (props.isEditable) {
    menuItems.push({ label: 'Cut', role: 'cut', enabled: can('Cut') })
    menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
    menuItems.push({ label: 'Paste', role: 'paste', enabled: props.editFlags.canPaste })
  } else if (props.selectionText.trim().length > 0) {
    menuItems.push({ label: 'Copy', role: 'copy', enabled: can('Copy') })
  }
  if (menuItems.length === 0) return

  var menuInstance = Menu.buildFromTemplate(menuItems)
  menuInstance.popup({ window: targetWindow })
}

// rpc api
// =

rpc.exportAPI('background-process-modals', modalsRPCManifest, {
  async createTab (url) {
    var win = findWebContentsParentWindow(this.sender)
    tabManager.create(win, url, {setActive: true, adjacentActive: true})
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
  if (view.modalName === 'select-drive') return 600
  if (view.modalName === 'select-file') return 800
  if (view.modalName === 'select-contact') return 700
  if (view.modalName === 'folder-sync') return 700
  return 500
}

function getDefaultHeight (view) {
  if (view.modalName === 'select-file') return 460
  if (view.modalName === 'select-contact') return 460
  return 300
}

function setBounds (view, parentWindow, {width, height} = {}) {
  var parentBounds = parentWindow.getContentBounds()
  // HACK workaround the lack of view.getBounds() -prf
  view.currentBounds = view.currentBounds || {width: undefined, height: undefined}
  view.currentBounds.width = Math.min(width || view.currentBounds.width || getDefaultWidth(view), parentBounds.width - 20)
  view.currentBounds.height = Math.min(height || view.currentBounds.height || getDefaultHeight(view), parentBounds.height - 20)
  view.setBounds({
    x: Math.round(parentBounds.width / 2) - Math.round(view.currentBounds.width / 2) - MARGIN_SIZE, // centered
    y: 72,
    width: view.currentBounds.width + (MARGIN_SIZE * 2),
    height: view.currentBounds.height + MARGIN_SIZE
  })
}
