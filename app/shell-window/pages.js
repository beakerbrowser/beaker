/* globals beaker DatArchive URL */

import { ipcRenderer, remote } from 'electron'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import throttle from 'lodash.throttle'
import parseDatURL from 'parse-dat-url'
import errorPage from '@beaker/core/lib/error-page'
import * as zoom from './pages/zoom'
import * as navbar from './ui/navbar'
import * as prompt from './ui/prompt'
import * as modal from './ui/modal'
import * as statusBar from './ui/statusbar'
import * as toast from './ui/toast.js'
import { SiteInfoNavbarBtn } from './ui/navbar/site-info'
import { DatsiteMenuNavbarBtn } from './ui/navbar/datsite-menu'
import {urlsToData} from '../lib/fg/img'
import addAsyncAlternatives from './webview-async'

// constants
// =

const ERR_ABORTED = -3
const ERR_CONNECTION_REFUSED = -102
const ERR_INSECURE_RESPONSE = -501

const TRIGGER_LIVE_RELOAD_DEBOUNCE = 500 // throttle live-reload triggers by this amount

export const FIRST_TAB_URL = 'beaker://start'
export const DEFAULT_URL = 'beaker://start'

export const APP_PATH = remote.app.getAppPath() // NOTE: this is a sync op

// globals
// =

var pages = []
var activePage = null
var events = new EventEmitter()
var webviewsDiv
var closedURLs = []
var cachedMarkdownRendererScript
var cachedJSONRendererScript

// exported functions
// =

export function on (...args) {
  events.on.apply(events, args)
}

export function getAll () {
  return pages
}

export function get (index) {
  return pages[index]
}

export function getPinned () {
  return pages.filter(p => p.isPinned)
}

export function setup () {
  webviewsDiv = document.getElementById('webviews')

  beaker.archives.addEventListener('network-changed', ({details}) => {
    // check if any of the active pages matches this url
    pages.forEach(page => {
      if (page.siteInfo && page.siteInfo.url === details.url) {
        // update info
        page.siteInfo.peers = details.connections
        navbar.update(page)
      }
      // refresh if this was a 503ed site
      if (page.siteWasADatTimeout && page.url.startsWith(details.url)) {
        page.reload()
      }
    })
  })

  events.on('update', e => {
    ipcRenderer.send('shell-window:pages-updated', takeSnapshot())
  })
}

export function initializeFromSnapshot (snapshot) {
  for (let url of snapshot) create(url)
}

function takeSnapshot () {
  return getAll()
    .filter((p) => !p.isPinned)
    .map((p) => p.getIntendedURL())
}

