import { remote } from 'electron'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import * as zoom from './pages/zoom'
import * as navbar from './ui/navbar'
import * as promptbar from './ui/promptbar'
import * as statusBar from './ui/statusbar'
import { urlToData } from '../lib/fg/img'
import { debounce } from '../lib/functions'
import errorPage from '../lib/error-page'

// constants
// =

const ERR_ABORTED = -3
const ERR_CONNECTION_REFUSED = -102
const ERR_INSECURE_RESPONSE = -501

const TRIGGER_LIVE_RELOAD_DEBOUNCE = 1e3 // debounce live-reload triggers by this amount

export const FIRST_TAB_URL = 'beaker://start'
export const DEFAULT_URL = 'beaker://start'

// globals
// =

var pages = []
var activePage = null
var events = new EventEmitter()
var webviewsDiv = document.getElementById('webviews')
var closedURLs = []
var cachedMarkdownRendererScript

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

export function setup () {
  beaker.archives.addEventListener('network-changed', ({details}) => {
    // check if any of the active pages matches this url
    pages.forEach(page => {
      if (page.siteInfo && page.siteInfo.url === details.url) {
        // update info
        page.siteInfo.peers = details.peers
        navbar.update(page)
      }
    })
  })
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

  url = url || DEFAULT_URL

  // create page object
  var id = (Math.random()*1000|0) + Date.now()
  var page = {
    id: id,
    webviewEl: createWebviewEl(id, url),
    navbarEl: navbar.createEl(id),
    promptbarEl: promptbar.createEl(id),

    // page state
    loadingURL: url, // what URL is being loaded, if any?
    isGuessingTheURLScheme: false, // did beaker guess at the url scheme? if so, a bad load may deserve a second try
    manuallyTrackedIsLoading: true, // used because the webview may never be ready, so webview.isLoading() isnt enough
    isWebviewReady: false, // has the webview loaded its methods?
    isReceivingAssets: false, // has the webview started receiving assets, in the current load-cycle?
    isActive: false, // is the active page?
    isInpageFinding: false, // showing the inpage find ctrl?
    liveReloadEvents: false, // live-reload event stream
    zoom: 0, // what's the current zoom level?

    // current page's info
    contentType: null, // what is the content-type of the page?
    favicons: null, // what are the favicons of the page?
    faviconDominantColor: null, // what's the computed dominant color of favicon?
    bookmark: null, // this page's bookmark object, if it's bookmarked

    // current site's info
    protocolInfo: null, // info about the current page's delivery protocol
    siteInfo: null, // metadata about the current page, derived from protocol knowledge
    sitePerms: null, // saved permissions for the current page
    siteInfoOverride: null, // explicit overrides on the siteinfo, used by beaker: pages
    siteHasDatAlternative: false, // is there a dat:// version we can redirect to?

    // history
    lastVisitedAt: 0, // when is last time url updated?
    lastVisitedURL: null, // last URL added into history

    // prompts
    prompts: [], // list of active prompts (used with perms)

    // tab state
    isPinned: opts.isPinned, // is this page pinned?
    isTabDragging: false, // being dragged?
    tabDragOffset: 0, // if being dragged, this is the current offset

    // get the URL of the page we want to load (vs which is currently loaded)
    getIntendedURL: function () {
      var url = page.loadingURL || page.getURL()
      if (url.startsWith('beaker:') && page.siteInfoOverride && page.siteInfoOverride.url) {
        // override, only if on a builtin beaker site
        url = page.siteInfoOverride.url
      }
      return url
    },

    // custom isLoading
    isLoading: function() {
      return page.manuallyTrackedIsLoading
    },

    // wrap webview loadURL to set the `loadingURL`
    loadURL: function (url, opts) {
      // reset some state
      page.isReceivingAssets = false
      page.siteInfoOverride = null

      // HACK to fix electron#8505
      // dont allow visibility: hidden until set active
      page.webviewEl.classList.remove('can-hide')

      // set and go
      page.loadingURL = url
      page.isGuessingTheURLScheme = opts && opts.isGuessingTheScheme
      page.webviewEl.loadURL(url)
    },

    // HACK wrap reload so we can remove can-hide class
    reload() {
      // HACK to fix electron#8505
      // dont allow visibility: hidden until set active
      page.webviewEl.classList.remove('can-hide')
      setTimeout(() => page.webviewEl.reload(), 100)
      // ^ needs a delay or it doesnt take effect in time, SMH at this code though
    },

    // add/remove bookmark
    toggleBookmark: function () {
      // update state
      if (page.bookmark) {
        beaker.bookmarks.remove(page.bookmark.url)
        page.bookmark = null
      } else if (page.isActive) {
        page.bookmark = { url: page.getURL(), title: page.getTitle() }
        beaker.bookmarks.add(page.bookmark.url, page.bookmark.title)
      }
      // update nav
      navbar.update(page)
    },

    getURLOrigin: function () {
      return parseURL(this.getURL()).origin
    },

    getViewFilesURL: function (subview) {
      var urlp = parseURL(this.getURL())
      if (!urlp) return false
      var path = urlp.pathname
      if (!path.endsWith('/')) {
        // strip the filename at the end
        path = path.slice(0, path.lastIndexOf('/'))
      }
      return `beaker://editor/${urlp.host}${path}${subview?'#'+subview:''}`
    },

    isLiveReloading() {
      return !!page.liveReloadEvents
    },

    // start/stop live reloading
    toggleLiveReloading: function () {
      if (page.liveReloadEvents) {
        page.liveReloadEvents.close()
        page.liveReloadEvents = false
      } else if (page.siteInfo) {
        var archive = new DatArchive(page.siteInfo.key)
        page.liveReloadEvents = archive.createFileActivityStream()
        let event = (page.siteInfo.isOwner) ? 'changed' : 'invalidated'
        page.liveReloadEvents.addEventListener(event, () => {
          page.triggerLiveReload(page.siteInfo.key)
        })
      }
      navbar.update(page)
    },

    // reload the page due to changes in the dat
    triggerLiveReload: debounce(archiveKey => {
      // double check that we're still on the page
      if (page.getIntendedURL().startsWith('dat://' + archiveKey)) {
        // reload
        page.reload()
      }
    }, TRIGGER_LIVE_RELOAD_DEBOUNCE, true),
    // ^ note this is on the front edge of the debouncer.
    // That means snappier reloads (no delay) but possible double reloads if multiple files change

    // helper to load the perms
    fetchSitePerms () {
      beakerSitedata.getPermissions(this.getURL()).then(perms => {
        page.sitePerms = perms
        navbar.update(page)
      })
    },

    // helper to check if there's a dat version of the site available
    checkForDatAlternative (name) {
      DatArchive.resolveName(name).then(res => {
        this.siteHasDatAlternative = !!res
        navbar.update(page)
      }).catch(err => console.log('Name does not have a Dat alternative', name))
    }
  }

  if (opts.isPinned)
    pages.splice(indexOfLastPinnedTab(), 0, page)
  else
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

    // ['reload'], TEMPORARY see definition
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
  page.webviewEl.addEventListener('did-get-redirect-request', onDidGetRedirectRequest)
  page.webviewEl.addEventListener('did-get-response-details', onDidGetResponseDetails)
  page.webviewEl.addEventListener('did-finish-load', onDidFinishLoad)
  page.webviewEl.addEventListener('did-fail-load', onDidFailLoad)
  page.webviewEl.addEventListener('page-favicon-updated', onPageFaviconUpdated)
  page.webviewEl.addEventListener('update-target-url', onUpdateTargetUrl)
  page.webviewEl.addEventListener('close', onClose)
  page.webviewEl.addEventListener('crashed', onCrashed)
  page.webviewEl.addEventListener('gpu-crashed', onCrashed)
  page.webviewEl.addEventListener('plugin-crashed', onCrashed)
  page.webviewEl.addEventListener('ipc-message', onIPCMessage)
  page.webviewEl.addEventListener('page-title-updated', onPageTitleUpdated)

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

  // emit
  events.emit('remove', page)
  events.emit('update')

  // remove all attributes, to clear circular references
  for (var k in page) {
    page[k] = null
  }
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
  promptbar.update()
  events.emit('set-active', page)

  // HACK to fix electron#8505
  // can now allow visibility: hidden
  page.webviewEl.classList.add('can-hide')
}

