import { remote } from 'electron'
import EventEmitter from 'events'
import path from 'path'
import * as navbar from './ui/navbar'
import * as statusBar from './ui/status-bar'

const DEFAULT_URL = 'beaker:start'

// globals
// =

var pages = []
var activePage = null
var events = new EventEmitter()
var webviewsDiv = document.getElementById('webviews')
var closedURLs = []

// exported functions
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getAll() {
  return pages
}

export function create (url) {
  // create page object
  var id = (Math.random()*1000|0) + Date.now()
  var page = {
    id: id,
    webviewEl: createWebviewEl(id, url),
    navbarEl: navbar.createEl(id),

    loadingURL: false, // what URL is being loaded, if any?
    isWebviewReady: false, // has the webview loaded its methods?
    isActive: false, // is the active page?
    isInpageFinding: false, // showing the inpage find ctrl?

    // get the URL of the page we want to load (vs which is currently loaded)
    getIntendedURL: function () {
      return page.loadingURL || page.getURL()
    },

    // wrap webview loadURL to set the `loadingURL`
    loadURL: function (url) {
      // if (page.isWebviewReady) {
        page.loadingURL = url
        page.webviewEl.loadURL(url)
      // }
    }
  }
  pages.push(page)

  // create proxies for webview methods
  //   webviews need to be dom-ready before their methods work
  //   this wraps the methods so the call isnt made if not ready
  ;([
    ['isLoading', true],
    ['getURL', ''],
    ['getTitle', ''],
    
    ['goBack'],
    ['canGoBack'],
    ['goForward'],
    ['canGoForward'],

    ['reload'],
    ['reloadIgnoringCache'],
    ['stop'],

    ['isDevToolsOpened', false],
    ['openDevTools'],
    ['closeDevTools'],
    ['send'],

    ['findInPage'],
    ['stopFindInPage']
  ]).forEach(methodSpec => {
    var name = methodSpec[0]
    var defaultReturn = methodSpec[1]
    page[name] = (...args) => {
      if (page.isWebviewReady)
        return page.webviewEl[name].apply(page.webviewEl, args)
      return defaultReturn
    }
  })
  hide(page) // hidden by default
  webviewsDiv.appendChild(page.webviewEl)

  // emit
  events.emit('add', page)
  events.emit('update')

  // register events
  page.webviewEl.addEventListener('dom-ready', onDomReady)
  page.webviewEl.addEventListener('new-window', onNewWindow)
  page.webviewEl.addEventListener('will-navigate', onWillNavigate)
  page.webviewEl.addEventListener('did-start-loading', onDidStartLoading)
  page.webviewEl.addEventListener('did-get-response-details', onDidGetResponseDetails)
  page.webviewEl.addEventListener('did-finish-load', onDidFinishLoad)
  page.webviewEl.addEventListener('did-fail-load', onDidFailLoad)
  page.webviewEl.addEventListener('ipc-message', onIpcMessage)

  // rebroadcasts
  page.webviewEl.addEventListener('load-commit', rebroadcastEvent)
  page.webviewEl.addEventListener('did-finish-load', rebroadcastEvent)
  page.webviewEl.addEventListener('did-fail-load', rebroadcastEvent)
  page.webviewEl.addEventListener('did-start-loading', rebroadcastEvent)
  page.webviewEl.addEventListener('did-stop-loading', rebroadcastEvent)
  page.webviewEl.addEventListener('did-get-response-details', rebroadcastEvent)
  page.webviewEl.addEventListener('did-get-redirect-request', rebroadcastEvent)
  page.webviewEl.addEventListener('dom-ready', rebroadcastEvent)
  page.webviewEl.addEventListener('page-title-updated', rebroadcastEvent)
  page.webviewEl.addEventListener('page-favicon-updated', rebroadcastEvent)
  page.webviewEl.addEventListener('console-message', rebroadcastEvent)
  page.webviewEl.addEventListener('will-navigate', rebroadcastEvent)
  page.webviewEl.addEventListener('did-navigate', rebroadcastEvent)
  page.webviewEl.addEventListener('did-navigate-in-page', rebroadcastEvent)

  // make active if none others are
  if (!activePage)
    setActive(page)

  return page
}