export function create (opts) {
  var url
  if (opts && typeof opts === 'object') {
    url = opts.url
  } else if (typeof opts === 'string') {
    url = opts
    opts = {}
  } else { opts = {} }

  url = url || DEFAULT_URL

  // create page object
  var id = (Math.random() * 1000 | 0) + Date.now()
  var page = {
    id: id,
    wcID: null, // the id of the webcontents
    webviewEl: createWebviewEl(id, url),
    navbarEl: navbar.createEl(id),
    promptEl: prompt.createContainer(id),
    modalEl: modal.createContainer(id),
    siteInfoNavbarBtn: null, // set after object is created
    datsiteMenuNavbarBtn: null, // set after object is created

    // page state
    _url: url, // what is the actual current URL?
    get url () { return this._url },
    set url (v) {
      this._url = v
      ipcRenderer.send('shell-window:set-current-location', v) // inform main process
    },
    loadingURL: url, // what URL is being loaded, if any?
    title: '', // what is the current pages title?
    isGuessingTheURLScheme: false, // did beaker guess at the url scheme? if so, a bad load may deserve a second try
    manuallyTrackedIsLoading: true, // used because the webview may never be ready, so webview.isLoading() isnt enough
    isWebviewReady: false, // has the webview loaded its methods?
    isReceivingAssets: false, // has the webview started receiving assets, in the current load-cycle?
    isActive: false, // is the active page?
    isInpageFinding: false, // showing the inpage find ctrl?
    inpageFindInfo: null, // any info available on the inpage find {activeMatchOrdinal, matches}
    liveReloadEvents: false, // live-reload event stream
    zoom: 0, // what's the current zoom level?
    retainedScrollY: 0, // what was the scroll position of the page before navigating away?

    // current page's info
    favicons: null, // what are the favicons of the page?
    bookmark: null, // this page's bookmark object, if it's bookmarked

    // current site's info
    protocolInfo: null, // info about the current page's delivery protocol
    siteLoadError: null, // info about the current page's last load's error (null if no error)
    siteInfo: null, // metadata about the current page, derived from protocol knowledge
    sitePerms: null, // saved permissions for the current page
    siteInfoOverride: null, // explicit overrides on the siteinfo, used by beaker: pages
    siteHasDatAlternative: false, // is there a dat:// version we can redirect to?
    siteWasADatTimeout: false, // did we timeout trying to find this site on the dat network?

    // history
    lastVisitedAt: 0, // when is last time url updated?
    lastVisitedURL: null, // last URL added into history
    _canGoBack: false, // cached to avoid sync calls to the main process
    _canGoForward: false, // cached to avoid sync calls to the main process

    // UI elements
    prompts: [], // list of active prompts (used with perms)
    modals: [], // list of active modals

    // tab state
    isPinned: opts.isPinned, // is this page pinned?
    isTabDragging: false, // being dragged?
    tabDragOffset: 0, // if being dragged, this is the current offset

    // get the current URL
    getURL () {
      return this.url
    },

    // get the current title
    getTitle () {
      return this.title
    },

    // get the URL of the page we want to load (vs which is currently loaded)
    getIntendedURL () {
      var url = page.loadingURL || page.getURL()
      if (url.startsWith('beaker:') && page.siteInfoOverride && page.siteInfoOverride.url) {
        // override, only if on a builtin beaker site
        url = page.siteInfoOverride.url
      }
      return url
    },

    // custom isLoading
    isLoading () {
      return page.manuallyTrackedIsLoading
    },

    // cache getters to avoid sync calls to the main process
    canGoBack () { return this._canGoBack },
    canGoForward () { return this._canGoForward },

    // wrap webview loadURL to set the `loadingURL`
    loadURL (url, opts) {
      // reset some state
      page.isReceivingAssets = false
      page.siteInfoOverride = null

      // set and go
      page.loadingURL = url
      page.isGuessingTheURLScheme = opts && opts.isGuessingTheScheme
      if (!page.isWebviewReady) {
        // just do a sync call, otherwise loadURLAsync will drop it on the floor
        page.webviewEl.loadURL(url) // NOTE sync call
      } else {
        page.loadURLAsync(url)
      }
    },

    async reload () {
      // grab the current scroll-y
      page.retainedScrollY = 0
      try {
        page.retainedScrollY = await page.webviewEl.getWebContents().executeJavaScript('window.scrollY')
      } catch (e) {
        console.debug('Error while trying to fetch the page scrollY', e)
      }

      // reload the page
      page.reloadAsync()
    },

    getURLOrigin () {
      return parseURL(this.getURL()).origin
    },

    // helper, abstracts over app:// protocol binding
    getViewedDatOrigin () {
      if (this.getIntendedURL().startsWith('dat:')) {
        return parseURL(this.getIntendedURL()).origin
      }
      // TODO app scheme was removed, do we still need this? -prf
      // const pi = this.protocolInfo
      // if (pi && pi.scheme === 'app:' && pi.binding && pi.binding.url.startsWith('dat://')) {
      //   return parseURL(pi.binding.url).origin
      // }
      return false
    },

    isInstalledApp () {
      // TODO(apps) restore when we bring back apps -prf
      // const si = this.siteInfo
      // if (si && si.installedNames && si.installedNames.length > 0) {
      //   return true
      // }
      return false
    },

    isLiveReloading () {
      return !!page.liveReloadEvents
    },

    // start/stop live reloading
    toggleLiveReloading () {
      if (page.liveReloadEvents) {
        page.liveReloadEvents.close()
        page.liveReloadEvents = false
      } else if (page.protocolInfo && page.protocolInfo.scheme === 'dat:' && page.siteInfo) {
        var archive = new DatArchive(page.siteInfo.key)
        if (page.protocolInfo.version === 'preview') archive = archive.checkout('preview')
        page.liveReloadEvents = archive.watch()
        let event = (page.siteInfo.isOwner) ? 'changed' : 'invalidated'
        page.liveReloadEvents.addEventListener(event, (e) => {
          page.triggerLiveReload()
        })
      }
      toast.create(`Live reloading ${(page.liveReloadEvents) ? 'on' : 'off'}`, 1e3)
      navbar.update(page)
    },

    stopLiveReloading () {
      if (page.liveReloadEvents) {
        page.liveReloadEvents.close()
        page.liveReloadEvents = false
      }
    },

    // reload the page due to changes in the dat
    triggerLiveReload: throttle(() => {
      page.reload()
    }, TRIGGER_LIVE_RELOAD_DEBOUNCE, {leading: false}),
    // ^ note this is run on the front edge.
    // That means snappier reloads (no delay) but possible double reloads if multiple files change

    // helper to load the perms
    fetchSitePerms () {
      beaker.sitedata.getPermissions(this.getURL()).then(perms => {
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
    },

    async toggleDevTools (jsConsole) {
      if (await this.isDevToolsOpenedAsync()) {
        await this.closeDevToolsAsync()
      } else {
        await this.openDevToolsAsync()
        if (jsConsole) {
          page.webviewEl.getWebContents().once('devtools-opened', () => {
            const dtwc = page.webviewEl.getWebContents().devToolsWebContents
            if (dtwc) dtwc.executeJavaScript('DevToolsAPI.showPanel("console")')
          })
        }
      }
    }
  }
  page.siteInfoNavbarBtn = new SiteInfoNavbarBtn(page)
  page.datsiteMenuNavbarBtn = new DatsiteMenuNavbarBtn(page)

  if (opts.isPinned) {
    pages.splice(indexOfLastPinnedTab(), 0, page)
  } else {
    pages.push(page)
  }

  // add *Async alternatives to all methods, *Sync really should never be used
  addAsyncAlternatives(page)

  // add but leave hidden
  hide(page)
  webviewsDiv.appendChild(page.webviewEl)

  // emit
  events.emit('add', page)

  // register events
  page.webviewEl.addEventListener('dom-ready', onDomReady)
  page.webviewEl.addEventListener('new-window', onNewWindow)
  page.webviewEl.addEventListener('will-navigate', onWillNavigate)
  page.webviewEl.addEventListener('did-navigate', onDidNavigate)
  page.webviewEl.addEventListener('did-navigate-in-page', onDidNavigateInPage)
  page.webviewEl.addEventListener('did-start-loading', onDidStartLoading)
  page.webviewEl.addEventListener('did-stop-loading', onDidStopLoading)
  page.webviewEl.addEventListener('load-commit', onLoadCommit)
  page.webviewEl.addEventListener('did-finish-load', onDidFinishLoad)
  page.webviewEl.addEventListener('did-fail-load', onDidFailLoad)
  page.webviewEl.addEventListener('page-favicon-updated', onPageFaviconUpdated)
  page.webviewEl.addEventListener('page-title-updated', onPageTitleUpdated)
  page.webviewEl.addEventListener('update-target-url', onUpdateTargetUrl)
  page.webviewEl.addEventListener('found-in-page', onFoundInPage)
  page.webviewEl.addEventListener('enter-html-full-screen', onEnterHtmlFullScreen)
  page.webviewEl.addEventListener('leave-html-full-screen', onLeaveHtmlFullScreen)
  page.webviewEl.addEventListener('close', onClose)
  page.webviewEl.addEventListener('crashed', onCrashed)
  page.webviewEl.addEventListener('gpu-crashed', onCrashed)
  page.webviewEl.addEventListener('plugin-crashed', onCrashed)
  page.webviewEl.addEventListener('ipc-message', onIPCMessage)

  // rebroadcasts
  page.webviewEl.addEventListener('did-start-loading', rebroadcastEvent)
  page.webviewEl.addEventListener('did-stop-loading', rebroadcastEvent)
  page.webviewEl.addEventListener('page-title-updated', rebroadcastEvent)
  page.webviewEl.addEventListener('page-favicon-updated', rebroadcastEvent)

  // make active if none others are
  if (!activePage) {
    events.emit('first-page', page)
    setActive(page)
  }

  return page
}

export async function remove (page) {
  // find
  var i = pages.indexOf(page)
  if (i == -1) { return console.warn('pages.remove() called for missing page', page) }

  // save, in case the user wants to restore it
  closedURLs.push(page.getURL())

  // set new active if that was
  if (page.isActive) {
    if (pages.length == 1) { return window.close() }
    setActive(pages[i + 1] || pages[i - 1])
  }

  // remove
  page.stopLiveReloading()
  pages.splice(i, 1)
  webviewsDiv.removeChild(page.webviewEl)
  navbar.destroyEl(page.id)
  prompt.destroyContainer(page.id)
  modal.destroyContainer(page.id)

  // persist pins w/o this one, if that was
  if (page.isPinned) { savePinnedToDB() }

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
  leavePageFullScreen()
  statusBar.set(false)
  if (activePage) {
    hide(activePage)
    activePage.isActive = false
  }

  activePage = page
  show(page)
  page.isActive = 1
  page.webviewEl.focus()
  statusBar.setIsLoading(page.isLoading())

  navbar.closeMenus()
  navbar.update()
  prompt.update()
  modal.update()

  events.emit('set-active', page)
  ipcRenderer.send('shell-window:set-current-location', page.getIntendedURL())
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
  events.emit('update', page)

  // persist
  savePinnedToDB()
}

function indexOfLastPinnedTab () {
  var index = 0
  for (index; index < pages.length; index++) {
    if (!pages[index].isPinned) { break }
  }
  return index
}

export function reorderTab (page, offset) {
  // only allow increments of 1
  if (offset > 1 || offset < -1) { return console.warn('reorderTabBy isnt allowed to offset more than -1 or 1; this is a coding error') }

  // first check if reordering can happen
  var srcIndex = pages.indexOf(page)
  var dstIndex = srcIndex + offset
  var swapPage = pages[dstIndex]
  // is there actually a destination?
  if (!swapPage) { return false }
  // can only swap if both are the same pinned state (pinned/unpinned cant mingle)
  if (page.isPinned != swapPage.isPinned) { return false }

  // ok, do the swap
  pages[srcIndex] = swapPage
  pages[dstIndex] = page

  events.emit('update')
  return true
}

export function changeActiveBy (offset) {
  if (pages.length > 1) {
    var i = pages.indexOf(activePage)
    if (i === -1) { return console.warn('Active page is not in the pages list! THIS SHOULD NOT HAPPEN!') }

    i += offset
    if (i < 0) i = pages.length - 1
    if (i >= pages.length) i = 0

    setActive(pages[i])
  }
}

export function changeActiveTo (index) {
  if (index >= 0 && index < pages.length) { setActive(pages[index]) }
}

export function changeActiveToLast () {
  setActive(pages[pages.length - 1])
}

export function getActive () {
  return activePage
}

export function getAdjacentPage (page, offset) {
  if (pages.length > 1) {
    // lookup the index
    var i = pages.indexOf(page)
    if (i === -1) { return null }

    // add offset and return
    return pages[i + offset]
  }
}

export function getByWebview (el) {
  return getById(el.dataset.id)
}

export function getByWebContentsID (wcID) {
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].wcID === wcID) { return pages[i] }
  }
  return null
}