export function togglePinned (page) {
  // move tab in/out of the pinned tabs
  var oldIndex = pages.indexOf(page)
  var newIndex = indexOfLastPinnedTab()
  if (oldIndex < newIndex) newIndex--
  pages.splice(oldIndex, 1)
  pages.splice(newIndex, 0, page)

  // update page state
  page.isPinned = !page.isPinned
  events.emit('pin-updated', page)

  // persist
  savePinnedToDB()
}

function indexOfLastPinnedTab () {
  var index = 0
  for (index; index < pages.length; index++)
    if (!pages[index].isPinned)
      break
  return index
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

export function getByWebContents (webContents) {
  for (var i=0; i < pages.length; i++) {
    if (pages[i].webviewEl && pages[i].webviewEl.getWebContents() == webContents)
      return pages[i]
  }
  return null
}

export function getById (id) {
  for (var i=0; i < pages.length; i++) {
    if (pages[i].id == id)
      return pages[i]
  }
  return null
}

export function loadPinnedFromDB () {
  return beakerBrowser.getSetting('pinned-tabs').then(json => {
    try { JSON.parse(json).forEach(url => create({ url, isPinned: true })) }
    catch (e) {}
  })
}

export function savePinnedToDB () {
  return beakerBrowser.setSetting('pinned-tabs', JSON.stringify(getPinned().map(p => p.getURL())))
}

// event handlers
// =

function onDomReady (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.isWebviewReady = true
    if (!navbar.isLocationFocused(page)) {
      page.webviewEl.focus()
    }
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
    page.siteInfoOverride = null
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
    updateHistory(page)
  }
}

