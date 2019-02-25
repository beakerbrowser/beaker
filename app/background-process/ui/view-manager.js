import { BrowserView, BrowserWindow, Menu } from 'electron'
import * as beakerCore from '@beaker/core'
import path from 'path'
import Events from 'events'
import emitStream from 'emit-stream'
import _pick from 'lodash.pick'
import * as rpc from 'pauls-electron-rpc'
import viewsRPCManifest from '../rpc-manifests/views'
import * as zoom from './views/zoom'
import * as shellMenus from './subwindows/shell-menus'
import * as statusBar from './subwindows/status-bar'
const settingsDb = beakerCore.dbs.settings
const historyDb = beakerCore.dbs.history

const Y_POSITION = 78 
const DEFAULT_URL = 'beaker://start'

const STATE_VARS = [
  'url',
  'title',
  'zoom',
  'isActive',
  'isPinned',
  'isLoading',
  'isReceivingAssets',
  'canGoBack',
  'canGoForward'
]

// globals
// =

var activeViews = {} // map of {[win.id]: Array<View>}
var closedURLs = {} // map of {[win.id]: Array<string>}
var windowEvents = {} // mapof {[win.id]: Events}

// classes
// =

var DEBUG = 1

class View {
  constructor (win, opts = {isPinned: false}) {
    this.browserWindow = win
    this.browserView = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'webview-preload.build.js'),
        contextIsolation: false,
        webviewTag: false,
        sandbox: true,
        defaultEncoding: 'utf-8',
        nativeWindowOpen: true,
        nodeIntegration: false,
        scrollBounce: true
      }
    })
    this.browserView.setBackgroundColor('#fff')

    // webview state
    this.loadingURL = null // URL being loaded, if any
    this.isLoading = false // is the tab loading?
    this.isReceivingAssets = false // has the webview started receiving assets in the current load-cycle?
    this.zoom = 0 // what's the current zoom level?

    // browser state
    this.isActive = false // is this the active page in the window?
    this.isPinned = Boolean(opts.isPinned) // is this page pinned?

    // helper state
    this.isGuessingTheURLScheme = false // did beaker guess at the url scheme? if so, a bad load may deserve a second try

    // wire up events
    this.webContents.on('did-start-loading', this.onDidStartLoading.bind(this))
    this.webContents.on('did-start-navigation', this.onDidStartNavigation.bind(this))
    this.webContents.on('did-navigate', this.onDidNavigate.bind(this))
    this.webContents.on('did-navigate-in-page', this.onDidNavigateInPage.bind(this))
    this.webContents.on('did-stop-loading', this.onDidStopLoading.bind(this))
    this.webContents.on('update-target-url', this.onUpdateTargetUrl.bind(this))
  }

  get webContents () {
    return this.browserView.webContents
  }

  get url () {
    return this.webContents.getURL()
  }

  get title () {
    // TODO
    // this doesnt give us the best and quickest results
    // it'd be better to watch title-change events and to track the title manually
    return this.webContents.getTitle()
  }

  get canGoBack () {
    return this.webContents.canGoBack()
  }

  get canGoForward () {
    return this.webContents.canGoForward()
  }

  get state () {
    return _pick(this, STATE_VARS)
  }

  // management
  // =

  loadURL (url) {
    // TODO manage url and loadingURL
    this.browserView.webContents.loadURL(url)
  }

  activate () {
    this.isActive = true

    const win = this.browserWindow
    win.setBrowserView(this.browserView)
    var {width, height} = win.getBounds()
    this.browserView.setBounds({x: 0, y: Y_POSITION, width, height: height - Y_POSITION})
    this.browserView.setAutoResize({width: true, height: true})
  }

  deactivate () {
    if (this.isActive) {
      this.browserWindow.setBrowserView(null)
    }

    this.isActive = false
  }

  destroy () {
    this.deactivate()
    this.browserView.destroy()
  }

  async updateHistory () {
    var url = this.url
    var title = this.title
  
    if (!/^beaker:\/\/(start|history)/i.test(url)) {
      historyDb.addVisit(0, {url, title})
      if (this.isPinned) {
        savePins(this.browserWindow)
      }
    }
  }

  // events
  // =

  emitUpdateState () {
    emitUpdateState(this.browserWindow, this)
  }

  onDidStartLoading (e) {
    // update state
    this.isLoading = true
    this.isReceivingAssets = false

    // emit
    this.emitUpdateState()
  }

  onDidStartNavigation (e, url) {
  }

  onDidNavigate (e) {
    // read zoom
    zoom.setZoomFromSitedata(this)

    // update state
    this.isReceivingAssets = true

    // emit
    this.emitUpdateState()
  }

  onDidNavigateInPage (e) {
    this.updateHistory()
  }

  onDidStopLoading (e) {
    this.updateHistory()

    // update state
    this.isLoading = false
    this.isReceivingAssets = false

    // emit
    this.emitUpdateState()
  }

  onUpdateTargetUrl (e, url) {
    statusBar.set(this.browserWindow, url)
  }
}