export function getById (id) {
  for (var i = 0; i < pages.length; i++) {
    if (pages[i].id == id) { return pages[i] }
  }
  return null
}

export function loadPinnedFromDB () {
  return beaker.browser.getSetting('pinned_tabs').then(json => {
    try { JSON.parse(json).forEach(url => create({ url, isPinned: true })) } catch (e) {}
  })
}

export function savePinnedToDB () {
  return beaker.browser.setSetting('pinned_tabs', JSON.stringify(getPinned().map(p => p.getURL())))
}

export function leavePageFullScreen () {
  // go through each active page and tell it to leave fullscreen mode (if it's active)
  if (document.body.classList.contains('page-fullscreen')) {
    pages.forEach(p => {
      if (p.isWebviewReady) {
        p.webviewEl.getWebContents().send('exit-full-screen-hackfix')
      }
    })
  }
}

// event handlers
// =

function onDomReady (e) {
  var page = getByWebview(e.target)
  if (page) {
    page.isWebviewReady = true
    if (!page.wcID) {
      page.wcID = e.target.getWebContents().id // NOTE: this is a sync op
    }
    if (!navbar.isLocationFocused(page) && page.isActive) {
      page.webviewEl.shadowRoot.querySelector('iframe').focus()
    }
  }
}

function onNewWindow (e) {
  var page = getByWebview(e.target)
  if (page && page.isActive) { // only open if coming from the active tab
    var newPage = create(e.url)
    if (e.disposition === 'foreground-tab' || e.disposition === 'new-window') {
      setActive(newPage)
    }
  }
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

function onDidNavigate (e) {
  var page = getByWebview(e.target)
  if (page) {
    // we're goin
    page.isReceivingAssets = true
    // set URL in navbar
    page.loadingURL = e.url
    page.siteInfoOverride = null
    navbar.updateLocation(page)
    // if it's a failed dat discovery...
    if (e.httpResponseCode === 504 && e.url.startsWith('dat://')) {
      page.siteWasADatTimeout = true
    }

    // close any prompts and modals
    prompt.forceRemoveAll(page)
    modal.forceRemoveAll(page)
  }
}

// did-navigate-in-page is triggered by hash/virtual-url changes
// we need to update the url bar but no load event occurs
function onDidNavigateInPage (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame) {
    return
  }

  var page = getByWebview(e.target)
  if (page) {
    // update ui
    page.url = e.url
    navbar.updateLocation(page)

    // update history
    updateHistory(page)
  }
}

