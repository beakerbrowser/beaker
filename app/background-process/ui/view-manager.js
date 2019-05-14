import { app, dialog, BrowserView, BrowserWindow, Menu, clipboard, ipcMain } from 'electron'
import * as beakerCore from '@beaker/core'
import errorPage from '@beaker/core/lib/error-page'
import path from 'path'
import { promises as fs } from 'fs'
import Events from 'events'
import _throttle from 'lodash.throttle'
import parseDatURL from 'parse-dat-url'
import emitStream from 'emit-stream'
import _get from 'lodash.get'
import _pick from 'lodash.pick'
import * as rpc from 'pauls-electron-rpc'
import normalizeURL from 'normalize-url'
import viewsRPCManifest from '../rpc-manifests/views'
import * as zoom from './views/zoom'
import * as shellMenus from './subwindows/shell-menus'
import * as locationBar from './subwindows/location-bar'
import * as statusBar from './subwindows/status-bar'
import * as permPrompt from './subwindows/perm-prompt'
import * as modals from './subwindows/modals'
import * as windowMenu from './window-menu'
import { getResourceContentType } from '../browser'
import { examineLocationInput } from '../../lib/urls'
const settingsDb = beakerCore.dbs.settings
const historyDb = beakerCore.dbs.history
const bookmarksDb = beakerCore.dbs.bookmarks

const ERR_ABORTED = -3
const ERR_CONNECTION_REFUSED = -102
const ERR_INSECURE_RESPONSE = -501
const TLS_ERROR_CODES = Object.values({
  ERR_NO_SSL_VERSIONS_ENABLED: -112,
  ERR_SSL_VERSION_OR_CIPHER_MISMATCH: -113,
  ERR_SSL_RENEGOTIATION_REQUESTED: -114,
  ERR_PROXY_AUTH_UNSUPPORTED: -115,
  ERR_CERT_ERROR_IN_SSL_RENEGOTIATION: -116,
  ERR_BAD_SSL_CLIENT_AUTH_CERT: -117,
  ERR_SSL_NO_RENEGOTIATION: -123,
  ERR_SSL_WEAK_SERVER_EPHEMERAL_DH_KEY: -129,
  ERR_PROXY_CERTIFICATE_INVALID: -136,
  ERR_SSL_HANDSHAKE_NOT_COMPLETED: -148,
  ERR_SSL_BAD_PEER_PUBLIC_KEY: -149,
  ERR_SSL_PINNED_KEY_NOT_IN_CERT_CHAIN: -150,
  ERR_CLIENT_AUTH_CERT_TYPE_UNSUPPORTED: -151,
  ERR_SSL_DECRYPT_ERROR_ALERT: -153,
  ERR_SSL_SERVER_CERT_CHANGED: -156,
  ERR_SSL_UNRECOGNIZED_NAME_ALERT: -159,
  ERR_SSL_SERVER_CERT_BAD_FORMAT: -167,
  ERR_CT_STH_PARSING_FAILED: -168,
  ERR_CT_STH_INCOMPLETE: -169,
  ERR_CT_CONSISTENCY_PROOF_PARSING_FAILED: -171,
  ERR_SSL_OBSOLETE_CIPHER: -172,
  ERR_SSL_VERSION_INTERFERENCE: -175,
  ERR_EARLY_DATA_REJECTED: -178,
  ERR_WRONG_VERSION_ON_EARLY_DATA: -179,
  ERR_TLS13_DOWNGRADE_DETECTED: -180
})
const IS_CODE_INSECURE_RESPONSE = x => x === ERR_CONNECTION_REFUSED || x === ERR_INSECURE_RESPONSE || (x <= -200 && x > -300) || TLS_ERROR_CODES.includes(x)

const Y_POSITION = 78
const DEFAULT_URL = 'beaker://start'
const TRIGGER_LIVE_RELOAD_DEBOUNCE = 500 // throttle live-reload triggers by this amount

// the variables which are automatically sent to the shell-window for rendering
const STATE_VARS = [
  'url',
  'title',
  'peers',
  'favicons',
  'zoom',
  'loadError',
  'isActive',
  'isPinned',
  'isBookmarked',
  'isLoading',
  'isReceivingAssets',
  'canGoBack',
  'canGoForward',
  'isAudioMuted',
  'isCurrentlyAudible',
  'isInpageFindActive',
  'currentInpageFindString',
  'currentInpageFindResults',
  'availableAlternative',
  'donateLinkHref',
  'isLiveReloading',
  'previewMode',
  'uncommittedChanges'
]