// exported api
// =

export function getAll (win) {
  return activeViews[win.id] || []
}

export function getByIndex (win, index) {
  return getAll(win)[index]
}

export function getAllPinned (win) {
  return getAll(win).filter(p => p.isPinned)
}

export function getActive (win) {
  return getAll(win).find(view => view.isActive)
}

export function create (win, url, opts = {setActive: false, isPinned: false}) {
  url = url || DEFAULT_URL
  var view = new View(win, {isPinned: opts.isPinned})
  
  activeViews[win.id] = activeViews[win.id] || []
  if (opts.isPinned) {
    activeViews[win.id].splice(indexOfLastPinnedView(win), 0, view)
  } else {
    activeViews[win.id].push(view)
  }

  view.loadURL(url)

  // make active if requested, or if none others are
  if (opts.setActive || !getActive(win)) {
    setActive(win, view)
  }
  emitReplaceState(win)

  return view
}

export function remove (win, view) {
  // find
  var views = getAll(win)
  var i = views.indexOf(view)
  if (i == -1) {
    return console.warn('view-manager remove() called for missing view', view)
  }

  // save, in case the user wants to restore it
  closedURLs[win.id] = closedURLs[win.id] || []
  closedURLs[win.id].push(view.url)

  // set new active if that was
  if (view.isActive && views.length > 1) {
    setActive(win, views[i + 1] || views[i - 1])
  }

  // remove
  // view.stopLiveReloading() TODO
  views.splice(i, 1)
  view.destroy()

  // persist pins w/o this one, if that was
  if (view.isPinned) {
    savePins(win)
  }

  // close the window if that was the last view
  if (views.length === 0) {
    return win.close()
  }

  // emit
  emitReplaceState(win)
}

export function removeAllExcept (win, view) {
  var views = getAll(win).slice() // .slice() to duplicate the list
  for (let v of views) {
    if (v !== view) {
      remove(win, v)
    }
  }
}

export function removeAllToRightOf (win, view) {
  while (true) {
    let views = getAll(win)
    let index = views.indexOf(view) + 1
    if (index >= views.length) break
    remove(win, getByIndex(win, index))
  }
}

export function setActive (win, view) {
  if (typeof view === 'number') {
    view = getByIndex(win, view)
  }
  if (!view) return
  var active = getActive(win)
  if (active) {
    active.isActive = false
  }
  if (view) {
    view.activate()
  }
  emitReplaceState(win)
}

export function initializeFromSnapshot (win, snapshot) {
  for (let url of snapshot) {
    create(win, url)
  }
}

export function takeSnapshot (win) {
  return getAll(win)
    .filter((p) => !p.isPinned)
    .map((p) => p.getIntendedURL())
}

export function togglePinned (win, view) {
  // move tab to the "end" of the pinned tabs
  var views = getAll(win)
  var oldIndex = views.indexOf(view)
  var newIndex = indexOfLastPinnedView(win)
  if (oldIndex < newIndex) newIndex--
  views.splice(oldIndex, 1)
  views.splice(newIndex, 0, view)

  // update view state
  view.isPinned = !view.isPinned
  emitReplaceState(win)

  // persist
  savePins(win)
}

export function savePins (win) {
  return settingsDb.set('pinned_tabs', JSON.stringify(getAllPinned(win).map(p => p.url)))
}

export async function loadPins (win) {
  var json = await settingsDb.get('pinned_tabs')
  try { JSON.parse(json).forEach(url => create(win, url, {isPinned: true})) }
  catch (e) {
    console.log('Failed to load pins', e)
  }
}

export function reopenLastRemoved (win) {
  var url = (closedURLs[win.id] || []).pop()
  if (url) {
    var view = create(win, url)
    setActive(win, view)
    return view
  }
}

export function reorder (win, oldIndex, newIndex) {
  if (oldIndex === newIndex) {
    return
  }
  var views = getAll(win)
  var view = getByIndex(win, oldIndex)
  views.splice(oldIndex, 1)
  views.splice(newIndex, 0, view)
  emitReplaceState(win)
}