function onLoadCommit (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame) {
    return
  }

  var page = getByWebview(e.target)
  if (page) {
    // clear out the page's error
    page.siteLoadError = null
    // turn off live reloading if we're leaving the domain
    if (isDifferentDomain(e.url, page.url)) {
      page.stopLiveReloading()
    }
    // check if this page bookmarked
    beaker.bookmarks.getBookmark(e.url).then(bookmark => {
      page.bookmark = bookmark
      navbar.update(page)
    })
    zoom.setZoomFromSitedata(page, parseURL(page.getIntendedURL()).origin)
    // stop autocompleting
    navbar.clearAutocomplete()
    // set title in tabs
    page.title = e.target.getTitle() // NOTE sync operation
    navbar.update(page)
  }
}

function onDidStartLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    // update state
    page.manuallyTrackedIsLoading = true
    page.siteWasADatTimeout = false
    navbar.update(page)
    navbar.hideInpageFind(page)
    if (page.isActive) {
      statusBar.setIsLoading(true)
    }

    // decorate the webview based on whether it's a builtin page
    const url = page.loadingURL || page.url
    if (url.startsWith('beaker://')) {
      page.webviewEl.classList.add('builtin')
    } else {
      page.webviewEl.classList.remove('builtin')
    }
  }
}