export function remove (page) {
  // find
  var i = pages.indexOf(page)
  if (i == -1)
    return console.warn('pages.remove() called for missing page', page)

  // save, in case the user wants to restore it
  closedURLs.push(page.getURL())

  // remove
  pages.splice(i, 1)
  webviewsDiv.removeChild(page.webviewEl)

  // set new active if that was
  if (page.isActive) {
    if (pages.length == 0)
      create()
    setActive(pages[pages.length - 1])
  }

  // emit
  events.emit('remove', page)
  events.emit('update')

  // remove all attributes, to clear circular references
  for (var k in page)
    page[k] = null
}

export function reopenLastRemoved () {
  var url = closedURLs.pop()
  if (url) {
    var page = create(url)
    setActive(page)
    return page
  }
}

export function setActive (page) {
  if (activePage) {
    hide(activePage)
    activePage.isActive = false
  }
  activePage = page
  show(page)
  page.isActive = 1
  events.emit('set-active', page)
}

export function changeActiveBy (offset) {
  if (pages.length > 1) {
    var i = pages.indexOf(activePage)
    if (i === -1)
      return console.warn('Active page is not in the pages list! THIS SHOULD NOT HAPPEN!')

    i += offset
    if (i < 0)             i = pages.length - 1
    if (i >= pages.length) i = 0

    setActive(pages[i])
  }
}

export function changeActiveTo (index) {
  if (index >= 0 && index < pages.length)
    setActive(pages[index])
}

export function getActive () {
  return activePage
}

export function getByWebview (el) {
  return getById(el.dataset.id)
}

export function getById (id) {
  for (var i=0; i < pages.length; i++) {
    if (pages[i].id == id)
      return pages[i]
  }
  return null
}

// event handlers
// =

function onDomReady (e) {
  var page = getByWebview(e.target)
  if (page) page.isWebviewReady = true
}

function onNewWindow (e) {
  create(e.url)
}

// will-navigate is the first event called when a link is clicked
// we can set the URL now, and update the navbar, to get quick response from the page
// (if entered by the user in the URL bar, this wont emit, but the loadURL() wrapper will set it)
function onWillNavigate (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.loadingURL = e.url
    navbar.update(page)
  }  
}

function onDidStartLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    navbar.update(page)
    navbar.hideInpageFind(page)
  }
}

function onDidGetResponseDetails (e) {
  if (e.resourceType != 'mainFrame')
    return

  var page = getByWebview(e.target)
  if (page) {
    page.loadingURL = e.newURL
    navbar.update(page)
  }
}

function onDidFinishLoad (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.loadingURL = false
    navbar.update(page)
  }
}

function onDidFailLoad (e) {
  var page = getByWebview(e.target)
  if (page) {
    // TODO, render failure page
  }
}

function onIpcMessage (e, type) {
  var page = getByWebview(e.target)
  if (page) {
    switch (e.channel) {
      case 'new-tab':         return create(e.args[0])
      case 'inspect-element': return page.webviewEl.inspectElement(e.args[0], e.args[1])
      case 'set-status-bar':  return statusBar.set(e.args[0])
    }
  }
}

// internal functions
// =

function show (page) {
  page.webviewEl.classList.remove('hidden')
  page.navbarEl.classList.remove('hidden')
  events.emit('show', page)
}

function hide (page) {
  page.webviewEl.classList.add('hidden')
  page.navbarEl.classList.add('hidden')
  events.emit('hide', page)
}

function createWebviewEl (id, url) {
  var el = document.createElement('webview')
  el.dataset.id = id
  el.setAttribute('preload', 'file://'+path.join(remote.app.getAppPath(), 'webview-preload.js'))
  el.setAttribute('src', url || DEFAULT_URL)
  return el
}

function rebroadcastEvent (e) {
  events.emit(e.type, e)
}