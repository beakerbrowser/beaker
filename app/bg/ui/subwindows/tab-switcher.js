/**
 * Prompts
 *
 * NOTES
 * - There is one tab-switcher per BrowserWindow instance
 * - Status Bar views are created with each browser window and then shown/hidden as needed
 */

import path from 'path'
import { BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import * as tabManager from '../tab-manager'
// import promptsRPCManifest from '../../rpc-manifests/prompts'
import { findWebContentsParentWindow } from '../../lib/electron'

// constants
// =

const VIEW_MARGIN = 10
const TAB_ENTRY_WIDTH = 120
const TAB_GAP = 10
const HEIGHT = 114 + (VIEW_MARGIN * 2)

// globals
// =

var views = {} // map of {[parentWindow.id] => BrowserView}

// exported api
// =

export function setup (parentWindow) {
  var view = views[parentWindow.id] = new BrowserView({
    webPreferences: {
      defaultEncoding: 'utf-8'
    }
  })
  view.webContents.loadFile(path.join(__dirname, 'fg', 'tab-switcher', 'index.html'))
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
    var {width, height} = parentWindow.getContentBounds()
    var numTabs = (view.tabs ? view.tabs.length : 0)

    var viewWidth = (
      (numTabs * TAB_ENTRY_WIDTH) // tab entry width
      + ((numTabs - 1) * TAB_GAP) // tab entry grid-gap
      + 20 // tab-switcher body padding
      + (VIEW_MARGIN * 2) // tab-switcher body margin
    )
    var viewHeight = HEIGHT

    if (viewWidth > (width - 100)) {
      viewWidth = width - 100
    }

    view.setBounds({x: ((width / 2) - (viewWidth/ 2))|0, y: ((height / 2) - (viewHeight / 2))|0, width: viewWidth, height: viewHeight})
  }
}

export function show (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    // read the current tabs state
    var defaultCurrentSelection = tabManager.getPreviousTabIndex(parentWindow)
    var tabs = tabManager.getAll(parentWindow).map(tab => ({
      url: tab.url,
      title: tab.title
    }))
    view.tabs = tabs

    // render
    parentWindow.addBrowserView(view)
    view.webContents.executeJavaScript(`
      window.setTabs(${JSON.stringify(tabs)}, ${defaultCurrentSelection}); undefined
    `)
    reposition(parentWindow)
  }
}

export async function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    var selectedTabIndex = await view.webContents.executeJavaScript(`
      window.getSelection()
    `)
    if (typeof selectedTabIndex === 'number') {
      tabManager.setActive(parentWindow, selectedTabIndex)
    }
    parentWindow.removeBrowserView(view)
  }
}

export async function moveSelection (parentWindow, dir) {
  var view = get(parentWindow)
  if (view) {
    await view.webContents.executeJavaScript(`
      window.moveSelection(${dir})
    `)
  }
}
