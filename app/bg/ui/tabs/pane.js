import { app, BrowserView } from 'electron'
import errorPage from '../../lib/error-page'
import path from 'path'
import { promises as fs } from 'fs'
import { EventEmitter } from 'events'
import _throttle from 'lodash.throttle'
import { parseDriveUrl } from '../../../lib/urls'
import { toNiceUrl } from '../../../lib/strings'
import _get from 'lodash.get'
import _pick from 'lodash.pick'
import * as zoom from './zoom'
import * as modals from '../subwindows/modals'
import * as windowMenu from '../window-menu'
import { getResourceContentType } from '../../browser'
import { DRIVE_KEY_REGEX } from '../../../lib/strings'
import * as sitedataDb from '../../dbs/sitedata'
import * as historyDb from '../../dbs/history'
import * as folderSyncDb from '../../dbs/folder-sync'
import * as filesystem from '../../filesystem/index'
import * as bookmarks from '../../filesystem/bookmarks'
import hyper from '../../hyper/index'

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

const TRIGGER_LIVE_RELOAD_DEBOUNCE = 500 // throttle live-reload triggers by this amount
const STATUS_BAR_HEIGHT = 22

// the variables which are automatically sent to the shell-window for rendering
const STATE_VARS = [
  'id',
  'url',
  'title',
  'siteTitle',
  'siteSubtitle',
  'siteIcon',
  'siteTrust',
  'driveDomain',
  'isSystemDrive',
  'writable',
  'folderSyncPath',
  'peers',
  'favicons',
  'zoom',
  'loadError',
  // 'isActive', tab sends this
  // 'isPinned', tab sends this
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
  'donateLinkHref',
  'isLiveReloading',
  'tabCreationTime'
]

// classes
// =