export function changeActiveBy (win, offset) {
  var views = getAll(win)
  var active = getActive(win)
  if (views.length > 1) {
    var i = views.indexOf(active)
    if (i === -1) { return console.warn('Active page is not in the pages list! THIS SHOULD NOT HAPPEN!') }

    i += offset
    if (i < 0) i = views.length - 1
    if (i >= views.length) i = 0

    setActive(win, views[i])
  }
}

export function changeActiveTo (win, index) {
  var views = getAll(win)
  if (index >= 0 && index < views.length) {
    setActive(win, views[index])
  }
}

export function changeActiveToLast (win) {
  var views = getAll(win)
  setActive(win, views[views.length - 1])
}

export function emitReplaceState (win) {
  var state = getWindowTabState(win)
  emit(win, 'replace-state', state)
}

export function emitUpdateState (win, view) {
  var index = typeof view === 'number' ? index : getAll(win).indexOf(view)
  if (index === -1) {
    console.warn('WARNING: attempted to update state of a view not on the window')
    return
  }
  var state = getByIndex(win, index).state
  emit(win, 'update-state', {index, state})
}

// rpc api
// =

rpc.exportAPI('background-process-views', viewsRPCManifest, {
  createEventStream () {
    return emitStream(getEvents(getWindow(this.sender)))
  },

  async getState () {
    var win = getWindow(this.sender)
    return getWindowTabState(win)
  },

  async createTab (url, opts = {setActive: false}) {
    var win = getWindow(this.sender)
    var view = create(win, url, opts)
    return getAll(win).indexOf(view)
  },

  async closeTab (index) {
    var win = getWindow(this.sender)
    remove(win, getByIndex(win, index))
  },

  async setActiveTab (index) {
    var win = getWindow(this.sender)
    setActive(win, getByIndex(win, index))
  },

  async reorderTab (oldIndex, newIndex) {
    var win = getWindow(this.sender)
    reorder(win, oldIndex, newIndex)
  },

  async showTabContextMenu (index) {
    var win = getWindow(this.sender)
    var view = getByIndex(win, index)
    var menu = Menu.buildFromTemplate([
      { label: 'New Tab', click: () => create(win, null, {setActive: true}) },
      { type: 'separator' },
      { label: 'Duplicate', click: () => create(win, view.url) },
      { label: (view.isPinned) ? 'Unpin Tab' : 'Pin Tab', click: () => togglePinned(win, view) },
      { label: (view.isAudioMuted) ? 'Unmute Tab' : 'Mute Tab', click: () => {/* TODO */} },
      { type: 'separator' },
      { label: 'Close Tab', click: () => remove(win, view) },
      { label: 'Close Other Tabs', click: () => removeAllExcept(win, view) },
      { label: 'Close Tabs to the Right', click: () => removeAllToRightOf(win, view) },
      { type: 'separator' },
      { label: 'Reopen Closed Tab', click: () => reopenLastRemoved(win) }
    ])
    menu.popup({window: win})
  },

  async goBack (index) {
    getByIndex(getWindow(this.sender), index).browserView.webContents.goBack()
  },

  async goForward (index) {
    getByIndex(getWindow(this.sender), index).browserView.webContents.goForward()
  },

  async stop (index) {
    getByIndex(getWindow(this.sender), index).browserView.webContents.stop()
  },

  async reload (index) {
    getByIndex(getWindow(this.sender), index).browserView.webContents.reload()
  },

  async resetZoom (index) {
    zoom.zoomReset(getByIndex(getWindow(this.sender), index))
  },

  async showMenu (id, opts) {
    await shellMenus.show(getWindow(this.sender), id, opts)
  },

  async toggleMenu (id, opts) {
    await shellMenus.toggle(getWindow(this.sender), id, opts)
  }
})

// internal methods
// =

function getWindow (sender) {
  return BrowserWindow.fromWebContents(sender)
}

function getEvents (win) {
  if (!(win.id in windowEvents)) {
    windowEvents[win.id] = new Events()
  }
  return windowEvents[win.id]
}

function emit (win, ...args) {
  getEvents(win).emit(...args)
}

function getWindowTabState (win) {
  return getAll(win).map(view => view.state)
}

function indexOfLastPinnedView (win) {
  var views = getAll(win)
  var index = 0
  for (index; index < views.length; index++) {
    if (!views[index].isPinned) break
  }
  return index
}
