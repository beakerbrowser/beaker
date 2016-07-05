import { remote } from 'electron'
import EventEmitter from 'events'
import path from 'path'
import * as navbar from './ui/navbar'
import * as statusBar from './ui/status-bar'
import * as bookmarks from '../lib/fg/bookmarks-api'
import * as history from '../lib/fg/history-api'
import * as sitedata from '../lib/fg/sitedata-api'
import { urlToData } from '../lib/fg/img'

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

export function getAll () {
  return pages
}

export function getPinned () {
  return pages.filter(p => p.isPinned)
}

export function create (opts) {
  var url
  if (opts && typeof opts == 'object') {
    url = opts.url
  } else if (typeof opts == 'string') {
    url = opts
    opts = {}
  } else
    opts = {}

  // create page object
  var id = (Math.random()*1000|0) + Date.now()
  var page = {
    id: id,
    webviewEl: createWebviewEl(id, url),
    navbarEl: navbar.createEl(id),

    loadingURL: false, // what URL is being loaded, if any?
    bookmark: null, // this page's bookmark object, if it's bookmarked
    isWebviewReady: false, // has the webview loaded its methods?
    isActive: false, // is the active page?
    isPinned: opts.isPinned, // is this page pinned?
    isInpageFinding: false, // showing the inpage find ctrl?
    zoom: 0, // what's the current zoom level? (updated by a message from the webview)
    favicons: null, // what are the favicons of the page?

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
    },

    // add/remove bookmark
    toggleBookmark: function () {
      // update state
      if (page.bookmark) {
        bookmarks.remove(page.bookmark.url)
        page.bookmark = null
      } else if (page.isActive) {
        page.bookmark = { url: page.getURL(), title: page.getTitle() }
        bookmarks.add(page.bookmark.url, page.bookmark.title)
      }
      // update nav
      navbar.update(page)
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
  page.webviewEl.addEventListener('did-stop-loading', onDidStopLoading)
  page.webviewEl.addEventListener('load-commit', onLoadCommit)
  page.webviewEl.addEventListener('did-get-response-details', onDidGetResponseDetails)
  page.webviewEl.addEventListener('did-finish-load', onDidFinishLoad)
  page.webviewEl.addEventListener('did-fail-load', onDidFailLoad)
  page.webviewEl.addEventListener('page-favicon-updated', onPageFaviconUpdated)
  page.webviewEl.addEventListener('ipc-message', onIpcMessage)
  page.webviewEl.addEventListener('crashed', onCrashed)
  page.webviewEl.addEventListener('gpu-crashed', onCrashed)
  page.webviewEl.addEventListener('plugin-crashed', onCrashed)

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

  // persist pins if that was
  if (page.isPinned)
    savePinnedToDB()

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
  statusBar.setIsLoading(page.isLoading())
  events.emit('set-active', page)
}

export function togglePinned (page) {
  // move tab in/out of the pinned tabs
  var oldIndex = pages.indexOf(page), newIndex = 0
  for (newIndex; newIndex < pages.length; newIndex++)
    if (!pages[newIndex].isPinned)
      break
  if (oldIndex < newIndex) newIndex--
  pages.splice(oldIndex, 1)
  pages.splice(newIndex, 0, page)

  // update page state
  page.isPinned = !page.isPinned
  events.emit('update')

  // persist
  savePinnedToDB()
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

export function loadPinnedFromDB (cb) {
  sitedata.get('pinned-tabs', (err, json) => {
    try { JSON.parse(json).forEach(url => create({ url, isPinned: true })) }
    catch (e) {}
    cb && cb()
  })
}

export function savePinnedToDB (cb) {
  sitedata.set('pinned-tabs', JSON.stringify(getPinned().map(p => p.getURL())), cb)
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
    // update target url
    page.loadingURL = e.url
    navbar.update(page)
  }
}

function onLoadCommit (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return
  
  var page = getByWebview(e.target)
  if (page) {
    // check if this page bookmarked
    bookmarks.get(e.url, (err, bookmark) => {
      page.bookmark = bookmark
      navbar.update(page)
    })
    // stop autocompleting
    navbar.clearAutocomplete()
  }
}

function onDidStartLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    navbar.update(page)
    navbar.hideInpageFind(page)
    if (page.isActive)
      statusBar.setIsLoading(true)
  }
}

function onDidStopLoading (e) {
  var page = getByWebview(e.target)
  if (page && page.isActive)
    statusBar.setIsLoading(false)
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
    // update rendering
    page.loadingURL = false
    page.favicons = null
    navbar.update(page)

    // update history
    var url = page.getURL()
    if (/^(http|dat|ipfs|file)/.test(url)) {
      history.addVisit({ url: page.getURL(), title: page.getTitle() || page.getURL() }, warnIfError('history.addVisit'))
      bookmarks.addVisit(page.getURL(), warnIfError('bookmarks.addVisit'))
    }
  }
}

function onDidFailLoad (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return

  // ignore aborts. why:
  // - sometimes, aborts are caused by redirects. no biggy
  // - if the user cancels, then we dont want to give an error screen
  if (e.errorDescription == 'ERR_ABORTED')
    return

  var page = getByWebview(e.target)
  if (page) {
    // render failure page
    var errorPageHTML = `<body style="font-family: sans-serif;color: #666;">
      <div style="max-width: 410px;padding: 0px 35px 16px;border: 1px solid #ccc;background: #fdfdfd;">
        <h1 style="color: #555">This site can’t be reached</h1>
        <h2>${e.errorDescription}</h2>
        <a href="javascript:window.location.reload()" style="display: inline-block;background: #4b92ea;color:#fff;border-radius:2px;text-decoration: none;padding: 6px 17px;border: 1px solid #428ae4;">Retry</a>
      </div>
    </body>`.replace(/\n/g,'')
    page.webviewEl.getWebContents().executeJavaScript('document.documentElement.innerHTML = \''+errorPageHTML+'\'')
  }
}

function onPageFaviconUpdated (e) {
  if (e.favicons && e.favicons[0]) {
    var page = getByWebview(e.target)
    urlToData(e.favicons[0], 16, 16, (err, dataUrl) => {
      if (dataUrl)
        sitedata.setOtherOrigin(page.getURL(), 'favicon', dataUrl)
    })
  }
}

function onIpcMessage (e, type) {
  var page = getByWebview(e.target)
  if (page) {
    switch (e.channel) {
      case 'new-tab':         return create(e.args[0])
      case 'inspect-element': return page.webviewEl.inspectElement(e.args[0], e.args[1])
      case 'set-status-bar':  return statusBar.set(e.args[0])
      case 'set-zoom-level':
        page.zoom = e.args[0];
        navbar.update(page)
        break
    }
  }
}

function onCrashed (e) {
  console.error('Webview crash', e)
}

// internal helper functions
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
  el.setAttribute('preload', 'file://'+path.join(remote.app.getAppPath(), 'webview-preload.build.js'))
  el.setAttribute('src', url || DEFAULT_URL)
  return el
}

function rebroadcastEvent (e) {
  events.emit(e.type, e)
}

function warnIfError (label) {
  return err => {
    if (err)
      console.warn(label, err)
  }
}