function onDidStopLoading (e) {
  var page = getByWebview(e.target)
  if (page) {
    // update url
    if (page.loadingURL) {
      page.url = page.loadingURL
    }
    var url = page.url

    // update history and UI
    updateHistory(page)

    // fetch protocol and page info
    var { protocol, hostname, pathname, version } = url.startsWith('dat://') ? parseDatURL(url) : parseURL(url)
    page.siteInfo = null
    page.sitePerms = null
    page.siteHasDatAlternative = false
    page.protocolInfo = {url, hostname, pathname, scheme: protocol, label: protocol.slice(0, -1).toUpperCase(), version}
    if (protocol === 'https:') {
      page.checkForDatAlternative(hostname)
    }
    if (protocol === 'dat:') {
      DatArchive.resolveName(hostname)
        .catch(err => hostname) // try the hostname as-is, might be a hash
        .then(key => (new DatArchive(key)).getInfo())
        .then(info => {
          page.siteInfo = info
          navbar.update(page)
          console.log('dat site info', info)

          // fallback the tab title to the site title, if needed
          if (isEqualURL(page.getTitle(), page.getURL()) && info.title) {
            page.title = info.title
            events.emit('page-title-updated', page)
          }
        })
    }
    if (protocol !== 'beaker:') {
      page.fetchSitePerms()
    }

    // update page
    page.loadingURL = false
    page.manuallyTrackedIsLoading = false
    if (page.isActive) {
      navbar.updateLocation(page)
      navbar.update(page)
      statusBar.setIsLoading(false)
    }

    // determine content type
    let contentType = beaker.browser.getResourceContentType(page.getURL())

    // markdown rendering
    // inject the renderer script if the page is markdown
    if (contentType && (contentType.startsWith('text/markdown') || contentType.startsWith('text/x-markdown'))) {
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
        .anchor-link { color: #aaa; margin-left: 5px; text-decoration: none; visibility: hidden; }
        h1:hover .anchor-link, h2:hover .anchor-link, h3:hover .anchor-link, h4:hover .anchor-link, h5:hover .anchor-link { visibility: visible; }
        table { border-collapse: collapse; }
        td, th { padding: 0.5em 1em; }
        tbody tr:nth-child(odd) { background: #fafafa; }
        tbody td { border-top: 1px solid #bbb; }
        .switcher { position: absolute; top: 5px; right: 5px; font-family: Consolas, 'Lucida Console', Monaco, monospace; cursor: pointer; font-size: 13px; background: #fafafa; padding: 2px 5px; }
        main code { font-size: 1.3em; background: #fafafa; }
        main pre { background: #fafafa; padding: 1em }
      `)
      page.webviewEl.insertCSS(`
        .markdown { font-size: 14px; width: 100%; max-width: 750px; line-height: 22.5px; }
        .markdown a { color: #2864dc; text-decoration: none; }
        .markdown a:hover { text-decoration: underline; }
        .markdown a.anchor-link { color: #ddd; }
        .markdown h1, .markdown h2, .markdown  h3 { margin: 15px 0; font-weight: 600; }
        .markdown h1, .markdown h2 { border-bottom: 1px solid #eee; line-height: 45px; }
        .markdown h1 { font-size: 30px; }
        .markdown h2 { font-size: 24px; }
        .markdown h3 { font-size: 20px; }
        .markdown ul, .markdown ol { margin-bottom: 15px; }
        .markdown pre, .markdown code { font-family: Consolas, 'Lucida Console', Monaco, monospace; font-size: 13.5px; background: #f0f0f0; border-radius: 2px; }
        .markdown pre { padding: 15px; border: 0; overflow-x: auto; }
        .markdown code { padding: 3px 5px; }
        .markdown pre > code { display: block; }
      `)
      if (!cachedMarkdownRendererScript) {
        cachedMarkdownRendererScript = fs.readFileSync(path.join(APP_PATH, 'markdown-renderer.build.js'), 'utf8')
      }

      page.webviewEl.executeJavaScript(cachedMarkdownRendererScript)
    }

    // json rendering
    // inject the json render script
    if (contentType && (contentType.startsWith('application/json') || contentType.startsWith('application/javascript'))) {
      page.webviewEl.insertCSS(`
        .hidden { display: none !important; }
        .json-formatter-row {
          font-family: Consolas, 'Lucida Console', Monaco, monospace !important;
          line-height: 1.6 !important;
          font-size: 13px;
        }
        .json-formatter-row > a > .json-formatter-preview-text {
          transition: none !important;
        }
        nav { margin-bottom: 5px; user-select: none; }
        nav > span {
          cursor: pointer;
          display: inline-block;
          font-family: Consolas, "Lucida Console", Monaco, monospace;
          cursor: pointer;
          font-size: 13px;
          background: rgb(250, 250, 250);
          padding: 3px 5px;
          margin-right: 5px;
        }
        nav > span.pressed {
          box-shadow: inset 2px 2px 2px rgba(0,0,0,.05);
          background: #ddd;
        }
      `)

      if (!cachedJSONRendererScript) {
        cachedJSONRendererScript = fs.readFileSync(path.join(APP_PATH, 'json-renderer.build.js'), 'utf8')
      }

      page.webviewEl.executeJavaScript(cachedJSONRendererScript)
    }

    // HACK
    // inject some corrections to the user-agent styles
    // real solution is to update electron so we can change the user-agent styles
    // -prf
    page.webviewEl.insertCSS(
      // set the default background to white.
      // on some devices, if no bg is set, the buffer doesnt get cleared
      `html {
        background: rgba(0,0,0,0);
      }` +

      // style file listings
      `pre{font-family: Consolas, 'Lucida Console', Monaco, monospace; font-size: 13px;}` +

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

    // if there is a retained scroll position, move the page
    if (page.retainedScrollY) {
      page.webviewEl.executeJavaScript(`
        window.scroll(0, ${page.retainedScrollY})
      `)
      page.retainedScrollY = 0
    }
  }
}

function onDidFinishLoad (e) {
  var page = getByWebview(e.target)
  if (page) {
    // update page object
    if (page.loadingURL) {
      page.url = page.loadingURL
    }
    page.loadingURL = false
    page.isGuessingTheURLScheme = false
    page.favicons = null
    navbar.update(page)
    navbar.updateLocation(page)
    events.emit('update')
  }
}

function onDidFailLoad (e) {
  // ignore if this is a subresource
  if (!e.isMainFrame) { return }

  // ignore aborts. why:
  // - sometimes, aborts are caused by redirects. no biggy
  // - if the user cancels, then we dont want to give an error screen
  if (e.errorDescription == 'ERR_ABORTED' || e.errorCode == ERR_ABORTED) { return }

  // also ignore non-errors
  if (e.errorCode == 0) { return }

  var page = getByWebview(e.target)
  if (page) {
    var isInsecureResponse = [ERR_INSECURE_RESPONSE, ERR_CONNECTION_REFUSED].indexOf(e.errorCode) >= 0
    page.siteLoadError = {isInsecureResponse, errorCode: e.errorCode, errorDescription: e.errorDescription}
    page.title = page.getIntendedURL()
    navbar.update(page)

    // if https fails for some specific reasons, and beaker *assumed* https, then fallback to http
    if (page.isGuessingTheURLScheme && isInsecureResponse) {
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
    page.webviewEl.executeJavaScript('document.documentElement.innerHTML = \'' + errorPageHTML + '\'')
  }
}

async function onPageFaviconUpdated (e) {
  if (e.favicons && e.favicons[0]) {
    var page = getByWebview(e.target)
    page.favicons = e.favicons
    events.emit('page-favicon-updated', getByWebview(e.target))

    // store favicon to db
    var res = await urlsToData(e.favicons)
    if (res) {
      beaker.sitedata.set(page.getURL(), 'favicon', res.dataUrl)
    }
  }
}

function onUpdateTargetUrl ({ url }) {
  statusBar.set(url)
}

function onFoundInPage (e) {
  var page = getByWebview(e.target)
  page.inpageFindInfo = e.result
  navbar.update(page)
}

function onEnterHtmlFullScreen (e) {
  document.body.classList.add('page-fullscreen')
  toast.create('Press ESC to exit fullscreen', 10e3) // show for 10 seconds
}

function onLeaveHtmlFullScreen (e) {
  document.body.classList.remove('page-fullscreen')
}

function onClose (e) {
  var page = getByWebview(e.target)
  if (page) {
    remove(page)
  }
}

function onPageTitleUpdated (e) {
  var page = getByWebview(e.target)
  page.title = e.title

  // if page title changed within 15 seconds, update it again
  if (page.getIntendedURL() === page.lastVisitedURL && Date.now() - page.lastVisitedAt < 15 * 1000) {
    updateHistory(page)
  }
}

function onCrashed (e) {
  console.error('Webview crash', e)
}

export function onIPCMessage (e) {
  var page = getByWebview(e.target)
  switch (e.channel) {
    case 'site-info-override:set':
      if (page) {
        page.siteInfoOverride = e.args[0]
        navbar.updateLocation(page)
        navbar.update(page)
      }
      break
    case 'site-info-override:clear':
      if (page) {
        page.siteInfoOverride = null
        navbar.updateLocation(page)
        navbar.update(page)
      }
      break
    case 'open-url':
      var {url, newTab} = e.args[0]
      if (newTab) {
        create(url)
      } else {
        getActive().loadURL(url)
      }
      navbar.closeMenus()
      break
    case 'close-menus':
      navbar.closeMenus()
      break
    case 'toggle-live-reloading':
      if (activePage) {
        activePage.toggleLiveReloading()
      }
      break
  }
}

// internal helper functions
// =

function show (page) {
  page.webviewEl.classList.remove('hidden')
  page.navbarEl.classList.remove('hidden')
  page.promptEl.classList.remove('hidden')
  page.modalEl.classList.remove('hidden')
  events.emit('show', page)
}

function hide (page) {
  page.webviewEl.classList.add('hidden')
  page.navbarEl.classList.add('hidden')
  page.promptEl.classList.add('hidden')
  page.modalEl.classList.add('hidden')
  events.emit('hide', page)
}

export function createWebviewEl (id, url) {
  var el = document.createElement('webview')
  el.dataset.id = id
  el.setAttribute('preload', 'file://' + path.join(APP_PATH, 'webview-preload.build.js'))
  el.setAttribute('webpreferences', 'allowDisplayingInsecureContent,defaultEncoding=utf-8,scrollBounce,nativeWindowOpen=yes')
  // TODO re-enable nativeWindowOpen when https://github.com/electron/electron/issues/9558 lands
  el.setAttribute('src', url || DEFAULT_URL)
  return el
}

function rebroadcastEvent (e) {
  events.emit(e.type, getByWebview(e.target), e)
}

function parseURL (str) {
  try { return new URL(str) } catch (e) { return {} }
}

function isEqualURL (a, b) {
  return parseURL(a).origin === parseURL(b).origin
}

function isDifferentDomain (a, b) {
  return parseURL(a).origin !== parseURL(b).origin
}

async function updateHistory (page) {
  var url = page.getURL()

  if (!url.startsWith('beaker://') || url.match(/beaker:\/\/library\/[0-9,a-f]{64}/g)) {
    beaker.history.addVisit({url: page.getIntendedURL(), title: page.getTitle() || page.getURL()})
    if (page.isPinned) {
      savePinnedToDB()
    }
    page.lastVisitedAt = Date.now()
    page.lastVisitedURL = url
  }

  // read and cache current nav state
  var [b, f] = await Promise.all([page.canGoBackAsync(), page.canGoForwardAsync()])
  page._canGoBack = b
  page._canGoForward = f
  navbar.update(page)
}
