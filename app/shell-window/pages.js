import { remote } from 'electron'
import EventEmitter from 'events'
import path from 'path'
import * as zoom from './pages/zoom'
import * as navbar from './ui/navbar'
import * as statusBar from './ui/status-bar'
import { urlToData } from '../lib/fg/img'
import errorPage from '../lib/error-page'

export const DEFAULT_URL = 'beaker:start'

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

    // page state
    loadingURL: false, // what URL is being loaded, if any?
    isGuessingTheURLScheme: false, // did beaker guess at the url scheme? if so, a bad load may deserve a second try
    manuallyTrackedIsLoading: true, // used because the webview may never be ready, so webview.isLoading() isnt enough
    bookmark: null, // this page's bookmark object, if it's bookmarked
    isWebviewReady: false, // has the webview loaded its methods?
    isReceivingAssets: false, // has the webview started receiving assets, in the current load-cycle?
    isActive: false, // is the active page?
    isInpageFinding: false, // showing the inpage find ctrl?
    zoom: 0, // what's the current zoom level?
    favicons: null, // what are the favicons of the page?
    archiveInfo: null, // if a dat archive, includes the metadata

    // tab state
    isPinned: opts.isPinned, // is this page pinned?
    isTabRendered: false, // has the tab el been rendered?
    isTabDragging: false, // being dragged?
    tabDragOffset: 0, // if being dragged, this is the current offset

    // get the URL of the page we want to load (vs which is currently loaded)
    getIntendedURL: function () {
      return page.loadingURL || page.getURL()
    },

    // custom isLoading
    isLoading: function() {
      return page.manuallyTrackedIsLoading
    },

    // wrap webview loadURL to set the `loadingURL`
    loadURL: function (url, opts) {
      // reset some state
      page.isReceivingAssets = false

      // set and go
      page.loadingURL = url
      page.isGuessingTheURLScheme = opts && opts.isGuessingTheScheme
      page.webviewEl.loadURL(url)
    },

    // add/remove bookmark
    toggleBookmark: function () {
      // update state
      if (page.bookmark) {
        beakerBookmarks.remove(page.bookmark.url)
        page.bookmark = null
      } else if (page.isActive) {
        page.bookmark = { url: page.getURL(), title: page.getTitle() }
        beakerBookmarks.add(page.bookmark.url, page.bookmark.title)
      }
      // update nav
      navbar.update(page)
    },

    getURLOrigin: function () {
      return (new URL(this.getURL())).origin
    }
  }
  pages.push(page)

  // create proxies for webview methods
  //   webviews need to be dom-ready before their methods work
  //   this wraps the methods so the call isnt made if not ready
  ;([
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
  events.emit('update')
  events.emit('add', page)

  // register events
  page.webviewEl.addEventListener('dom-ready', onDomReady)
  page.webviewEl.addEventListener('new-window', onNewWindow)
  page.webviewEl.addEventListener('will-navigate', onWillNavigate)
  page.webviewEl.addEventListener('did-navigate-in-page', onDidNavigateInPage)
  page.webviewEl.addEventListener('did-start-loading', onDidStartLoading)
  page.webviewEl.addEventListener('did-stop-loading', onDidStopLoading)
  page.webviewEl.addEventListener('load-commit', onLoadCommit)
  page.webviewEl.addEventListener('did-get-response-details', onDidGetResponseDetails)
  page.webviewEl.addEventListener('did-finish-load', onDidFinishLoad)
  page.webviewEl.addEventListener('did-fail-load', onDidFailLoad)
  page.webviewEl.addEventListener('page-favicon-updated', onPageFaviconUpdated)
  page.webviewEl.addEventListener('update-target-url', onUpdateTargetUrl)
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

  // set new active if that was
  if (page.isActive) {
    if (pages.length == 1)
      return window.close()
    setActive(pages[i+1] || pages[i-1])
  }

  // remove
  pages.splice(i, 1)
  webviewsDiv.removeChild(page.webviewEl)

  // persist pins w/o this one, if that was
  if (page.isPinned)
    savePinnedToDB()

  // remove all attributes, to clear circular references
  for (var k in page)
    page[k] = null

  // emit
  events.emit('remove', page)
  events.emit('update')
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
  page.webviewEl.focus()
  statusBar.setIsLoading(page.isLoading())
  navbar.update()
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

export function reorderTab (page, offset) {
  // only allow increments of 1
  if (offset > 1 || offset < -1)
    return console.warn('reorderTabBy isnt allowed to offset more than -1 or 1; this is a coding error')

  // first check if reordering can happen
  var srcIndex = pages.indexOf(page)
  var dstIndex = srcIndex + offset
  var swapPage = pages[dstIndex]
  // is there actually a destination?
  if (!swapPage)
    return false
  // can only swap if both are the same pinned state (pinned/unpinned cant mingle)
  if (page.isPinned != swapPage.isPinned)
    return false

  // ok, do the swap
  pages[srcIndex] = swapPage
  pages[dstIndex] = page
  return true
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

export function getAdjacentPage (page, offset) {
  if (pages.length > 1) {
    // lookup the index
    var i = pages.indexOf(page)
    if (i === -1)
      return null

    // add offset and return
    return pages[i + offset]
  }
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
  beakerSitedata.get('pinned-tabs', (err, json) => {
    try { JSON.parse(json).forEach(url => create({ url, isPinned: true })) }
    catch (e) {}
    cb && cb()
  })
}

export function savePinnedToDB (cb) {
  beakerSitedata.set('pinned-tabs', JSON.stringify(getPinned().map(p => p.getURL())), cb)
}

// event handlers
// =

function onDomReady (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.isWebviewReady = true
    zoom.setZoomFromSitedata(page)
  }
}

function onNewWindow (e) {
  var page = create(e.url)
  if (e.disposition == 'foreground-tab')
    setActive(page)
}

// will-navigate is the first event called when a link is clicked
// we can set the URL now, and update the navbar, to get quick response from the page
// (if entered by the user in the URL bar, this wont emit, but the loadURL() wrapper will set it)
function onWillNavigate (e) {
  var page = getByWebview(e.target)
  if (page) {
    // reset some state
    page.isReceivingAssets = false
    // update target url
    page.loadingURL = e.url
    navbar.updateLocation(page)
  }
}

// did-navigate-in-page is triggered by hash/virtual-url changes
// we need to update the url bar but no load event occurs
function onDidNavigateInPage (e) {
  var page = getByWebview(e.target)
  if (page) {
    // update ui
    navbar.updateLocation(page)

    // update history
    var url = page.getURL()
    if (!url.startsWith('beaker:')) {
      beakerHistory.addVisit({ url: page.getURL(), title: page.getTitle() || page.getURL() }, warnIfError('history.addVisit'))
      beakerBookmarks.addVisit(page.getURL(), warnIfError('bookmarks.addVisit'))
    }
  }
}

function onLoadCommit (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return
  
  var page = getByWebview(e.target)
  if (page) {
    // check if this page bookmarked
    beakerBookmarks.get(e.url, (err, bookmark) => {
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
    page.manuallyTrackedIsLoading = true
    navbar.update(page)
    navbar.hideInpageFind(page)
    if (page.isActive)
      statusBar.setIsLoading(true)
  }
}

function onDidStopLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.manuallyTrackedIsLoading = false
    if (page.isActive) {
      navbar.update(page)
      statusBar.setIsLoading(false)
    }
  }
}

function onDidGetResponseDetails (e) {
  if (e.resourceType != 'mainFrame')
    return

  var page = getByWebview(e.target)
  if (page) {
    // we're goin
    page.isReceivingAssets = true
    // set URL in navbar
    page.loadingURL = e.newURL
    navbar.updateLocation(page)
  }
}

function onDidFinishLoad (e) {
  var page = getByWebview(e.target)
  if (page) {
    // reset page object
    page.loadingURL = false
    page.isGuessingTheURLScheme = false
    page.favicons = null
    navbar.update(page)
    navbar.updateLocation(page)

    // update history
    var url = page.getURL()
    if (!url.startsWith('beaker:')) {
      beakerHistory.addVisit({ url: page.getURL(), title: page.getTitle() || page.getURL() }, warnIfError('history.addVisit'))
      beakerBookmarks.addVisit(page.getURL(), warnIfError('bookmarks.addVisit'))
    }

    // fetch protocol info
    page.protocolDescription = beakerPluginModules.getProtocolDescription((new URL(url)).protocol)
    console.log('Protocol description', page.protocolDescription)
  }
}

function onDidFailLoad (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return

  // ignore aborts. why:
  // - sometimes, aborts are caused by redirects. no biggy
  // - if the user cancels, then we dont want to give an error screen
  if (e.errorDescription == 'ERR_ABORTED' || e.errorCode == -3) // -3 = ABORTED
    return

  var page = getByWebview(e.target)
  if (page) {
    // if https fails for security reasons, and beaker *assumed* https, then fallback to http
    // -501 == ERR_INSECURE_RESPONSE
    if (e.errorCode == -501 && page.isGuessingTheURLScheme) {
      var url = page.getIntendedURL()
      page.isGuessingTheURLScheme = false // no longer doing that!
      if (url.startsWith('https')) {
        url = url.replace(/^https/, 'http')
        page.loadURL(url)
        return
      }
    }

    // render failure page
    var errorPageHTML = errorPage(e.errorDescription)
    page.webviewEl.getWebContents().executeJavaScript('document.documentElement.innerHTML = \''+errorPageHTML+'\'')
  }
}

function onPageFaviconUpdated (e) {
  if (e.favicons && e.favicons[0]) {
    var page = getByWebview(e.target)
    urlToData(e.favicons[0], 16, 16, (err, dataUrl) => {
      if (dataUrl)
        beakerSitedata.setOtherOrigin(page.getURL(), 'favicon', dataUrl)
    })
  }
}

function onUpdateTargetUrl ({ url }) {
  statusBar.set(url)
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