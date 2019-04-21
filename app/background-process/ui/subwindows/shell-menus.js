/**
 * Shell Menus
 *
 * NOTES
 * - There can only ever be one Shell Menu window for a given browser window
 * - Shell Menu windows are created with each browser window and then shown/hidden as needed
 * - The Shell Menu window contains the UIs for multiple menus and swaps between them as needed
 * - When unfocused, the Shell Menu window is hidden (it's meant to act as a popup menu)
 */

import path from 'path'
import Events from 'events'
import {BrowserWindow} from 'electron'
import * as rpc from 'pauls-electron-rpc'
import {createShellWindow} from '../windows'
import * as viewManager from '../view-manager'
import shellMenusRPCManifest from '../../rpc-manifests/shell-menus'

// globals
// =

var events = new Events()
var windows = {} // map of {[parentWindow.id] => BrowserWindow}

// exported api
// =

export function setup (parentWindow) {
  var win = windows[parentWindow.id] = new BrowserWindow({
    parent: parentWindow,
    frame: false,
    resizable: false,
    maximizable: false,
    show: false,
    fullscreenable: false,
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'shell-menus.build.js')
    }
  })
  win.webContents.on('console-message', (e, level, message) => {
    console.log('Shell-Menus window says:', message)
  })
  win.loadURL('beaker://shell-menus/')
  win.on('blur', () => hide(parentWindow))
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).close()
    delete windows[parentWindow.id]
  }
}

export function get (parentWindow) {
  return windows[parentWindow.id]
}

export function reposition (parentWindow) {
  var win = get(parentWindow)
  if (win) {
    var parentBounds = parentWindow.getBounds()
    if (win.menuId === 'browser') {
      win.setBounds({
        x: parentBounds.x + parentBounds.width - 245,
        y: parentBounds.y + 74,
        width: 240,
        height: 277
      })
    } else if (win.menuId === 'profile') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 260,
        y: parentBounds.y + win.boundsOpt.top,
        width: 260,
        height: 110
      })
    } else if (win.menuId === 'create') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 200,
        y: parentBounds.y + win.boundsOpt.top,
        width: 200,
        height: 95
      })
    } else if (win.menuId === 'bookmark') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 300,
        y: parentBounds.y + win.boundsOpt.top,
        width: 300,
        height: 400
      })
    } else if (win.menuId === 'peers') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 300,
        y: parentBounds.y + win.boundsOpt.top,
        width: 300,
        height: 118
      })
    } else if (win.menuId === 'donate') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 320,
        y: parentBounds.y + win.boundsOpt.top,
        width: 320,
        height: 88
      })
    } else if (win.menuId === 'site-tools') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 220,
        y: parentBounds.y + win.boundsOpt.top,
        width: 220,
        height: 122
      })
    } else if (win.menuId === 'preview-mode-tools') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 220,
        y: parentBounds.y + win.boundsOpt.top,
        width: 220,
        height: 122
      })
    } else if (win.menuId === 'site-info') {
      win.setBounds({
        x: parentBounds.x + 100,
        y: parentBounds.y + 74,
        width: 450,
        height: 300
      })
    }
  }
}

export async function toggle (parentWindow, menuId, opts) {
  var win = get(parentWindow)
  if (win) {
    if (win.isVisible()) {
      return hide(parentWindow)
    } else {
      return show(parentWindow, menuId, opts)
    }
  }
}

export async function show (parentWindow, menuId, opts) {
  var win = get(parentWindow)
  if (win) {
    win.menuId = menuId
    win.boundsOpt = opts && opts.bounds
    reposition(parentWindow)

    var params = opts && opts.params ? opts.params : {}
    await win.webContents.executeJavaScript(`openMenu('${menuId}', ${JSON.stringify(params)})`)
    win.show()

    // await till hidden
    await new Promise(resolve => {
      events.once('hide', resolve)
    })
  }
}

export function hide (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).hide()
    events.emit('hide')
  }
}

// rpc api
// =

rpc.exportAPI('background-process-shell-menus', shellMenusRPCManifest, {
  async close () {
    hide(getParentWindow(this.sender))
  },

  async createWindow (url) {
    createShellWindow()
  },

  async createTab (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the menu
    viewManager.create(win, url, {setActive: true})
  },

  async loadURL (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the menu
    viewManager.getActive(win).loadURL(url)
  },

  async resizeSelf (dimensions) {
    var win = BrowserWindow.fromWebContents(this.sender)
    if (process.platform === 'win32') {
      // on windows, add space for the border
      if (dimensions.width) dimensions.width += 2
      if (dimensions.height) dimensions.height += 2
    }
    win.setBounds(dimensions)
  },

  async showInpageFind () {
    var win = getParentWindow(this.sender)
    var view = viewManager.getActive(win)
    if (view) view.showInpageFind()
  }
})

// internal methods
// =

function getParentWindow (sender) {
  return BrowserWindow.fromWebContents(sender).getParentWindow()
}