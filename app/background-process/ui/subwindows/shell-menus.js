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
var windows = {} // map of {[parent.id] => BrowserWindow}

// exported api
// =

export function setup (parent) {
  var win = windows[parent.id] = new BrowserWindow({
    parent,
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
  win.on('blur', () => hide(parent))
}

export function destroy (parent) {
  if (get(parent)) {
    get(parent).close()
    delete windows[parent.id]
  }
}

export function get (parent) {
  return windows[parent.id]
}

export function reposition (parent) {
  var win = get(parent)
  if (win) {
    // TODO
    // var parentBounds = parent.getBounds()
    // var b = {}
    // for (let k in b) {
    //   if (k in win.offsets) {
    //     b[k] = parentBounds[k] + win.offsets[k]
    //   }
    // }
    // win.setBounds(b)
    var parentBounds = parent.getBounds()
    if (win.menuId === 'browser') {
      win.setBounds({
        x: parentBounds.x + parentBounds.width - 245,
        y: parentBounds.y + 74,
        width: 240,
        height: 466
      })
    } else if (win.menuId === 'page') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 220,
        y: parentBounds.y + win.boundsOpt.top,
        width: 220,
        height: 110
      })
    } else if (win.menuId === 'location') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.x,
        y: parentBounds.y + win.boundsOpt.y,
        width: win.boundsOpt.width,
        height: 310
      })
    } else if (win.menuId === 'bookmark') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 300,
        y: parentBounds.y + win.boundsOpt.top,
        width: 300,
        height: 250
      })
    } else if (win.menuId === 'peers') {
      win.setBounds({
        x: parentBounds.x + win.boundsOpt.right - 300,
        y: parentBounds.y + win.boundsOpt.top,
        width: 300,
        height: 118
      })
    }
  }
}

export async function toggle (parent, menuId, opts) {
  var win = get(parent)
  if (win) {
    if (win.isVisible()) {
      return hide(parent)
    } else {
      return show(parent, menuId, opts)
    }
  }
}

export async function show (parent, menuId, opts) {
  var win = get(parent)
  if (win) {
    win.menuId = menuId
    win.boundsOpt = opts && opts.bounds
    reposition(parent)

    var params = opts && opts.params ? opts.params : {}
    await win.webContents.executeJavaScript(`openMenu('${menuId}', ${JSON.stringify(params)})`)
    win.show()

    // await till hidden
    await new Promise(resolve => {
      events.once('hide', resolve)
    })
  }
}

export function hide (parent) {
  if (get(parent)) {
    get(parent).hide()
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
    viewManager.create(win, url, {setActive: true})
  },

  async loadURL (url) {
    var win = getParentWindow(this.sender)
    viewManager.getActive(win).loadURL(url)
  },

  async resizeSelf (dimensions) {
    var win = BrowserWindow.fromWebContents(this.sender)
    var [width, height] = win.getSize()
    win.setSize(dimensions.width || width, dimensions.height || height)
  },

  async showInpageFind () {
    // TODO
  }
})

// internal methods
// =

function getParentWindow (sender) {
  return BrowserWindow.fromWebContents(sender).getParentWindow()
}