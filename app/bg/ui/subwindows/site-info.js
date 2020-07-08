/**
 * Site Infos
 *
 * NOTES
 * - There can only ever be one Site Info view for a given browser window
 * - Site Info views are created with each browser window and then shown/hidden as needed
 * - The Site Info view contains the UIs for multiple menus and swaps between them as needed
 * - When unfocused, the Site Info view is hidden (it's meant to act as a popup menu)
 */

import path from 'path'
import Events from 'events'
import { BrowserWindow, BrowserView } from 'electron'
import * as tabManager from '../tabs/manager'
import { getAddedWindowSettings } from '../windows'

// globals
// =

const MARGIN_SIZE = 10
var events = new Events()
var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
      nodeIntegrationInSubFrames: true,
      contextIsolation: true,
      webviewTag: false,
      sandbox: true,
      defaultEncoding: 'utf-8',
      nativeWindowOpen: true,
      nodeIntegration: false,
      scrollBounce: true,
      navigateOnDragDrop: false
    }
  })
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Site-Info window says:', message)
  })
  view.webContents.loadURL('beaker://site-info/')
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
      // HACK workaround the lack of view.getBounds() -prf
      if (view.currentBounds) {
        b = view.currentBounds // use existing bounds
      }
      view.currentBounds = b // store new bounds
      view.setBounds(adjustBounds(view, parentWindow, b))
    }
    setBounds({
      x: view.boundsOpt ? view.boundsOpt.left : 170,
      y: (view.boundsOpt ? view.boundsOpt.top : 67) + 5,
      width: 420,
      height: 350
    })
  }
}

export function resize (parentWindow, bounds = {}) {
  var view = get(parentWindow)
  if (view && view.currentBounds) {
    view.currentBounds.width = bounds.width || view.currentBounds.width
    view.currentBounds.height = bounds.height || view.currentBounds.height
    view.setBounds(adjustBounds(view, parentWindow, view.currentBounds))
  }
}

export function toggle (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    if (view.isVisible) {
      return hide(parentWindow)
    } else {
      return show(parentWindow, opts)
    }
  }
}

export async function show (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    view.boundsOpt = opts && opts.bounds
    parentWindow.addBrowserView(view)
    reposition(parentWindow)
    view.isVisible = true

    var params = opts && opts.params ? opts.params : {}
    params.url = tabManager.getActive(parentWindow).url
    await view.webContents.executeJavaScript(`init(${JSON.stringify(params)})`)
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
    view.webContents.executeJavaScript(`reset(); undefined`)
    parentWindow.removeBrowserView(view)
    view.currentBounds = null
    view.isVisible = false
    events.emit('hide')
  }
}

// internal methods
// =

/**
 * @description
 * Ajust the bounds for margin
 */
function adjustBounds (view, parentWindow, bounds) {
  let parentBounds = parentWindow.getContentBounds()
  return {
    x: bounds.x - MARGIN_SIZE,
    y: bounds.y,
    width: bounds.width + (MARGIN_SIZE * 2),
    height: bounds.height + MARGIN_SIZE
  }
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