export class Pane extends EventEmitter {
  constructor (tab) {
    super()
    this.tab = tab
    this.browserView = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
        nodeIntegrationInSubFrames: true,
        contextIsolation: true,
        webviewTag: false,
        sandbox: true,
        defaultEncoding: 'utf-8',
        nativeWindowOpen: true,
        nodeIntegration: false,
        scrollBounce: true,
        navigateOnDragDrop: true,
        enableRemoteModule: false,
        safeDialogs: true
      }
    })
    this.browserView.setBackgroundColor('#fff')

    // webview state
    this.loadingURL = null // URL being loaded, if any
    this.isLoading = false // is the pane loading?
    this.isReceivingAssets = false // has the webview started receiving assets in the current load-cycle?
    this.favicons = null // array of favicon URLs
    this.zoom = 0 // what's the current zoom level?
    this.loadError = null // page error state, if any
    this.mainFrameId = undefined // the frameRoutingId of the main frame
    this.frameUrls = {} // map of frameRoutingId -> string (url)

    // browser state
    this.isActive = false // is this the active pane in the tab?
    this.currentStatus = false // the status-bar value
    this.liveReloadEvents = null // live-reload event stream
    this.isInpageFindActive = false // is the inpage-finder UI active?
    this.currentInpageFindString = undefined // what's the current inpage-finder query string?
    this.currentInpageFindResults = undefined // what's the current inpage-finder query results?
    this.fadeoutCssId = undefined // injected CSS id to fade out the page content
    this.attachedPane = undefined // pane which this pane is currently attached to
    this.wantsAttachedPane = false // has the app asked for attached panes?
    this.attachedPaneEvents = new EventEmitter() // emitter for events specifically realted to the attached pane
    this.onAttachedPaneNavigated = (e, url) => this.attachedPaneEvents.emit('pane-navigated', {detail: {url}})

    // helper state
    this.folderSyncPath = undefined // current folder sync path
    this.peers = 0 // how many peers does the site have?
    this.isBookmarked = false // is the active page bookmarked?
    this.driveInfo = null // metadata about the site if viewing a hyperdrive
    this.donateLinkHref = null // the URL of the donate site, if set by the index.json
    this.wasDriveTimeout = false // did the last navigation result in a timed-out hyperdrive?
    this.layoutHeight = undefined // used by pane-layout to track height

    // wire up events
    this.webContents.on('did-start-loading', this.onDidStartLoading.bind(this))
    this.webContents.on('did-start-navigation', this.onDidStartNavigation.bind(this))
    this.webContents.on('did-navigate', this.onDidNavigate.bind(this))
    this.webContents.on('did-navigate-in-page', this.onDidNavigateInPage.bind(this))
    this.webContents.on('did-stop-loading', this.onDidStopLoading.bind(this))
    this.webContents.on('dom-ready', this.onDomReady.bind(this))
    this.webContents.on('did-fail-load', this.onDidFailLoad.bind(this))
    this.webContents.on('update-target-url', this.onUpdateTargetUrl.bind(this))
    this.webContents.on('page-title-updated', this.onPageTitleUpdated.bind(this)) // NOTE page-title-updated isn't documented on webContents but it is supported
    this.webContents.on('page-favicon-updated', this.onPageFaviconUpdated.bind(this))
    this.webContents.on('new-window', this.onNewWindow.bind(this))
    this.webContents.on('-will-add-new-contents', this.onWillAddNewContents.bind(this))
    this.webContents.on('media-started-playing', this.onMediaChange.bind(this))
    this.webContents.on('media-paused', this.onMediaChange.bind(this))
    this.webContents.on('found-in-page', this.onFoundInPage.bind(this))
    this.webContents.on('zoom-changed', this.onZoomChanged.bind(this))

    // security - deny these events
    const deny = e => e.preventDefault()
    this.webContents.on('remote-require', deny)
    this.webContents.on('remote-get-global', deny)
    this.webContents.on('remote-get-builtin', deny)
    this.webContents.on('remote-get-current-window', deny)
    this.webContents.on('remote-get-current-web-contents', deny)
    this.webContents.on('remote-get-guest-web-contents', deny)
  }

  get id () {
    return this.browserView.id
  }

  get webContents () {
    return this.browserView.webContents
  }

  get browserWindow () {
    return this.tab && this.tab.browserWindow
  }

  get url () {
    return this.webContents.getURL()
  }

  get origin () {
    return toOrigin(this.url)
  }

  get title () {
    var title = this.webContents.getTitle()
    if (this.driveInfo && this.driveInfo.title && (!title || toOrigin(title) === this.origin)) {
      // fallback to the index.json title field if the page doesnt provide a title
      title = this.driveInfo.title
    }
    return title
  }

  get siteTitle () {
    try {
      var urlp = new URL(this.loadingURL || this.url)
      var hostname = urlp.hostname
      if (DRIVE_KEY_REGEX.test(hostname)) {
        hostname = hostname.replace(DRIVE_KEY_REGEX, v => `${v.slice(0, 6)}..${v.slice(-2)}`)
      }
      if (hostname.includes('+')) {
        hostname = hostname.replace(/\+[\d]+/, '')
      }
      if (this.driveInfo) {
        var ident = _get(this.driveInfo, 'ident', {})
        if (ident.system) {
          return 'My System Drive'
        }
        if (this.driveInfo.writable || ident.contact) {
          if (this.driveInfo.title) {
            return this.driveInfo.title
          }
        }
      }
      if (urlp.protocol === 'beaker:') {
        if (urlp.hostname === 'diff') return 'Beaker Diff/Merge Tool'
        if (urlp.hostname === 'explorer') return 'Beaker Files Explorer'
        if (urlp.hostname === 'history') return 'Beaker History'
        if (urlp.hostname === 'library') return 'Beaker Library'
        if (urlp.hostname === 'settings') return 'Beaker Settings'
        if (urlp.hostname === 'webterm') return 'Beaker Webterm'
        return 'Beaker'
      }
      return hostname + (urlp.port ? `:${urlp.port}` : '')
    } catch (e) {
      return ''
    }
  }

  get siteSubtitle () {
    if (this.driveInfo) {
      var origin = this.origin
      var version = /\+([\d]+)/.exec(origin) ? `v${/\+([\d]+)/.exec(origin)[1]}` : ''
      var forkLabel = _get(filesystem.listDrives().find(d => d.key === this.driveInfo.key), 'forkOf.label', '')
      return [forkLabel, version].filter(Boolean).join(' ')
    }
    return ''
  }

  get siteIcon () {
    if (this.driveInfo) {
      var ident = this.driveInfo.ident || {}
      if (ident.contact || ident.profile) {
        return 'fas fa-user-circle'
      }
      if (this.driveInfo.writable) {
        return 'fas fa-check-circle'
      }
    }
    var url = this.loadingURL || this.url
    if (url.startsWith('https:') && !(this.loadError && this.loadError.isInsecureResponse)) {
      return 'fas fa-check-circle'
    }
    if (url.startsWith('beaker:')) {
      return 'beaker-logo'
    }
    return 'fas fa-info-circle'
  }

  get siteTrust () {
    try {
      var urlp = new URL(this.loadingURL || this.url)
      if (this.loadError && this.loadError.isInsecureResponse) {
        return 'untrusted'
      }
      if (['https:', 'beaker:'].includes(urlp.protocol)) {
        return 'trusted'
      }
      if (urlp.protocol === 'http:') {
        return 'untrusted'
      }
      if (urlp.protocol === 'hyper:' && this.driveInfo) {
        if (this.driveInfo.writable || this.driveInfo.ident.internal || this.driveInfo.ident.contact) {
          return 'trusted'
        }
      }
    } catch (e) {
    }
    return 'notrust'
  }

  get driveDomain () {
    return _get(this.driveInfo, 'domain', '')
  }

  get isSystemDrive () {
    return _get(this.driveInfo, 'ident.system', false)
  }

  get writable () {
    return _get(this.driveInfo, 'writable', false)
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

  get state () {
    var state = _pick(this, STATE_VARS)
    if (this.loadingURL) state.url = this.loadingURL
    return state
  }

  getIPCSenderInfo (event) {
    if (event.sender === this.webContents) {
      return {
        url: this.frameUrls[event.frameId],
        isMainFrame: event.frameId === this.mainFrameId
      }
    }
  }

  setTab (tab) {
    this.tab = tab
  }

  // management
  // =

  loadURL (url, opts = undefined) {
    this.webContents.loadURL(url, opts)
  }

  setBounds (bounds) {
    this.browserView.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height - STATUS_BAR_HEIGHT
    })
  }

  show ({noFocus} = {noFocus: false}) {
    if (this.tab.isHidden) return
    this.browserWindow.addBrowserView(this.browserView)
    if (!noFocus) this.webContents.focus()
    this.emit('showed')
  }

  focus () {
    if (this.tab.isHidden) return
    this.webContents.focus()
  }

  hide () {
    if (!this.browserWindow) return
    this.browserWindow.removeBrowserView(this.browserView)
  }

  destroy () {
    this.hide()
    this.stopLiveReloading()
    this.browserView.destroy()
    this.emit('destroyed')
  }

  awaitActive () {
    return new Promise((resolve, reject) => {
      const showed = () => {
        this.removeListener('showed', showed)
        this.removeListener('destroyed', destroyed)
        resolve()
      }
      const destroyed = () => {
        this.removeListener('showed', showed)
        this.removeListener('destroyed', destroyed)
        reject()
      }
      this.on('showed', showed)
      this.on('destroyed', destroyed)
    })
  }

  async fadeout () {
    if (this.fadeoutCssId) return
    this.fadeoutCssId = await this.webContents.insertCSS(`body { opacity: 0.5 }`)
  }

  async fadein () {
    if (!this.fadeoutCssId) return
    await this.webContents.removeInsertedCSS(this.fadeoutCssId)
    this.fadeoutCssId = undefined
  }

  transferWindow (targetWindow) {
    this.deactivate()
    this.browserWindow = targetWindow
  }

  async updateHistory () {
    var url = this.url
    var title = this.title
    if (url !== 'beaker://desktop/' && url !== 'beaker://history/') {
      historyDb.addVisit(0, {url, title})
    }
  }

  toggleMuted () {
    this.webContents.setAudioMuted(!this.isAudioMuted)
  }

  async captureScreenshot () {
    try {
      // wait a sec to allow loading to finish
      var url = this.url
      await new Promise(r => setTimeout(r, 2e3))

      // capture the page
      this.browserView.webContents.incrementCapturerCount({width: 1000, height: 800}, !this.isActive)
      var image = await this.browserView.webContents.capturePage()
      this.browserView.webContents.decrementCapturerCount(!this.isActive)
      var bounds = image.getSize()
      if (bounds.width === 0 || bounds.height === 0) return
      if (bounds.width <= bounds.height) return // only save if it's a useful image
      await sitedataDb.set(url, 'screenshot', image.toDataURL(), {dontExtractOrigin: true, normalizeUrl: true})
    } catch (e) {
      // ignore, can happen if the pane was closed during wait
      console.log('Failed to capture page screenshot', e)
    }
  }

  // inpage finder
  // =

  showInpageFind () {
    if (this.tab.isHidden) return
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
    var findNext = this.currentInpageFindString === str
    this.currentInpageFindString = str
    this.webContents.findInPage(this.currentInpageFindString, {findNext, forward: dir !== -1})
  }

  moveInpageFind (dir) {
    if (!this.currentInpageFindString) return
    this.webContents.findInPage(this.currentInpageFindString, {findNext: false, forward: dir !== -1})
  }

  // live reloading
  // =

  async toggleLiveReloading (enable) {
    if (typeof enable === 'undefined') {
      enable = !this.liveReloadEvents
    }
    if (this.liveReloadEvents) {
      this.liveReloadEvents.destroy()
      this.liveReloadEvents = false
    } else if (this.driveInfo) {
      let drive = hyper.drives.getDrive(this.driveInfo.key)
      if (!drive) return

      let {version} = parseDriveUrl(this.url)
      let {checkoutFS} = await hyper.drives.getDriveCheckout(drive, version)
      this.liveReloadEvents = await checkoutFS.pda.watch()

      const reload = _throttle(() => {
        this.browserView.webContents.reload()
      }, TRIGGER_LIVE_RELOAD_DEBOUNCE, {leading: false})
      this.liveReloadEvents.on('data', ([evt]) => {
        if (evt === 'changed') reload()
      })
      // ^ note this throttle is run on the front edge.
      // That means snappier reloads (no delay) but possible double reloads if multiple files change
    }
    this.emitUpdateState()
  }

  stopLiveReloading () {
    if (this.liveReloadEvents) {
      this.liveReloadEvents.destroy()
      this.liveReloadEvents = false
      this.emitUpdateState()
    }
  }

  // custom renderers
  // =

  async injectCustomRenderers () {
    // determine content type
    let contentType = getResourceContentType(this.url) || ''
    let isPlainText = contentType.startsWith('text/plain')
    let isJSON = contentType.startsWith('application/json') || (isPlainText && this.url.endsWith('.json'))
    let isJS = contentType.includes('/javascript') || (isPlainText && this.url.endsWith('.js'))
    let isCSS = contentType.startsWith('text/css') || (isPlainText && this.url.endsWith('.css'))

    // json rendering
    // inject the json render script
    if (isJSON) {
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
      let jsonpath = path.join(app.getAppPath(), 'fg', 'json-renderer', 'index.build.js')
      jsonpath = jsonpath.replace('app.asar', 'app.asar.unpacked') // fetch from unpacked dir
      try {
        await this.webContents.executeJavaScript(await fs.readFile(jsonpath, 'utf8'))
      } catch (e) {
        // ignore
      }
    }
    // js/css syntax highlighting
    if (isJS || isCSS) {
      this.webContents.insertCSS(`
      .hljs {
        display: block;
        overflow-x: auto;
        padding: 0.5em;
        background: white;
        color: black;
      }
      .hljs-comment, .hljs-quote, .hljs-variable { color: #008000; }
      .hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name, .hljs-tag { color: #00f; }
      .hljs-string, .hljs-title, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #a31515; }
      .hljs-deletion, .hljs-selector-attr, .hljs-selector-pseudo, .hljs-meta { color: #2b91af; }
      .hljs-doctag { color: #808080; }
      .hljs-attr { color: #f00; }
      .hljs-symbol, .hljs-bullet, .hljs-link { color: #00b0e8; }
      .hljs-emphasis { font-style: italic; }
      .hljs-strong { font-weight: bold; }
      `)
      let scriptpath = path.join(app.getAppPath(), 'fg', 'syntax-highlighter', 'index.js')
      scriptpath = scriptpath.replace('app.asar', 'app.asar.unpacked') // fetch from unpacked dir
      try {
        await this.webContents.executeJavaScript(await fs.readFile(scriptpath, 'utf8'))
      } catch (e) {
        // ignore
      }
    }
  }

  // state fetching
  // =

  // helper called by UIs to pull latest state if a change event has occurred
  // eg called by the bookmark systems after the bookmark state has changed
  async refreshState () {
    await Promise.all([
      this.fetchIsBookmarked(true),
      this.fetchDriveInfo(true)
    ])
    this.emitUpdateState()
  }

  async fetchIsBookmarked (noEmit = false) {
    var wasBookmarked = this.isBookmarked
    this.isBookmarked = !!(await bookmarks.get(this.url))
    if (this.isBookmarked && !wasBookmarked) {
      this.captureScreenshot()
    }
    if (!noEmit) {
      this.emitUpdateState()
    }
  }

  async fetchDriveInfo (noEmit = false) {
    // clear existing state
    this.folderSyncPath = undefined
    this.peers = 0
    this.donateLinkHref = null

    if (!this.url.startsWith('hyper://')) {
      this.driveInfo = null
      return
    }
    
    // fetch new state
    var key
    try {
      key = await hyper.dns.resolveName(this.url)
      this.driveInfo = await hyper.drives.getDriveInfo(key)
      this.driveInfo.ident = await filesystem.getDriveIdent(this.driveInfo.url, true)
      this.folderSyncPath = await folderSyncDb.getPath(this.driveInfo.key)
      this.peers = this.driveInfo.peers
      this.donateLinkHref = _get(this, 'driveInfo.links.payment.0.href')
    } catch (e) {
      this.driveInfo = null
    }
    if (!noEmit) this.emitUpdateState()
  }

  // attached pane
  // =

  setAttachedPane (pane) {
    if (this.attachedPane) {
      if (!this.attachedPane.webContents.isDestroyed()) {
        this.attachedPane.webContents.removeListener('did-navigate', this.onAttachedPaneNavigated)
      }
      this.attachedPaneEvents.emit('pane-detached')
    }
    this.attachedPane = pane
    if (pane) {
      this.attachedPaneEvents.emit('pane-attached', {detail: {id: pane.id}})
      this.attachedPane.webContents.on('did-navigate', this.onAttachedPaneNavigated)
    }
    this.tab.emitPaneUpdateState()
  }

  // events
  // =

  emitUpdateState () {
    this.tab.emitTabUpdateState(this)
  }

  onDidStartLoading (e) {
    // update state
    this.loadingURL = null
    this.isReceivingAssets = false
    this.wasDriveTimeout = false

    // emit
    this.emitUpdateState()
  }

  onDidStartNavigation (e, url, isInPlace, isMainFrame, frameProcessId, frameRoutingId) {
    this.frameUrls[frameRoutingId] = url
    if (!isMainFrame) return
    this.mainFrameId = frameRoutingId
    var origin = toOrigin(url)

    // handle origin changes
    if (origin !== toOrigin(this.url)) {
      this.stopLiveReloading()
      this.setAttachedPane(undefined)
      this.wantsAttachedPane = false
    }

    // update state
    this.loadingURL = url
    this.isLoading = true
    this.emitUpdateState()
    // if (this.tab.isHidden) app.emit('custom-background-tabs-update', backgroundTabs) TODO
  }

  async onDidNavigate (e, url, httpResponseCode) {
    // remove any active subwindows
    modals.close(this.browserView)

    // read zoom
    zoom.setZoomFromSitedata(this)

    // update state
    this.loadError = null
    this.loadingURL = null
    this.isReceivingAssets = true
    this.favicons = null
    this.frameUrls = {[this.mainFrameId]: url} // drop all non-main-frame URLs
    await this.fetchIsBookmarked()
    await this.fetchDriveInfo()
    if (httpResponseCode === 504 && url.startsWith('hyper://')) {
      this.wasDriveTimeout = true
    }

    // emit
    this.emitUpdateState()
  }

  onDidNavigateInPage (e) {
    this.fetchIsBookmarked()
    this.updateHistory()
  }

  onDidStopLoading () {
    this.updateHistory()

    // update state
    this.isLoading = false
    this.loadingURL = null
    this.isReceivingAssets = false

    // run custom renderer apps
    this.injectCustomRenderers()

    // emit
    if (!this.tab.isHidden) {
      windowMenu.onSetCurrentLocation(this.browserWindow, this.url)
    }
    this.emitUpdateState()
  }

  onDomReady (e) {
    // HACK
    // sometimes 'did-stop-loading' doesnt get fired
    // not sure why, but 'dom-ready' indicates that loading is done
    // if still isLoading or isReceivingAssets, run the did-stop-loading handler
    // -prf
    if (this.isLoading || this.isReceivingAssets) {
      this.onDidStopLoading()
    }
  }

  async onDidFailLoad (e, errorCode, errorDescription, validatedURL, isMainFrame) {
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
    try {
      await this.webContents.executeJavaScript('document.documentElement.innerHTML = \'' + errorPageHTML + '\'; undefined')
    } catch (e) {
      // ignore
    }
  }

  onUpdateTargetUrl (e, url) {
    if (this.tab.isHidden) return
    if (this.browserWindow.isDestroyed()) return
    this.currentStatus = url ? toNiceUrl(url) : url
    this.tab.emitPaneUpdateState()
  }

  onPageTitleUpdated (e, title) {
    if (this.browserWindow && this.browserWindow.isDestroyed()) return
    this.emitUpdateState()
  }

  onPageFaviconUpdated (e, favicons) {
    this.favicons = favicons && favicons[0] ? favicons : null

    if (this.favicons) {
      let url = this.url
      this.webContents.executeJavaScriptInIsolatedWorld(998, [{code: `
        (async function () {
          var img = await new Promise(resolve => {
            var img = new Image()
            img.crossOrigin = 'Anonymous'
            img.onload = e => resolve(img)
            img.onerror = () => resolve(false)
            img.src = "${this.favicons[0]}"
          })
          if (!img) return
            
          let {width, height} = img
          var ratio = width / height
          if (width / height > ratio) { height = width / ratio } else { width = height * ratio }
        
          var canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          var ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          return canvas.toDataURL('image/png')
        })()
      `}]).then((dataUrl, err) => {
        if (err) console.log(err)
        else {
          sitedataDb.set(url, 'favicon', dataUrl)
        }
      })
    }
    
    this.emitUpdateState()
  }

  onNewWindow (e, url, frameName, disposition, options) {
    e.preventDefault()
    if (!this.isActive || !this.tab) return // only open if coming from the active pane
    var setActive = disposition === 'foreground-tab'
    var setActiveBySettings = !setActive
    this.tab.createTab(url, {setActive, setActiveBySettings, adjacentActive: true})
  }

  onWillAddNewContents (e, url) {
    // HACK
    // this should be handled by new-window, but new-window currently crashes
    // if you prevent default, so we handle it here
    // see https://github.com/electron/electron/issues/23859
    // -prf
    e.preventDefault()
    if (!this.tab) return
    this.tab.createTab(url, {setActiveBySettings: true, adjacentActive: true})
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

  onZoomChanged (e, zoomDirection) {
    if (zoomDirection === 'in') zoom.zoomIn(this)
    if (zoomDirection === 'out') zoom.zoomOut(this)
  }
}

// internal methods
// =

function toOrigin (str) {
  try {
    var u = new URL(str)
    return u.protocol + '//' + u.hostname + (u.port ? `:${u.port}` : '') + '/'
  } catch (e) { return '' }
}

async function fireBeforeUnloadEvent (wc) {
  try {
    if (wc.isLoading() || wc.isWaitingForResponse()) {
      return // dont bother
    }
    return await Promise.race([
      wc.executeJavaScript(`
        (function () {
          let unloadEvent = new Event('beforeunload', {bubbles: false, cancelable: true})
          unloadEvent.returnValue = false
          return window.dispatchEvent(unloadEvent)
        })()
      `),
      new Promise(r => {
        setTimeout(r, 500) // thread may be locked, so abort after 500ms
      })
    ])
    } catch (e) {
      // ignore
    }
}
