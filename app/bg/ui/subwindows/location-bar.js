/**
 * Location Bar
 *
 * NOTES
 * - There can only ever be one Location Bar view for a given browser window
 * - Location Bar views are created with each browser window and then shown/hidden as needed
 * - When unfocused, the Location Bar view is hidden (it's meant to act as a popup menu)
 */
import path from 'path'
import Events from 'events'
import { BrowserWindow, BrowserView } from 'electron'
import * as rpc from 'pauls-electron-rpc'
import locationBarRPCManifest from '../../rpc-manifests/location-bar'
import * as tabManager from '../tabs/manager'
import * as filesystem from '../../filesystem/index'
import { joinPath } from '../../../lib/strings'

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
      defaultEncoding: 'utf-8',
      preload: path.join(__dirname, 'fg', 'location-bar', 'index.build.js')
    }
  })
  view.setAutoResize({width: true, height: false})
  view.webContents.on('console-message', (e, level, message) => {
    console.log('Location-Bar window says:', message)
  })
  view.webContents.loadURL('beaker://location-bar/')
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
  // noop
}

export async function show (parentWindow, opts) {
  var view = get(parentWindow)
  if (view) {
    view.opts = opts
    view.webContents.executeJavaScript(`setup(); undefined`)
    parentWindow.addBrowserView(view)
    view.setBounds({
      x: opts.bounds.x - MARGIN_SIZE,
      y: opts.bounds.y,
      width: opts.bounds.width + (MARGIN_SIZE*2),
      height: 588 + MARGIN_SIZE
    })
    view.isVisible = true
    view.webContents.focus()

    // await till hidden
    await new Promise(resolve => {
      // TODO confirm this works
      events.once('hide', resolve)
    })
  }
}

export function hide (parentWindow) {
  var view = get(parentWindow)
  if (view) {
    parentWindow.removeBrowserView(view)
    view.isVisible = false
    events.emit('hide') // TODO confirm this works
  }
}

export async function runCmd (parentWindow, cmd, opts) {
  var view = get(parentWindow)
  if (view) {
    if (!view.isVisible) {
      if (cmd === 'set-value') {
        // show first
        show(parentWindow, opts)
      } else {
        return
      }
    }
    return view.webContents.executeJavaScript(`command("${cmd}", ${JSON.stringify(opts)})`)
  }
}

// rpc api
// =

rpc.exportAPI('background-process-location-bar', locationBarRPCManifest, {
  async close () {
    hide(getParentWindow(this.sender))
  },

  async createTab (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the location bar
    tabManager.create(win, url, {setActive: true})
  },

  async loadURL (url) {
    var win = getParentWindow(this.sender)
    hide(win) // always close the location bar
    var active = tabManager.getActive(win)
    if (url.startsWith('/')) {
      // relative to current origin
      url = joinPath(active.origin, url)
    }
    active.loadURL(url)
    get(win).webContents.send('command', 'unfocus-location') // we have to manually unfocus the location bar
  },

  async resizeSelf (dimensions) {
    var view = get(getParentWindow(this.sender))
    view.setBounds({
      x: view.opts.bounds.x - MARGIN_SIZE,
      y: view.opts.bounds.y,
      width: (dimensions.width || view.opts.bounds.width) + (MARGIN_SIZE*2),
      height: (dimensions.height || 588) + MARGIN_SIZE
    })
  }
})

// internal methods
// =

function getParentWindow (sender) {
  var view = BrowserView.fromWebContents(sender)
  for (let id in views) {
    if (views[id] === view) {
      return BrowserWindow.fromId(+id)
    }
  }
  throw new Error('Parent window not found')
}