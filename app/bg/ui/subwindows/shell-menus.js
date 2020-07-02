/**
 * Shell Menus
 *
 * NOTES
 * - There can only ever be one Shell Menu view for a given browser window
 * - Shell Menu views are created with each browser window and then shown/hidden as needed
 * - The Shell Menu view contains the UIs for multiple menus and swaps between them as needed
 * - When unfocused, the Shell Menu view is hidden (it's meant to act as a popup menu)
 */

import path from 'path'
import Events from 'events'
import { BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import { createShellWindow } from '../windows'
import * as tabManager from '../tabs/manager'
import * as modals from './modals'
import { getToolbarMenu, triggerMenuItemById } from '../window-menu'
import shellMenusRPCManifest from '../../rpc-manifests/shell-menus'

// globals
// =

const IS_OSX = process.platform === 'darwin'
const MARGIN_SIZE = 10
const IS_RIGHT_ALIGNED = ['browser', 'bookmark', 'network', 'peers', 'share', 'site', 'donate']
var events = new Events()
var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'shell-menus', 'index.build.js')
    }
  })
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Shell-Menus window says:', message)
  })
  view.webContents.loadURL('beaker://shell-menus/')
}

export function destroy (parentWindow) {
  if (get(parentWindow)) {
    get(parentWindow).destroy()
    delete views[parentWindow.id]
  }
}

export function get (parentWindow) {
  return views[parentWindow.id]
}

export function reposition (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    const setBounds = (b) => {
      if (view.currentDimensions) {
        Object.assign(b, view.currentDimensions)
      } else {
        adjustDimensions(b)
      }
      adjustPosition(b, view, parentWindow)
      view.setBounds(b)
    }
    if (view.menuId === 'background-tray') {
      setBounds({
        x: IS_OSX ? 75 : 10,
        y: 33,
        width: 400,
        height: 350
      })
    } else if (view.menuId === 'browser') {
      setBounds({
        x: 10,
        y: 72,
        width: 230,
        height: 350
      })
    } else if (view.menuId === 'network') {
      setBounds({
        x: 70,
        y: 72,
        width: 230,
        height: 400
      })
    } else if (view.menuId === 'bookmark') {
      setBounds({
        x: view.boundsOpt.rightOffset,
        y: 72,
        width: 250,
        height: 225
      })
    } else if (view.menuId === 'bookmark-edit') {
      setBounds({
        x: view.boundsOpt.left,
        y: view.boundsOpt.top,
        width: 250,
        height: 225
      })
    } else if (view.menuId === 'toolbar') {
      setBounds({
        x: view.boundsOpt.left,
        y: view.boundsOpt.top,
        width: 250,
        height: 550
      })
    } else if (view.menuId === 'donate') {
      setBounds({
        x: view.boundsOpt.rightOffset,
        y: 72,
        width: 350,
        height: 90
      })
    } else if (view.menuId === 'share') {
      setBounds({
        x: view.boundsOpt.rightOffset,
        y: 72,
        width: 310,
        height: 120
      })
    } else if (view.menuId === 'peers') {
      setBounds({
        x: view.boundsOpt.rightOffset,
        y: 72,
        width: 200,
        height: 350
      })
    } else if (view.menuId === 'site') {
      setBounds({
        x: view.boundsOpt.rightOffset,
        y: 72,
        width: 250,
        height: 350
      })
    }
  }
}

export async function toggle (parentWindow, menuId, opts) {
  var view = get(parentWindow)
  if (view) {
    if (view.isVisible) {
      return hide(parentWindow)
    } else {
      return show(parentWindow, menuId, opts)
    }
  }
}

export async function update (parentWindow, opts) {
  var view = get(parentWindow)
  if (view && view.isVisible) {
    view.boundsOpt = opts && opts.bounds ? opts.bounds : view.boundsOpt
    reposition(parentWindow)
    var params = opts && opts.params ? opts.params : {}
    await view.webContents.executeJavaScript(`updateMenu(${JSON.stringify(params)})`)
  }
}

export async function show (parentWindow, menuId, opts) {
  var view = get(parentWindow)
  if (view) {
    view.menuId = menuId
    view.boundsOpt = opts && opts.bounds
    parentWindow.addBrowserView(view)
    reposition(parentWindow)
    view.isVisible = true

    var params = opts && opts.params ? opts.params : {}
    await view.webContents.executeJavaScript(`openMenu('${menuId}', ${JSON.stringify(params)})`)
    view.webContents.focus()

    // await till hidden
    await new Promise(resolve => {
      events.once('hide', resolve)
    })
  }
}

export function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    view.webContents.executeJavaScript(`reset('${view.menuId}')`)
    parentWindow.removeBrowserView(view)
    view.currentDimensions = null
    view.isVisible = false
    events.emit('hide')
  }
}

// rpc api
// =

rpc.exportAPI('background-process-shell-menus', shellMenusRPCManifest, {
  async close () {
    hide(getParentWindow(this.sender))
  },

  async createWindow (opts) {
    createShellWindow(opts)
  },

  async createTab (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the menu
    tabManager.create(win, url, {setActive: true})
  },

  async createModal (name, opts) {
    return modals.create(this.sender, name, opts)
  },

  async loadURL (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the menu
    tabManager.getActive(win).loadURL(url)
  },

  async resizeSelf (dimensions) {
    var view = BrowserView.fromWebContents(this.sender)
    if (!view.isVisible) return
    adjustDimensions(dimensions)
    view.currentDimensions = dimensions
    reposition(getParentWindow(this.sender))
  },

  async showInpageFind () {
    var win = getParentWindow(this.sender)
    var tab = tabManager.getActive(win)
    if (tab) tab.showInpageFind()
  },

  async getWindowMenu () {
    return getToolbarMenu()
  },

  async triggerWindowMenuItemById (menu, id) {
    return triggerMenuItemById(menu, id)
  }
})

// internal methods
// =

function adjustPosition (bounds, view, parentWindow) {
  if (IS_RIGHT_ALIGNED.includes(view.menuId)) {
    let parentBounds = parentWindow.getContentBounds()
    bounds.x = (parentBounds.width - bounds.width - bounds.x) + MARGIN_SIZE
  } else {
    bounds.x = bounds.x - MARGIN_SIZE
  }
}

function adjustDimensions (bounds) {
  bounds.width = bounds.width + (MARGIN_SIZE * 2),
  bounds.height = bounds.height + MARGIN_SIZE
}

function getParentWindow (sender) {
  var view = BrowserView.fromWebContents(sender)
  for (let id in views) {
    if (views[id] === view) {
      return BrowserWindow.fromId(+id)
    }
  }
  throw new Error('Parent window not found')
}