function onLoadCommit (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return

  var page = getByWebview(e.target)
  if (page) {
    // check if this page bookmarked
    beaker.bookmarks.get(e.url).then(bookmark => {
      page.bookmark = bookmark
      navbar.update(page)
    })
    zoom.setZoomFromSitedata(page, parseURL(page.getIntendedURL()).origin)
    // stop autocompleting
    navbar.clearAutocomplete()
    // close any prompts
    promptbar.forceRemoveAll(page)
  }
}

function onDidStartLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    // update state
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
    var url = page.getURL()
    // update history
    updateHistory(page)

    // fetch protocol and page info
    var { protocol, hostname } = parseURL(url)
    page.siteInfo = null
    page.sitePerms = null
    page.siteHasDatAlternative = false
    page.protocolInfo = { url, hostname, scheme: protocol, label: protocol.slice(0, -1).toUpperCase() }
    if (protocol === 'https:') {
      page.checkForDatAlternative(hostname)
    }
    if (protocol === 'dat:') {
      DatArchive.resolveName(hostname).then(key => {
        beaker.archives.get(key).then(info => {
          page.siteInfo = info
          navbar.update(page)
        })
      })
    }
    if (protocol !== 'beaker:') {
      page.fetchSitePerms()
    }

    // update page
    page.loadingURL = false
    page.manuallyTrackedIsLoading = false
    if (page.isActive) {
      navbar.update(page)
      navbar.updateLocation(page)
      statusBar.setIsLoading(false)
    }

    // markdown rendering
    // inject the renderer script if the page is markdown
    if (page.contentType === 'text/markdown' || page.contentType === 'text/x-markdown') {
      // hide the unformatted text and provide some basic styles
      page.webviewEl.insertCSS(`
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif; }
        body > pre { display: none; }
        main { display: flex; }
        nav { max-width: 200px; padding-right: 2em; }
        nav .link { white-space: pre; overflow: hidden; text-overflow: ellipsis; margin: 0.5em 0 }
        main > div { max-width: 800px; }
        hr { border: 0; border-top: 1px solid #ccc; margin: 1em 0; }
        blockquote { margin: 0; padding: 0 1em; border-left: 1em solid #eee; }
        .anchor-link { color: #aaa; margin-left: 5px; text-decoration: none; }
        table { border-collapse: collapse; }
        td, th { padding: 0.5em 1em; }
        tbody tr:nth-child(odd) { background: #fafafa; }
        tbody td { border-top: 1px solid #bbb; }
        .switcher { position: absolute; top: 5px; right: 5px; font-family: monospace; font-weight: bold; cursor: pointer; }
        code { font-size: 1.3em; background: #fafafa; }
        pre { background: #fafafa; padding: 1em }
      `)
      if (!cachedMarkdownRendererScript) {
        cachedMarkdownRendererScript = fs.readFileSync(path.join(remote.app.getAppPath(), 'markdown-renderer.build.js'), 'utf8')
      }
      page.webviewEl.executeJavaScript(cachedMarkdownRendererScript)
    }

    // HACK
    // inject some corrections to the user-agent styles
    // real solution is to update electron so we can change the user-agent styles
    // -prf
    page.webviewEl.insertCSS(
      // set the default background to white.
      // on some devices, if no bg is set, the buffer doesnt get cleared
      `body {
        background: #fff;
      }` +

      // hide context menu definitions
      `menu[type="context"] { display: none; }` +

      // adjust the positioning of fullpage media players
      `body:-webkit-full-page-media {
        background: #ddd;
      }
      audio:-webkit-full-page-media, video:-webkit-full-page-media {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }`
    )
  }
}