// globals
// =

var activeViews = {} // map of {[win.id]: Array<View>}
var preloadedNewTabViews = {} // map of {[win.id]: View}
var closedURLs = {} // map of {[win.id]: Array<string>}
var windowEvents = {} // mapof {[win.id]: Events}
var noRedirectHostnames = new Set() // set of hostnames which have dat-redirection disabled
var nextViewIsScriptCloseable = false // will the next view created be "script closable"?

// classes
// =

class View {
  constructor (win, opts = {isPinned: false, isHidden: false}) {
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
        scrollBounce: true,
        navigateOnDragDrop: true
      }
    })
    this.browserView.setBackgroundColor('#fff')

    // webview state
    this.loadingURL = null // URL being loaded, if any
    this.isLoading = false // is the tab loading?
    this.isReceivingAssets = false // has the webview started receiving assets in the current load-cycle?
    this.favicons = null // array of favicon URLs
    this.zoom = 0 // what's the current zoom level?
    this.loadError = null // page error state, if any

    // browser state
    this.isHidden = opts.isHidden // is this tab hidden from the user? used for the preloaded tab
    this.isActive = false // is this the active page in the window?
    this.isPinned = Boolean(opts.isPinned) // is this page pinned?
    this.liveReloadEvents = null // live-reload event stream
    this.isInpageFindActive = false // is the inpage-finder UI active?
    this.currentInpageFindString = undefined // what's the current inpage-finder query string?
    this.currentInpageFindResults = undefined // what's the current inpage-finder query results?
    this.isScriptClosable = takeIsScriptClosable() // can this view be closed by `window.close` ?

    // helper state
    this.peers = 0 // how many peers does the site have?
    this.isBookmarked = false // is the active page bookmarked?
    this.datInfo = null // metadata about the site if viewing a dat
    this.donateLinkHref = null // the URL of the donate site, if set by the dat.json
    this.availableAlternative = '' // tracks if there's alternative protocol available for the site
    this.wasDatTimeout = false // did the last navigation result in a timed-out dat?
    this.uncommittedChanges = false // does the preview have uncommitted changes?

    // wire up events
    this.webContents.on('did-start-loading', this.onDidStartLoading.bind(this))
    this.webContents.on('did-start-navigation', this.onDidStartNavigation.bind(this))
    this.webContents.on('did-navigate', this.onDidNavigate.bind(this))
    this.webContents.on('did-navigate-in-page', this.onDidNavigateInPage.bind(this))
    this.webContents.on('did-stop-loading', this.onDidStopLoading.bind(this))
    this.webContents.on('did-fail-load', this.onDidFailLoad.bind(this))
    this.webContents.on('update-target-url', this.onUpdateTargetUrl.bind(this))
    this.webContents.on('page-title-updated', this.onPageTitleUpdated.bind(this)) // NOTE page-title-updated isn't documented on webContents but it is supported
    this.webContents.on('page-favicon-updated', this.onPageFaviconUpdated.bind(this))
    this.webContents.on('new-window', this.onNewWindow.bind(this))
    this.webContents.on('media-started-playing', this.onMediaChange.bind(this))
    this.webContents.on('media-paused', this.onMediaChange.bind(this))
    this.webContents.on('found-in-page', this.onFoundInPage.bind(this))

    // security - deny these events
    const deny = e => e.preventDefault()
    this.webContents.on('remote-require', deny)
    this.webContents.on('remote-get-global', deny)
    this.webContents.on('remote-get-builtin', deny)
    this.webContents.on('remote-get-current-window', deny)
    this.webContents.on('remote-get-current-web-contents', deny)
    this.webContents.on('remote-get-guest-web-contents', deny)
  }

  get webContents () {
    return this.browserView.webContents
  }

  get url () {
    return this.webContents.getURL()
  }

  get origin () {
    return toOrigin(this.url)
  }

  get title () {
    var title = this.webContents.getTitle()
    if (this.datInfo && this.datInfo.title && (!title || title.startsWith(this.origin))) {
      // fallback to the dat.json title field if the page doesnt provide a title
      title = this.datInfo.title
    }
    return title
  }

  get canGoBack () {
    return this.webContents.canGoBack()
  }

  get canGoForward () {
    return this.webContents.canGoForward()
  }

  get isAudioMuted () {
    return this.webContents.isAudioMuted()
  }

  get isCurrentlyAudible () {
    return this.webContents.isCurrentlyAudible()
  }

  get isLiveReloading () {
    return !!this.liveReloadEvents
  }

  get previewMode () {
    return this.datInfo ? this.datInfo.userSettings.previewMode : false
  }

  get state () {
    var state = _pick(this, STATE_VARS)
    if (this.loadingURL) state.url = this.loadingURL
    return state
  }

  // management
  // =

  loadURL (url) {
    this.browserView.webContents.loadURL(url)
  }

  resize () {
    const win = this.browserWindow
    var {width, height} = win.getContentBounds()
    this.browserView.setBounds({x: 0, y: Y_POSITION, width, height: height - Y_POSITION})
    this.browserView.setAutoResize({width: true, height: true})
  }

  activate () {
    this.isActive = true

    const win = this.browserWindow
    win.setBrowserView(this.browserView)
    permPrompt.show(this.browserView)
    modals.show(this.browserView)

    this.resize()
    this.webContents.focus()
  }

  deactivate (dontNullTheView = false) {
    if (!dontNullTheView && this.isActive) {
      this.browserWindow.setBrowserView(null)
    }

    if (this.isActive) {
      shellMenus.hide(this.browserWindow) // this will close the location menu if it's open
    }
    permPrompt.hide(this.browserView)
    modals.hide(this.browserView)
    this.isActive = false
  }

  destroy () {
    this.deactivate()
    permPrompt.close(this.browserView)
    modals.close(this.browserView)
    this.browserView.destroy()
  }

  async updateHistory () {
    var url = this.url
    var title = this.title

    if (!/^(http|https|dat)/i.test(url)) {
      historyDb.addVisit(0, {url, title})
      if (this.isPinned) {
        savePins(this.browserWindow)
      }
    }
  }

  toggleMuted () {
    this.webContents.setAudioMuted(!this.isAudioMuted)
    this.emitUpdateState()
  }

  // inpage finder
  // =

  showInpageFind () {
    if (this.isInpageFindActive) {
      // go to next result on repeat "show" commands
      this.moveInpageFind(1)
    } else {
      this.isInpageFindActive = true
      this.currentInpageFindResults = {activeMatchOrdinal: 0, matches: 0}
      this.emitUpdateState()
    }
    this.browserWindow.webContents.focus()
  }

  hideInpageFind () {
    this.webContents.stopFindInPage('clearSelection')
    this.isInpageFindActive = false
    this.currentInpageFindString = undefined
    this.currentInpageFindResults = undefined
    this.emitUpdateState()
  }

  setInpageFindString (str, dir) {
    this.currentInpageFindString = str
    this.webContents.findInPage(this.currentInpageFindString, {findNext: false, forward: dir !== -1})
  }

  moveInpageFind (dir) {
    this.webContents.findInPage(this.currentInpageFindString, {findNext: false, forward: dir !== -1})
  }

  // alternative protocols
  // =

  async checkForDatAlternative (url) {
    let u = (new URL(url))
    // try to do a name lookup
    var siteHasDatAlternative = await beakerCore.dat.dns.resolveName(u.hostname).then(
      res => Boolean(res),
      err => false
    )
    if (siteHasDatAlternative) {
      var autoRedirectToDat = !!await beakerCore.dbs.settings.get('auto_redirect_to_dat')
      if (autoRedirectToDat && !noRedirectHostnames.has(u.hostname)) {
        // automatically redirect
        let datUrl = url.replace(u.protocol, 'dat:')
        this.loadURL(datUrl)
      } else {
        // track that dat is available
        this.availableAlternative = 'dat:'
      }
    } else {
      this.availableAlternative = ''
    }
    this.emitUpdateState()
  }

  // live reloading
  // =

  toggleLiveReloading () {
    if (this.liveReloadEvents) {
      this.liveReloadEvents.close()
      this.liveReloadEvents = false
    } else if (this.datInfo) {
      let archive = beakerCore.dat.library.getArchive(this.datInfo.key)
      if (!archive) return

      let {version} = parseDatURL(this.url)
      let {checkoutFS} = beakerCore.dat.library.getArchiveCheckout(archive, version)
      this.liveReloadEvents = checkoutFS.pda.watch()

      let event = (this.datInfo.isOwner) ? 'changed' : 'invalidated'
      const reload = _throttle(() => {
        this.browserView.webContents.reload()
      }, TRIGGER_LIVE_RELOAD_DEBOUNCE, {leading: false})
      this.liveReloadEvents.on('data', ([evt]) => {
        if (evt === event) reload()
      })
      // ^ note this throttle is run on the front edge.
      // That means snappier reloads (no delay) but possible double reloads if multiple files change
    }
    this.emitUpdateState()
  }

  stopLiveReloading () {
    if (this.liveReloadEvents) {
      this.liveReloadEvents.close()
      this.liveReloadEvents = false
      this.emitUpdateState()
    }
  }

  // custom renderers
  // =

  async injectCustomRenderers () {
    // determine content type
    let contentType = getResourceContentType(this.url) || ''
    let isMD = contentType.startsWith('text/markdown') || contentType.startsWith('text/x-markdown')
    let isJSON = contentType.startsWith('application/json')
    let isPlainText = contentType.startsWith('text/plain')

    // markdown rendering
    // inject the renderer script if the page is markdown
    if (isMD || (isPlainText && this.url.endsWith('.md'))) {
      // hide the unformatted text and provide some basic styles
      this.webContents.insertCSS(`
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
      this.webContents.insertCSS(`
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
      let mdpath = path.join(app.getAppPath(), 'markdown-renderer.build.js')
      mdpath = mdpath.replace('app.asar', 'app.asar.unpacked') // fetch from unpacked dir
      this.webContents.executeJavaScript(await fs.readFile(mdpath, 'utf8'))
    }

    // json rendering
    // inject the json render script
    if (isJSON || (isPlainText && this.url.endsWith('.json'))) {
      this.webContents.insertCSS(`
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
      let jsonpath = path.join(app.getAppPath(), 'json-renderer.build.js')
      jsonpath = jsonpath.replace('app.asar', 'app.asar.unpacked') // fetch from unpacked dir
      this.webContents.executeJavaScript(await fs.readFile(jsonpath, 'utf8'))
    }
  }

  // state fetching
  // =

  // helper called by UIs to pull latest state if a change event has occurred
  // eg called by the bookmark systems after the bookmark state has changed
  async refreshState () {
    await Promise.all([
      this.fetchIsBookmarked(true),
      this.fetchDatInfo(true)
    ])
    this.emitUpdateState()
  }

  async fetchIsBookmarked (noEmit = false) {
    var bookmark = await bookmarksDb.getBookmark(0, normalizeURL(this.url, {
      stripFragment: false,
      stripWWW: false,
      removeQueryParameters: false,
      removeTrailingSlash: true
    }))
    this.isBookmarked = !!bookmark
    if (!noEmit) {
      this.emitUpdateState()
    }
  }

  async fetchDatInfo (noEmit = false) {
    // clear existing state
    this.datInfo = null
    this.peers = 0
    this.donateLinkHref = null
    this.uncommittedChanges = false

    if (!this.url.startsWith('dat://')) {
      return
    }

    // fetch new state
    var key = await beakerCore.dat.dns.resolveName(this.url)
    this.datInfo = await beakerCore.dat.library.getArchiveInfo(key)
    this.peers = this.datInfo.peers
    this.donateLinkHref = _get(this, 'datInfo.links.payment.0.href')
    if (this.previewMode) {
      let archive = beakerCore.dat.library.getArchive(key)
      let diff = await beakerCore.dat.library.getDaemon().fs_diffListing(archive, {compareContent: true, shallow: true})
      this.uncommittedChanges = diff ? diff.length : 0
    }
    if (!noEmit) {
      this.emitUpdateState()
    }
  }

  async getPageMetadata () {
    var metadata
    try {
      metadata = this.webContents.executeJavaScript(`window.__beakerGetPageMetadata()`)
    } catch (e) {
      // ignore
    }
    return metadata || {}
  }

  // events
  // =

  emitUpdateState () {
    if (this.isHidden) return
    emitUpdateState(this.browserWindow, this)
  }

  onDidStartLoading (e) {
    // update state
    this.isLoading = true
    this.loadingURL = null
    this.favicons = null
    this.isReceivingAssets = false
    this.wasDatTimeout = false

    // emit
    this.emitUpdateState()
  }

  onDidStartNavigation (e, url, isInPlace, isMainFrame) {
    if (!isMainFrame) return

    // turn off live reloading if we're leaving the domain
    if (toOrigin(url) !== toOrigin(this.url)) {
      this.stopLiveReloading()
    }

    // update state
    this.loadingURL = url
    this.emitUpdateState()
  }

  onDidNavigate (e, url, httpResponseCode) {
    // read zoom
    zoom.setZoomFromSitedata(this)

    // update state
    this.loadError = null
    this.loadingURL = null
    this.isReceivingAssets = true
    this.fetchIsBookmarked()
    this.fetchDatInfo()
    if (httpResponseCode === 504 && url.startsWith('dat://')) {
      this.wasDatTimeout = true
    }

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
    this.loadingURL = null
    this.isReceivingAssets = false

    // check for dat alternatives
    if (this.url.startsWith('https://')) {
      this.checkForDatAlternative(this.url)
    } else {
      this.availableAlternative = ''
    }

    // run custom renderer apps
    this.injectCustomRenderers()

    // emit
    windowMenu.onSetCurrentLocation(this.browserWindow, this.url)
    this.emitUpdateState()
  }

  onDidFailLoad (e, errorCode, errorDescription, validatedURL, isMainFrame) {
    // ignore if this is a subresource
    if (!isMainFrame) return

    // ignore aborts. why:
    // - sometimes, aborts are caused by redirects. no biggy
    // - if the user cancels, then we dont want to give an error screen
    if (errorDescription == 'ERR_ABORTED' || errorCode == ERR_ABORTED) return

    // also ignore non-errors
    if (errorCode == 0) return

    // update state
    var isInsecureResponse = IS_CODE_INSECURE_RESPONSE(errorCode)
    this.loadError = {isInsecureResponse, errorCode, errorDescription, validatedURL}
    this.emitUpdateState()

    // render failure page
    var errorPageHTML = errorPage(this.loadError)
    this.webContents.executeJavaScript('document.documentElement.innerHTML = \'' + errorPageHTML + '\'')
  }

  onUpdateTargetUrl (e, url) {
    statusBar.set(this.browserWindow, url)
  }

  onPageTitleUpdated (e, title) {
    this.emitUpdateState()
  }

  onPageFaviconUpdated (e, favicons) {
    this.favicons = favicons && favicons[0] ? favicons : null
    this.emitUpdateState()
  }

  onNewWindow (e, url, frameName, disposition) {
    e.preventDefault()
    if (!this.isActive) return // only open if coming from the active tab
    var setActive = (disposition === 'foreground-tab' || disposition === 'new-window')
    create(this.browserWindow, url, {setActive})
  }

  onMediaChange (e) {
    // our goal with this event handler is to detect that audio is playing
    // this lets us then render an "audio playing" icon on the tab
    // for whatever reason, the event consistently precedes the "is audible" being set by at most 1s
    // so, we delay for 1s, then emit a state update
    setTimeout(() => this.emitUpdateState(), 1e3)
  }

  onFoundInPage (e, res) {
    this.currentInpageFindResults = {
      activeMatchOrdinal: res.activeMatchOrdinal,
      matches: res.matches
    }
    this.emitUpdateState()
  }
}

// exported api
// =

export function setup () {
  // listen for webContents messages
  ipcMain.on('BEAKER_MARK_NEXT_VIEW_SCRIPTCLOSEABLE', e => {
    nextViewIsScriptCloseable = true
    e.returnValue = true
  })
  ipcMain.on('BEAKER_SCRIPTCLOSE_SELF', e => {
    var browserView = BrowserView.fromWebContents(e.sender)
    if (browserView) {
      var view = findView(browserView)
      if (view && view.isScriptClosable) {
        remove(view.browserWindow, view)
        e.returnValue = true
        return
      }
    }
    e.returnValue = false
  })

  // track peer-counts
  beakerCore.dat.library.createEventStream().on('data', ([evt, {details}]) => {
    if (evt !== 'network-changed') return
    for (let winId in activeViews) {
      for (let view of activeViews[winId]) {
        if (view.datInfo && view.datInfo.url === details.url) {
          // update peer count
          view.peers = details.connections
          view.emitUpdateState()
        }
        if (view.wasDatTimeout && view.url.startsWith(details.url)) {
          // refresh if this was a timed-out dat site (peers have been found)
          view.webContents.reload()
        }
      }
    }
  })
}

export function getAll (win) {
  win = getTopWindow(win)
  return activeViews[win.id] || []
}

export function getByIndex (win, index) {
  win = getTopWindow(win)
  if (index === 'active') return getActive(win)
  return getAll(win)[index]
}

export function getIndexOfView (win, view) {
  win = getTopWindow(win)
  return getAll(win).indexOf(view)
}

export function getAllPinned (win) {
  win = getTopWindow(win)
  return getAll(win).filter(p => p.isPinned)
}

export function getActive (win) {
  win = getTopWindow(win)
  return getAll(win).find(view => view.isActive)
}

export function findView (browserView) {
  for (let winId in activeViews) {
    for (let v of activeViews[winId]) {
      if (v.browserView === browserView) {
        return v
      }
    }
  }
}

export function findContainingWindow (browserView) {
  for (let winId in activeViews) {
    for (let v of activeViews[winId]) {
      if (v.browserView === browserView) {
        return v.browserWindow
      }
    }
  }
  for (let winId in preloadedNewTabViews) {
    if (preloadedNewTabViews[winId].browserView === browserView) {
      return preloadedNewTabViews[winId].browserWindow
    }
  }
}

export function create (win, url, opts = {setActive: false, isPinned: false, focusLocationBar: false}) {
  url = url || DEFAULT_URL
  win = getTopWindow(win)
  var views = activeViews[win.id] = activeViews[win.id] || []

  var view
  var preloadedNewTabView = preloadedNewTabViews[win.id]
  if (url === DEFAULT_URL && !opts.isPinned && preloadedNewTabView) {
    // use the preloaded new-tab view
    view = preloadedNewTabView
    view.isHidden = false // no longer hidden
    preloadedNewTabView = preloadedNewTabViews[win.id] = null
  } else {
    // create a new view
    view = new View(win, {isPinned: opts.isPinned})
    view.loadURL(url)
  }

  // add to active views
  if (opts.isPinned) {
    views.splice(indexOfLastPinnedView(win), 0, view)
  } else {
    views.push(view)
  }

  // make active if requested, or if none others are
  if (opts.setActive || !getActive(win)) {
    setActive(win, view)
  }
  emitReplaceState(win)

  if (opts.focusLocationBar) {
    win.webContents.send('command', 'focus-location')
  }

  // create a new preloaded view if needed
  if (!preloadedNewTabView) {
    preloadedNewTabViews[win.id] = preloadedNewTabView = new View(win, {isHidden: true})
    preloadedNewTabView.loadURL(DEFAULT_URL)
  }

  return view
}

export async function remove (win, view) {
  win = getTopWindow(win)
  // find
  var views = getAll(win)
  var i = views.indexOf(view)
  if (i == -1) {
    return console.warn('view-manager remove() called for missing view', view)
  }

  // give the 'onbeforeunload' a chance to run
  var onBeforeUnloadReturnValue = await fireBeforeUnloadEvent(view.webContents)
  if (onBeforeUnloadReturnValue) {
    var choice = dialog.showMessageBox({
      type: 'question',
      buttons: ['Leave', 'Stay'],
      title: 'Do you want to leave this site?',
      message: 'Changes you made may not be saved.',
      defaultId: 0,
      cancelId: 1
    })
    var leave = (choice === 0)
    if (!leave) return
  }

  // save, in case the user wants to restore it
  closedURLs[win.id] = closedURLs[win.id] || []
  closedURLs[win.id].push(view.url)

  // set new active if that was
  if (view.isActive && views.length > 1) {
    setActive(win, views[i + 1] || views[i - 1])
  }

  // remove
  view.stopLiveReloading()
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
  win = getTopWindow(win)
  var views = getAll(win).slice() // .slice() to duplicate the list
  for (let v of views) {
    if (v !== view) {
      remove(win, v)
    }
  }
}

export function removeAllToRightOf (win, view) {
  win = getTopWindow(win)
  while (true) {
    let views = getAll(win)
    let index = views.indexOf(view) + 1
    if (index >= views.length) break
    remove(win, getByIndex(win, index))
  }
}

export function setActive (win, view) {
  win = getTopWindow(win)
  if (typeof view === 'number') {
    view = getByIndex(win, view)
  }
  if (!view) return

  // deactivate the old view
  var active = getActive(win)
  if (active) {
    active.deactivate(true)
  }

  // activate the new view
  view.activate()
  windowMenu.onSetCurrentLocation(win, view.url) // give the window-menu a chance to handle the change
  emitReplaceState(win)
}

export function resize (win) {
  var active = getActive(win)
  if (active) active.resize()
}

export function initializeFromSnapshot (win, snapshot) {
  win = getTopWindow(win)
  for (let url of snapshot) {
    create(win, url)
  }
}

export function takeSnapshot (win) {
  win = getTopWindow(win)
  return getAll(win)
    .filter(v => !v.isPinned)
    .map(v => v.url)
    .filter(Boolean)
}

export function togglePinned (win, view) {
  win = getTopWindow(win)
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
  win = getTopWindow(win)
  return settingsDb.set('pinned_tabs', JSON.stringify(getAllPinned(win).map(p => p.url)))
}

export async function loadPins (win) {
  win = getTopWindow(win)
  var json = await settingsDb.get('pinned_tabs')
  try { JSON.parse(json).forEach(url => create(win, url, {isPinned: true})) }
  catch (e) {}
}

export function reopenLastRemoved (win) {
  win = getTopWindow(win)
  var url = (closedURLs[win.id] || []).pop()
  if (url) {
    var view = create(win, url)
    setActive(win, view)
    return view
  }
}

export function reorder (win, oldIndex, newIndex) {
  win = getTopWindow(win)
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
  win = getTopWindow(win)
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
  win = getTopWindow(win)
  var views = getAll(win)
  if (index >= 0 && index < views.length) {
    setActive(win, views[index])
  }
}

export function changeActiveToLast (win) {
  win = getTopWindow(win)
  var views = getAll(win)
  setActive(win, views[views.length - 1])
}

export function openOrFocusDownloadsPage (win) {
  win = getTopWindow(win)
  var views = getAll(win)
  var downloadsView = views.find(v => v.url.startsWith('beaker://downloads'))
  if (!downloadsView) {
    downloadsView = create(win, 'beaker://downloads')
  }
  setActive(win, downloadsView)
}

export function emitReplaceState (win) {
  win = getTopWindow(win)
  var state = {tabs: getWindowTabState(win), isFullscreen: win.isFullScreen()}
  emit(win, 'replace-state', state)
  win.emit('custom-pages-updated', takeSnapshot(win))
}

export function emitUpdateState (win, view) {
  win = getTopWindow(win)
  var index = typeof view === 'number' ? view : getAll(win).indexOf(view)
  if (index === -1) {
    console.warn('WARNING: attempted to update state of a view not on the window')
    return
  }
  var state = getByIndex(win, index).state
  emit(win, 'update-state', {index, state})
  win.emit('custom-pages-updated', takeSnapshot(win))
}

// rpc api
// =

rpc.exportAPI('background-process-views', viewsRPCManifest, {
  createEventStream () {
    return emitStream(getEvents(getWindow(this.sender)))
  },

  async refreshState (tab) {
    var win = getWindow(this.sender)
    var view = getByIndex(win, tab)
    if (view) {
      view.refreshState()
    }
  },

  async getState () {
    var win = getWindow(this.sender)
    return getWindowTabState(win)
  },

  async getTabState (tab, opts) {
    var win = getWindow(this.sender)
    var view = getByIndex(win, tab)
    if (view) {
      var state = Object.assign({}, view.state)
      if (opts) {
        if (opts.datInfo) state.datInfo = view.datInfo
        if (opts.networkStats) state.networkStats = view.datInfo ? view.datInfo.networkStats : {}
        if (opts.sitePerms) state.sitePerms = await beakerCore.dbs.sitedata.getPermissions(view.url)
      }
      return state
    }
  },

  async getPageMetadata (tab) {
    var win = getWindow(this.sender)
    var view = getByIndex(win, tab)
    if (view) return view.getPageMetadata()
    return {}
  },

  async createTab (url, opts = {setActive: false, addToNoRedirects: false}) {
    if (opts.addToNoRedirects) {
      addToNoRedirects(url)
    }

    var win = getWindow(this.sender)
    var view = create(win, url, opts)
    return getAll(win).indexOf(view)
  },

  async loadURL (index, url, opts = {addToNoRedirects: false}) {
    if (opts.addToNoRedirects) {
      addToNoRedirects(url)
    }

    getByIndex(getWindow(this.sender), index).loadURL(url)
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
      { label: (view.isAudioMuted) ? 'Unmute Tab' : 'Mute Tab', click: () => view.toggleMuted() },
      { type: 'separator' },
      { label: 'Close Tab', click: () => remove(win, view) },
      { label: 'Close Other Tabs', click: () => removeAllExcept(win, view) },
      { label: 'Close Tabs to the Right', click: () => removeAllToRightOf(win, view) },
      { type: 'separator' },
      { label: 'Reopen Closed Tab', click: () => reopenLastRemoved(win) }
    ])
    menu.popup({window: win})
  },

  async showLocationBarContextMenu (index) {
    var win = getWindow(this.sender)
    var view = getByIndex(win, index)
    var clipboardContent = clipboard.readText()
    var clipInfo = examineLocationInput(clipboardContent)
    var menu = Menu.buildFromTemplate([
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { label: `Paste and ${clipInfo.isProbablyUrl ? 'Go' : 'Search'}`, click: onPasteAndGo }
    ])
    menu.popup({window: win})

    function onPasteAndGo () {
      // close the menu
      shellMenus.hide(win)
      win.webContents.send('command', 'unfocus-location')

      // load the URL
      var url = clipInfo.isProbablyUrl ? clipInfo.vWithProtocol : clipInfo.vSearch
      view.loadURL(url)
    }
  },

  async goBack (index) {
    getByIndex(getWindow(this.sender), index).webContents.goBack()
  },

  async goForward (index) {
    getByIndex(getWindow(this.sender), index).webContents.goForward()
  },

  async stop (index) {
    getByIndex(getWindow(this.sender), index).webContents.stop()
  },

  async reload (index) {
    getByIndex(getWindow(this.sender), index).webContents.reload()
  },

  async resetZoom (index) {
    zoom.zoomReset(getByIndex(getWindow(this.sender), index))
  },

  async toggleLiveReloading (index) {
    getByIndex(getWindow(this.sender), index).toggleLiveReloading()
  },

  async toggleDevTools (index) {
    getByIndex(getWindow(this.sender), index).webContents.toggleDevTools()
  },

  async showInpageFind (index) {
    getByIndex(getWindow(this.sender), index).showInpageFind()
  },

  async hideInpageFind (index) {
    getByIndex(getWindow(this.sender), index).hideInpageFind()
  },

  async setInpageFindString (index, str, dir) {
    getByIndex(getWindow(this.sender), index).setInpageFindString(str, dir)
  },

  async moveInpageFind (index, dir) {
    getByIndex(getWindow(this.sender), index).moveInpageFind(dir)
  },

  async showLocationBar (opts) {
    await locationBar.show(getWindow(this.sender), opts)
  },

  async hideLocationBar () {
    await locationBar.hide(getWindow(this.sender))
  },

  async runLocationBarCmd (cmd, opts) {
    return locationBar.runCmd(getWindow(this.sender), cmd, opts)
  },

  async showMenu (id, opts) {
    await shellMenus.show(getWindow(this.sender), id, opts)
  },

  async toggleMenu (id, opts) {
    await shellMenus.toggle(getWindow(this.sender), id, opts)
  },

  async focusShellWindow () {
    getWindow(this.sender).webContents.focus()
  },

  async onFaviconLoadSuccess (index, dataUrl) {
    var view = getByIndex(getWindow(this.sender), index)
    if (view) {
      // if not a dat site, store the favicon
      // (dat caches favicons through the dat/assets.js process in beaker-core)
      if (!view.url.startsWith('dat:')) {
        beakerCore.dbs.sitedata.set(view.url, 'favicon', dataUrl)
      }
    }
  },

  async onFaviconLoadError (index) {
    var view = getByIndex(getWindow(this.sender), index)
    if (view) {
      view.favicons = null
      view.emitUpdateState()
    }
  }
})

// internal methods
// =

function getWindow (sender) {
  return getTopWindow(BrowserWindow.fromWebContents(sender))
}

// helper ensures that if a subwindow is called, we use the parent
function getTopWindow (win) {
  while (win.getParentWindow()) {
    win = win.getParentWindow()
  }
  return win
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

function toOrigin (str) {
  try {
    var u = new URL(str)
    return u.protocol + '//' + u.hostname
  } catch (e) { return '' }
}

function addToNoRedirects (url) {
  try {
    var u = new URL(url)
    noRedirectHostnames.add(u.hostname)
  } catch (e) {
    console.log('Failed to add URL to noRedirectHostnames', url, e)
  }
}

async function fireBeforeUnloadEvent (wc) {
  try {
    if (wc.isLoading() || wc.isWaitingForResponse()) {
      return // dont bother
    }
    return await wc.executeJavaScript(`
      (function () {
        let unloadEvent = new Event('beforeunload', {bubbles: false, cancelable: true})
        unloadEvent.returnValue = false
        return window.dispatchEvent(unloadEvent)
      })()
    `)
    } catch (e) {
      // ignore
    }
}

// `nextViewIsScriptCloseable` is set by a message received prior to window.open() being called
// we capture the state of the flag on the next created view, then reset it
function takeIsScriptClosable () {
  var b = nextViewIsScriptCloseable
  nextViewIsScriptCloseable = false
  return b
}