function onDidGetRedirectRequest (e) {
  // HACK
  // electron has a problem handling redirects correctly, so we need to handle it for them
  // see https://github.com/electron/electron/issues/3471
  // thanks github.com/sokcuri for this fix
  // -prf
  if (e.isMainFrame) {
    var page = getByWebview(e.target)
    if (page) {
      e.preventDefault()
      setTimeout(() => page.loadURL(e.newURL), 100)
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
    try {
      page.contentType = e.headers['content-type'][0] || null
    } catch (e) {
      page.contentType = null
    }
    // set URL in navbar
    page.loadingURL = e.newURL
    page.siteInfoOverride = null
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
  }
}

function onDidFailLoad (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame)
    return

  // ignore aborts. why:
  // - sometimes, aborts are caused by redirects. no biggy
  // - if the user cancels, then we dont want to give an error screen
  if (e.errorDescription == 'ERR_ABORTED' || e.errorCode == ERR_ABORTED)
    return

  // also ignore non-errors
  // - appears to happen if you go to an IPFS site that needs to do a redirect, then hit back btn
  if (e.errorCode == 0)
    return

  var page = getByWebview(e.target)
  if (page) {
    // if https fails for some specific reasons, and beaker *assumed* https, then fallback to http
    if (page.isGuessingTheURLScheme && [ERR_INSECURE_RESPONSE, ERR_CONNECTION_REFUSED].indexOf(e.errorCode) >= 0) {
      console.log('Guessed the URL scheme was HTTPS, but got back', e.errorDescription, ' - trying HTTP')
      var url = page.getIntendedURL()
      page.isGuessingTheURLScheme = false // no longer doing that!
      if (url.startsWith('https')) {
        url = url.replace(/^https/, 'http')
        page.loadURL(url)
        return
      }
    }

    // render failure page
    var errorPageHTML = errorPage(e)
    page.webviewEl.getWebContents().executeJavaScript('document.documentElement.innerHTML = \''+errorPageHTML+'\'')
  }
}

function onPageFaviconUpdated (e) {
  if (e.favicons && e.favicons[0]) {
    var page = getByWebview(e.target)
    page.favicons = e.favicons
    page.faviconDominantColor = null
    urlToData(e.favicons[0], 64, 64, (err, res) => {
      if (res) {
        beakerSitedata.set(page.getURL(), 'favicon', res.url)
        page.faviconDominantColor = res.dominantColor
        events.emit('page-favicon-updated', getByWebview(e.target))
      }
    })
  }
}

function onUpdateTargetUrl ({ url }) {
  statusBar.set(url)
}

function onClose (e) {
  var page = getByWebview(e.target)
  if (page) {
    remove(page)
  }  
}

function onPageTitleUpdated (e) {
  var page = getByWebview(e.target)

  // if page title changed within 15 seconds, update it again
  if (page.getURL() === page.lastVisitedURL && Date.now() - page.lastVisitedAt < 15 * 1000) {
    updateHistory(page)
  }
}

function onCrashed (e) {
  console.error('Webview crash', e)
}

function onIPCMessage (e) {
  var page = getByWebview(e.target)
  if (!page) return
  switch (e.channel) {
    case 'site-info-override:set': page.siteInfoOverride = e.args[0]; navbar.updateLocation(page); navbar.update(page); break
    case 'site-info-override:clear': page.siteInfoOverride = null; navbar.updateLocation(page); navbar.update(page); break
  }
}

// internal helper functions
// =

function show (page) {
  page.webviewEl.classList.remove('hidden')
  page.navbarEl.classList.remove('hidden')
  page.promptbarEl.classList.remove('hidden')
  events.emit('show', page)
}

function hide (page) {
  page.webviewEl.classList.add('hidden')
  page.navbarEl.classList.add('hidden')
  page.promptbarEl.classList.add('hidden')
  events.emit('hide', page)
}

function createWebviewEl (id, url) {
  var el = document.createElement('webview')
  el.dataset.id = id
  el.setAttribute('preload', 'file://'+path.join(remote.app.getAppPath(), 'webview-preload.build.js'))
  el.setAttribute('webpreferences', 'allowDisplayingInsecureContent,contentIsolation')
  el.setAttribute('src', url || DEFAULT_URL)
  return el
}

function rebroadcastEvent (e) {
  events.emit(e.type, getByWebview(e.target), e)
}

function warnIfError (label) {
  return err => {
    if (err)
      console.warn(label, err)
  }
}

function parseURL (str) {
  try { return new URL(str) }
  catch (e) { return {} }
}

function updateHistory (page) {
  var url = page.getURL()
  beaker.history.addVisit({url: page.getURL(), title: page.getTitle() || page.getURL()})
  if (page.isPinned) {
    savePinnedToDB()
  }
  page.lastVisitedAt = Date.now()
  page.lastVisitedURL = url
}
