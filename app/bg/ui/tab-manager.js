import { app, dialog, BrowserView, BrowserWindow, Menu, clipboard, ipcMain, webContents } from 'electron'
import errorPage from '../lib/error-page'
import * as libTools from '@beaker/library-tools'
import path from 'path'
import { promises as fs } from 'fs'
import Events from 'events'
import _throttle from 'lodash.throttle'
import { parseDriveUrl } from '../../lib/urls'
import emitStream from 'emit-stream'
import _get from 'lodash.get'
import _pick from 'lodash.pick'
import * as rpc from 'pauls-electron-rpc'
import viewsRPCManifest from '../rpc-manifests/views'
import * as zoom from './tabs/zoom'
import * as shellMenus from './subwindows/shell-menus'
import * as locationBar from './subwindows/location-bar'
import * as statusBar from './subwindows/status-bar'
import * as prompts from './subwindows/prompts'
import * as permPrompt from './subwindows/perm-prompt'
import * as modals from './subwindows/modals'
import * as sidebars from './subwindows/sidebars'
import * as siteInfo from './subwindows/site-info'
import * as windowMenu from './window-menu'
import { createShellWindow, getUserSessionFor } from './windows'
import { getResourceContentType } from '../browser'
import { examineLocationInput } from '../../lib/urls'
import { clamp } from '../../lib/math'
import { DAT_KEY_REGEX, slugify } from '../../lib/strings'
import { findWebContentsParentWindow } from '../lib/electron'
import { findImageBounds } from '../lib/image'
import * as sitedataDb from '../dbs/sitedata'
import * as settingsDb from '../dbs/settings'
import * as historyDb from '../dbs/history'
import * as filesystem from '../filesystem/index'
import { query as fsquery } from '../filesystem/query'
import * as bookmarks from '../filesystem/bookmarks'
import * as users from '../filesystem/users'
import hyper from '../hyper/index'

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

const Y_POSITION = 76
export const FOOTER_HEIGHT = 25
const DEFAULT_URL = 'beaker://desktop'
const TRIGGER_LIVE_RELOAD_DEBOUNCE = 500 // throttle live-reload triggers by this amount

// the variables which are automatically sent to the shell-window for rendering
const STATE_VARS = [
  'url',
  'title',
  'siteTitle',
  'siteIcon',
  'driveDomain',
  'isHomeDrive',
  'isUserDrive',
  'isFollowing',
  'writable',
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
  'isSidebarActive',
  'sidebarPanels',
  'sidebarWidth',
  'isInpageFindActive',
  'currentInpageFindString',
  'currentInpageFindResults',
  'availableAlternative',
  'donateLinkHref',
  'isLiveReloading'
]

// globals
// =

var activeTabs = {} // map of {[win.id]: Array<Tab>}
var preloadedNewTabs = {} // map of {[win.id]: Tab}
var lastSelectedTabIndex = {} // map of {[win.id]: Number}
var closedURLs = {} // map of {[win.id]: Array<string>}
var windowEvents = {} // mapof {[win.id]: Events}
var noRedirectHostnames = new Set() // set of hostnames which have drive-redirection disabled
var nextTabIsScriptCloseable = false // will the next tab created be "script closable"?

// classes
// =

class Tab {
  constructor (win, opts = {isPinned: false, isHidden: false}) {
    this.browserWindow = win
    this.browserView = new BrowserView({
      webPreferences: {
        preload: path.join(__dirname, 'fg', 'webview-preload', 'index.build.js'),
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
    this.previouslyFocusedWebcontents = undefined // the webcontents which was focused when the tab was last deactivated

    // browser state
    this.isHidden = opts.isHidden // is this tab hidden from the user? used for the preloaded tab
    this.isActive = false // is this the active page in the window?
    this.isPinned = Boolean(opts.isPinned) // is this page pinned?
    this.isSidebarActive = false // is the sidebar open?
    this.sidebarPanels = new Set() // the active sidebar panels
    this.sidebarWidth = undefined // what is the current sidebar width?
    this.liveReloadEvents = null // live-reload event stream
    this.isInpageFindActive = false // is the inpage-finder UI active?
    this.currentInpageFindString = undefined // what's the current inpage-finder query string?
    this.currentInpageFindResults = undefined // what's the current inpage-finder query results?
    this.isScriptClosable = takeIsScriptClosable() // can this tab be closed by `window.close` ?

    // helper state
    this.peers = 0 // how many peers does the site have?
    this.isBookmarked = false // is the active page bookmarked?
    this.driveInfo = null // metadata about the site if viewing a hyperdrive
    this.confirmedAuthorTitle = undefined // the title of the confirmed author of the site
    this.donateLinkHref = null // the URL of the donate site, if set by the index.json
    this.availableAlternative = '' // tracks if there's alternative protocol available for the site
    this.wasDriveTimeout = false // did the last navigation result in a timed-out hyperdrive?

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

  get id () {
    return this.browserView.id
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
    if (this.driveInfo && this.driveInfo.title && (!title || title.startsWith(this.origin))) {
      // fallback to the index.json title field if the page doesnt provide a title
      title = this.driveInfo.title
    }
    return title
  }

  get siteTitle () {
    try {
      var urlp = new URL(this.url)
      if (DAT_KEY_REGEX.test(urlp.hostname)) {
        urlp.hostname = `${urlp.hostname.slice(0, 4)}..${urlp.hostname.slice(-2)}`
      }
      var origin = urlp.protocol + '//' + (urlp.hostname).replace(/\+(.+)$/, '')
      if (this.driveInfo) {
        if (_get(this.driveInfo, 'ident.home', false)) {
          return 'My Home Drive'
        }
      }
      if (urlp.protocol === 'beaker:') {
        return 'Beaker'
      }
      return origin + (urlp.port ? `:${urlp.port}` : '')
    } catch (e) {
      return ''
    }
  }

  get siteIcon () {
    if (this.driveInfo) {
      return libTools.getFAIcon(libTools.typeToCategory(this.driveInfo.type))
    }
    return ''
  }

  get driveDomain () {
    return _get(this.driveInfo, 'domain', '')
  }

  get isHomeDrive () {
    return _get(this.driveInfo, 'ident.home', false)
  }

  get isUserDrive () {
    return _get(this.driveInfo, 'ident.user', false)
  }

  get isFollowing () {
    return _get(this.driveInfo, 'isFollowing', false)
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
    state.sidebarPanels = Array.from(state.sidebarPanels) // convert from a set to an array
    if (this.loadingURL) state.url = this.loadingURL
    return state
  }

  // management
  // =

  loadURL (url, opts) {
    this.browserView.webContents.loadURL(url, opts)
  }

  calculateBounds (windowBounds) {
    var x = 0
    var y = Y_POSITION
    var {width, height} = windowBounds
    if (this.browserWindow.isShellInterfaceHidden) {
      y = 0
    }
    if (this.isSidebarActive) {
      // sidebar takes left side of the screen
      x = (this.sidebarWidth + sidebars.HALF_SIDEBAR_EDGE_PADDING)
      width -= (this.sidebarWidth + sidebars.HALF_SIDEBAR_EDGE_PADDING)
    }
    height -= FOOTER_HEIGHT
    return {x, y: y, width, height: height - y}
  }

  resize () {
    var {width, height} = this.browserWindow.getContentBounds()
    if (this.isSidebarActive && width < this.sidebarWidth + 100) {
      // shrink the sidebar to ensure the content stays visible
      this.setSidebarWidth(width - 100)
    }
    this.browserView.setBounds(this.calculateBounds({width, height}))
    prompts.reposition(this.browserWindow)
  }

  activate () {
    this.isActive = true

    const win = this.browserWindow
    win.addBrowserView(this.browserView)
    prompts.show(this.browserView)
    permPrompt.show(this.browserView)
    modals.show(this.browserView)
    sidebars.show(this)

    this.resize()
    if (this.previouslyFocusedWebcontents) {
      this.previouslyFocusedWebcontents.focus()
      this.previouslyFocusedWebcontents = undefined
    } else {
      this.webContents.focus()
    }
  }

  focus () {
    if (this.isSidebarActive) {
      let sidebar = sidebars.get(this)
      if (sidebar) sidebar.webContents.focus()
    } else {
      this.webContents.focus()
    }
  }

  deactivate () {
    this.previouslyFocusedWebcontents = webContents.getFocusedWebContents()
    this.browserWindow.removeBrowserView(this.browserView)
    if (this.isActive) {
      shellMenus.hide(this.browserWindow) // this will close the location menu if it's open
    }
    prompts.hide(this.browserView)
    permPrompt.hide(this.browserView)
    modals.hide(this.browserView)
    sidebars.hide(this)
    this.isActive = false
  }

  destroy () {
    this.deactivate()
    prompts.close(this.browserView)
    permPrompt.close(this.browserView)
    modals.close(this.browserView)
    this.browserView.destroy()
  }

  transferWindow (targetWindow) {
    this.deactivate()
    prompts.close(this.browserView)
    permPrompt.close(this.browserView)
    modals.close(this.browserView)

    this.browserWindow = targetWindow
  }

  async updateHistory () {
    var url = this.url
    var title = this.title

    if (url !== 'beaker://desktop/' && url !== 'beaker://history/') {
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

  async openSidebar () {
    if (this.isSidebarActive) return
    
    let v = sidebars.create(this)
    v.webContents.loadURL('beaker://sidebar/')
    var onDidFinishLoad = new Promise(r => v.webContents.on('did-finish-load', r))

    this.sidebarWidth = clamp((this.browserWindow.getContentBounds().width / 2)|0, 100, 800)
    if (this.isActive) {
      sidebars.show(this)
      v.webContents.focus()
    }

    this.isSidebarActive = true
    this.sidebarPanels.clear()
    this.resize()
    this.emitUpdateState()
    await onDidFinishLoad
  }

  async closeSidebar () {
    if (!this.isSidebarActive) return
    sidebars.close(this)
    this.isSidebarActive = false
    this.sidebarPanels.clear()
    this.resize()
    this.emitUpdateState()
  }

  async executeSidebarCommand (cmd, ...args) {
    const wc = () => sidebars.get(this).webContents
    const execJs = (js) => wc().executeJavaScript(js)
    switch (cmd) {
      case 'hide-panel':
      case 'close':
        if (!this.isSidebarActive) return
      default:
        await this.openSidebar()
    }
    switch (cmd) {
      case 'show-panel':   wc().focus(); await execJs(`showPanel("${args[0]}", "${args[1] || this.url}")`); break
      case 'toggle-panel': wc().focus(); await execJs(`togglePanel("${args[0]}", "${args[1] || this.url}")`); break
      case 'hide-panel':   await execJs(`hidePanel("${args[0]}")`); break
      case 'set-context':  await execJs(`setContext("${args[0]}", "${args[1] || this.url}")`); break
      case 'focus-panel':  wc().focus(); await execJs(`setFocus("${args[0]}")`); break
      case 'close':        this.closeSidebar(); break
    }
    switch (cmd) {
      case 'show-panel': this.sidebarPanels.add(args[0]); this.emitUpdateState(); break
      case 'hide-panel': this.sidebarPanels.delete(args[0]); this.emitUpdateState(); break
      case 'toggle-panel': 
        if (!this.sidebarPanels.has(args[0])) {
          this.sidebarPanels.add(args[0])
        } else {
          this.sidebarPanels.delete(args[0])
        }
        this.emitUpdateState()
        break
    }
  }

  setSidebarWidth (v) {
    if (this.isSidebarActive) {
      this.sidebarWidth = clamp(v|0, 100, this.browserWindow.getContentBounds().width - 100)
      this.resize()
      sidebars.repositionOne(this)
      this.emitUpdateState({sidebarWidth: this.sidebarWidth})
    }
  }

  async captureScreenshot () {
    // capture screenshot on the root page of dat & http sites
    var urlp = parseDriveUrl(this.url)
    if (['hd:', 'http:', 'https:'].includes(urlp.protocol)) {
      try {
        // wait a sec to allow loading to finish
        await new Promise(r => setTimeout(r, 1e3))

        // capture the page
        var image = await this.browserView.webContents.capturePage()
        var orgsize = image.getSize()
        var bounds = findImageBounds(image.toBitmap(), orgsize)

        // set a minimum size of 200x160
        if (bounds.width < 200) {
          let incDiv2 = ((200 - bounds.width) / 2)|0
          bounds.left -= incDiv2
          bounds.right += incDiv2
        }
        if (bounds.height < 160) {
          let incDiv2 = ((160 - bounds.height) / 2)|0
          bounds.top -= incDiv2
          bounds.bottom += incDiv2
        }

        // give some margin
        bounds.left = Math.max(0, bounds.left - 20)
        bounds.right = Math.min(orgsize.width, bounds.right + 20)
        bounds.top = Math.max(0, bounds.top - 20)
        bounds.bottom = Math.min(orgsize.height, bounds.bottom + 20)

        // adjust the bounds to match the 100x80 aspect ratio
        if (bounds.width < bounds.height) {
          bounds.right = bounds.left + (bounds.height / 0.8)|0
        } else {
          bounds.bottom = bounds.top + (bounds.width * 0.8)|0
        }

        // ensure the bounds are still within the viewport
        if (bounds.left < 0) {
          let inc = 0 - bounds.left
          bounds.left += inc
          bounds.right += inc
        }
        if (bounds.right > orgsize.width) {
          let inc = orgsize.width - bounds.right
          bounds.left -= inc
          bounds.right -= inc
        }
        if (bounds.top < 0) {
          let inc = 0 - bounds.top
          bounds.top += inc
          bounds.bottom += inc
        }
        if (bounds.bottom > orgsize.height) {
          let inc = orgsize.height - bounds.bottom
          bounds.top -= inc
          bounds.bottom -= inc
        }

        image = image
          .crop(bounds)
          .resize({width: 200, height: 160})
        await sitedataDb.set(this.url, 'screenshot', image.toDataURL(), {dontExtractOrigin: true, normalizeUrl: true})
      } catch (e) {
        // ignore, can happen if the tab was closed during wait
        console.log('Failed to capture page screenshot', e)
      }
    }
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
    var findNext = this.currentInpageFindString === str
    this.currentInpageFindString = str
    this.webContents.findInPage(this.currentInpageFindString, {findNext, forward: dir !== -1})
  }

  moveInpageFind (dir) {
    if (!this.currentInpageFindString) return
    this.webContents.findInPage(this.currentInpageFindString, {findNext: false, forward: dir !== -1})
  }

  // alternative protocols
  // =

  async checkForHyperdriveAlternative (url) {
    return // DISABLED
/*
    let u = (new URL(url))
    // try to do a name lookup
    var siteHasDatAlternative = await hyper.dns.resolveName(u.hostname).then(
      res => Boolean(res),
      err => false
    )
    if (siteHasDatAlternative) {
      var autoRedirectToDat = !!await settingsDb.get('auto_redirect_to_dat')
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
    this.emitUpdateState()*/
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
      this.liveReloadEvents = checkoutFS.pda.watch()

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
    let isJSON = contentType.startsWith('application/json')
    let isPlainText = contentType.startsWith('text/plain')

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
      let jsonpath = path.join(app.getAppPath(), 'fg', 'json-renderer', 'index.build.js')
      jsonpath = jsonpath.replace('app.asar', 'app.asar.unpacked') // fetch from unpacked dir
      try {
        await this.webContents.executeJavaScript(await fs.readFile(jsonpath, 'utf8'))
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
    this.isBookmarked = !!(await bookmarks.get(this.url))
    if (!noEmit) {
      this.emitUpdateState()
    }
  }

  async fetchDriveInfo (noEmit = false) {
    // clear existing state
    this.peers = 0
    this.confirmedAuthorTitle = undefined
    this.donateLinkHref = null

    if (!this.url.startsWith('hd://')) {
      this.driveInfo = null
      return
    }
    
    // fetch new state
    var userSession = getUserSessionFor(this.browserWindow.webContents)
    var key
    try {
      key = await hyper.dns.resolveName(this.url)
      this.driveInfo = await hyper.drives.getDriveInfo(key)
      this.driveInfo.ident = filesystem.getDriveIdent(this.driveInfo.url)
      this.peers = this.driveInfo.peers
      this.donateLinkHref = _get(this, 'driveInfo.links.payment.0.href')
    } catch (e) {
      this.driveInfo = null
    }
    if (!noEmit) this.emitUpdateState()

    if (this.driveInfo) {
      // fetch social information if not a system drive
      if (!this.driveInfo.ident.system) {
        this.driveInfo.isFollowing = (await fsquery(filesystem.get(), {path: '/profile/follows/*', mount: key})).length !== 0
      }

      // determine the confirmed author
      if (this.driveInfo.author) {
        try {
          if (this.driveInfo.author === userSession.url) {
            this.confirmedAuthorTitle = (await users.get(userSession.url)).title
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
    if (!noEmit) this.emitUpdateState()
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

  emitUpdateState (state = undefined) {
    if (this.isHidden) return
    emitUpdateState(this.browserWindow, this, state)
  }

  onDidStartLoading (e) {
    // update state
    this.isLoading = true
    this.loadingURL = null
    this.isReceivingAssets = false
    this.wasDriveTimeout = false

    // emit
    this.emitUpdateState()
  }

  onDidStartNavigation (e, url, isInPlace, isMainFrame) {
    if (!isMainFrame) return
    var origin = toOrigin(url)

    // turn off live reloading if we're leaving the domain
    if (origin !== toOrigin(this.url)) {
      this.stopLiveReloading()
    }

    // update state
    this.loadingURL = url
    this.emitUpdateState()
  }

  async onDidNavigate (e, url, httpResponseCode) {
    // remove any active subwindows
    prompts.close(this.browserView)
    modals.close(this.browserView)

    // read zoom
    zoom.setZoomFromSitedata(this)

    // update state
    this.loadError = null
    this.loadingURL = null
    this.isReceivingAssets = true
    this.favicons = null
    await this.fetchIsBookmarked()
    await this.fetchDriveInfo()
    if (httpResponseCode === 504 && url.startsWith('hd://')) {
      this.wasDriveTimeout = true
    }
    if (httpResponseCode === 404 && this.writable && (this.driveInfo.type === 'website' || this.driveInfo.type === 'application')) {
      // prompt to create a page on 404 for owned sites
      prompts.create(this.browserView.webContents, 'create-page', {url: this.url})
    }

    // emit
    this.emitUpdateState()
  }

  onDidNavigateInPage (e) {
    this.updateHistory()
  }

  onDidStopLoading () {
    this.updateHistory()

    // update state
    this.isLoading = false
    this.loadingURL = null
    this.isReceivingAssets = false

    // check for hyperdrive alternatives
    if (this.url.startsWith('https://')) {
      this.checkForHyperdriveAlternative(this.url)
    } else {
      this.availableAlternative = ''
    }

    // run custom renderer apps
    this.injectCustomRenderers()

    // emit
    windowMenu.onSetCurrentLocation(this.browserWindow, this.url)
    this.emitUpdateState()
  }

  onDomReady (e) {
    // capture screenshot
    this.captureScreenshot()

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
      await this.webContents.executeJavaScript('document.documentElement.innerHTML = \'' + errorPageHTML + '\'')
    } catch (e) {
      // ignore
    }
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

  onNewWindow (e, url, frameName, disposition, options) {
    e.preventDefault()

    // HACK
    // calling preventDefault() without providing an alternative window currently freezes the opening tab
    // to solve this, we go ahead and create a new window but keep it hidden and destroy it immediately
    // this will cause the return value of `window.open()` to be wrong
    // -prf
    {
      let win = new BrowserWindow({
        webContents: options ? options.webContents : undefined, // use existing webContents if provided
        webPreferences: {
          sandbox: true,
          enableRemoteModule: false,
          javascript: false
        },
        show: false
      })
      win.once('ready-to-show', () => win.close())
      if (!options || !options.webContents) {
        win.loadURL(url) // existing webContents will be navigated automatically
      }
      e.newGuest = win
    }

    if (!this.isActive) return // only open if coming from the active tab
    var setActive = (disposition === 'foreground-tab' || disposition === 'new-window')
    var tabs = activeTabs[this.browserWindow.id]
    var tabIndex = tabs ? (tabs.indexOf(this) + 1) : undefined
    var newTab = create(this.browserWindow, url, {setActive, tabIndex})
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
  ipcMain.on('BEAKER_MARK_NEXT_TAB_SCRIPTCLOSEABLE', e => {
    nextTabIsScriptCloseable = true
    e.returnValue = true
  })
  ipcMain.on('BEAKER_SCRIPTCLOSE_SELF', e => {
    var browserView = BrowserView.fromWebContents(e.sender)
    if (browserView) {
      var tab = findTab(browserView)
      if (tab && tab.isScriptClosable) {
        remove(tab.browserWindow, tab)
        e.returnValue = true
        return
      }
    }
    e.returnValue = false
  })

  // track peer-counts
  function iterateTabs (cb) {
    for (let winId in activeTabs) {
      for (let tab of activeTabs[winId]) {
        cb(tab)
      }
    }
  }
  hyper.drives.on('updated', ({details}) => {
    iterateTabs(tab => {
      if (tab.driveInfo && tab.driveInfo.url === details.url) {
        tab.refreshState()
      }
    })
  })
  hyper.drives.on('network-changed', ({details}) => {
    iterateTabs(tab => {
      if (tab.driveInfo && tab.driveInfo.url === details.url) {
        // update peer count
        tab.peers = details.connections
        tab.emitUpdateState()
      }
      if (tab.wasDriveTimeout && tab.url.startsWith(details.url)) {
        // refresh if this was a timed-out hyperdrive site (peers have been found)
        tab.webContents.reload()
      }
    })
  })
}

export function getAll (win) {
  win = getTopWindow(win)
  return activeTabs[win.id] || []
}

export function getByIndex (win, index) {
  win = getTopWindow(win)
  if (index === 'active') return getActive(win)
  return getAll(win)[index]
}

export function getIndexOfTab (win, tab) {
  win = getTopWindow(win)
  return getAll(win).indexOf(tab)
}

export function getAllPinned (win) {
  win = getTopWindow(win)
  return getAll(win).filter(p => p.isPinned)
}

export function getActive (win) {
  win = getTopWindow(win)
  return getAll(win).find(tab => tab.isActive)
}

export function findTab (browserView) {
  for (let winId in activeTabs) {
    for (let tab of activeTabs[winId]) {
      if (tab.browserView === browserView) {
        return tab
      }
      if (tab.isSidebarActive && sidebars.get(tab) === browserView) {
        return tab
      }
    }
  }
}

export function findContainingWindow (browserView) {
  for (let winId in activeTabs) {
    for (let v of activeTabs[winId]) {
      if (v.browserView === browserView) {
        return v.browserWindow
      }
    }
  }
  for (let winId in preloadedNewTabs) {
    if (preloadedNewTabs[winId].browserView === browserView) {
      return preloadedNewTabs[winId].browserWindow
    }
  }
}

export function create (
    win,
    url,
    opts = {
      setActive: false,
      isPinned: false,
      focusLocationBar: false,
      tabIndex: undefined,
      sidebarPanels: undefined
    }
  ) {
  url = url || DEFAULT_URL
  win = getTopWindow(win)
  var tabs = activeTabs[win.id] = activeTabs[win.id] || []

  var tab
  var preloadedNewTab = preloadedNewTabs[win.id]
  var loadWhenReady = false
  if (url === DEFAULT_URL && !opts.isPinned && preloadedNewTab) {
    // use the preloaded tab
    tab = preloadedNewTab
    tab.isHidden = false // no longer hidden
    preloadedNewTab = preloadedNewTabs[win.id] = null
  } else {
    // create a new tab
    tab = new Tab(win, {isPinned: opts.isPinned})
    // tab.loadURL(url)
    loadWhenReady = true
  }

  // add to active tabs
  if (opts.isPinned) {
    tabs.splice(indexOfLastPinnedTab(win), 0, tab)
  } else {
    if (typeof opts.tabIndex !== 'undefined' && opts.tabIndex !== -1) {
      tabs.splice(opts.tabIndex, 0, tab)
    } else {
      tabs.push(tab)
    }
  }
  if (loadWhenReady) {
    // NOTE
    // `loadURL()` triggers some events (eg app.on('web-contents-created'))
    // which need to be handled *after* the tab is added to the listing
    // thus this `loadWhenReady` logic
    // -prf
    tab.loadURL(url)
  }

  // make active if requested, or if none others are
  if (opts.setActive || !getActive(win)) {
    setActive(win, tab)
  }
  emitReplaceState(win)

  if (opts.focusLocationBar) {
    win.webContents.send('command', 'focus-location')
  }
  if (opts.sidebarPanels) {
    for (let p of opts.sidebarPanels) {
      tab.executeSidebarCommand('show-panel', p)
    }
  }

  // create a new preloaded tab if needed
  if (!preloadedNewTab) {
    preloadedNewTabs[win.id] = preloadedNewTab = new Tab(win, {isHidden: true})
    preloadedNewTab.loadURL(DEFAULT_URL)
  }

  return tab
}

export async function remove (win, tab) {
  win = getTopWindow(win)
  // find
  var tabs = getAll(win)
  var i = tabs.indexOf(tab)
  if (i == -1) {
    return console.warn('tab-manager remove() called for missing tab', tab)
  }

  // give the 'onbeforeunload' a chance to run
  var onBeforeUnloadReturnValue = await fireBeforeUnloadEvent(tab.webContents)
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
  closedURLs[win.id].push(tab.url)

  // set new active if that was
  if (tab.isActive && tabs.length > 1) {
    setActive(win, tabs[i + 1] || tabs[i - 1])
  }

  // remove
  tab.stopLiveReloading()
  tabs.splice(i, 1)
  tab.destroy()

  // persist pins w/o this one, if that was
  if (tab.isPinned) {
    savePins(win)
  }

  // close the window if that was the last tab
  if (tabs.length === 0) {
    return win.close()
  }

  // emit
  emitReplaceState(win)
}

export async function removeAllExcept (win, tab) {
  win = getTopWindow(win)
  var tabs = getAll(win).slice() // .slice() to duplicate the list
  for (let t of tabs) {
    if (t !== tab) {
      await remove(win, t)
    }
  }
}

export async function removeAllToRightOf (win, tab) {
  win = getTopWindow(win)
  var toRemove = []
  var tabs = getAll(win)
  let index = tabs.indexOf(tab)
  for (let i = 0; i < tabs.length; i++) {
    if (i > index) toRemove.push(tabs[i])
  }
  for (let t of toRemove) {
    await remove(win, t)
  }
}

export function setActive (win, tab) {
  win = getTopWindow(win)
  if (typeof tab === 'number') {
    tab = getByIndex(win, tab)
  }
  if (!tab) return

  // deactivate the old tab
  var active = getActive(win)
  if (active) {
    active.deactivate()
    lastSelectedTabIndex[win.id] = getAll(win).indexOf(active)
  }

  // activate the new tab
  tab.activate()
  windowMenu.onSetCurrentLocation(win, tab.url) // give the window-menu a chance to handle the change
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

export async function popOutTab (tab) {
  var newWin = createShellWindow()
  await new Promise(r => newWin.once('custom-pages-ready', r))
  transferTabToWindow(tab, newWin)
  removeAllExcept(newWin, tab)
}

export function transferTabToWindow (tab, targetWindow) {
  var sourceWindow = tab.browserWindow

  // find
  var sourceTabs = getAll(sourceWindow)
  var i = sourceTabs.indexOf(tab)
  if (i == -1) {
    return console.warn('tab-manager transferTabToWindow() called for missing tab', tab)
  }

  // remove
  var shouldCloseSource = false
  sourceTabs.splice(i, 1)
  if (tab.isPinned) savePins(sourceWindow)
  if (sourceTabs.length === 0) {
    shouldCloseSource = true
  } else {
    if (tab.isActive) {
      // console.log('changing active', (sourceTabs[i + 1] || sourceTabs[i - 1]).url)
      // setActive(sourceWindow, sourceTabs[i + 1] || sourceTabs[i - 1])
      changeActiveToLast(sourceWindow)
    }
    emitReplaceState(sourceWindow)
  }

  // transfer to the new window
  tab.transferWindow(targetWindow)
  var targetTabs = getAll(targetWindow)
  if (tab.isPinned) {
    targetTabs.splice(indexOfLastPinnedTab(targetWindow), 0, tab)
    savePins(targetWindow)
  } else {
    targetTabs.push(tab)
  }
  emitReplaceState(targetWindow)

  if (shouldCloseSource) {
    sourceWindow.close()
  }
}

export function togglePinned (win, tab) {
  win = getTopWindow(win)
  // move tab to the "end" of the pinned tabs
  var tabs = getAll(win)
  var oldIndex = tabs.indexOf(tab)
  var newIndex = indexOfLastPinnedTab(win)
  if (oldIndex < newIndex) newIndex--
  tabs.splice(oldIndex, 1)
  tabs.splice(newIndex, 0, tab)

  // update tab state
  tab.isPinned = !tab.isPinned
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
    var tab = create(win, url)
    setActive(win, tab)
    return tab
  }
}

export function reorder (win, oldIndex, newIndex) {
  win = getTopWindow(win)
  if (oldIndex === newIndex) {
    return
  }
  var tabs = getAll(win)
  var tab = getByIndex(win, oldIndex)
  tabs.splice(oldIndex, 1)
  tabs.splice(newIndex, 0, tab)
  emitReplaceState(win)
}

export function changeActiveBy (win, offset) {
  win = getTopWindow(win)
  var tabs = getAll(win)
  var active = getActive(win)
  if (tabs.length > 1) {
    var i = tabs.indexOf(active)
    if (i === -1) { return console.warn('Active page is not in the pages list! THIS SHOULD NOT HAPPEN!') }

    i += offset
    if (i < 0) i = tabs.length - 1
    if (i >= tabs.length) i = 0

    setActive(win, tabs[i])
  }
}

export function changeActiveTo (win, index) {
  win = getTopWindow(win)
  var tabs = getAll(win)
  if (index >= 0 && index < tabs.length) {
    setActive(win, tabs[index])
  }
}

export function changeActiveToLast (win) {
  win = getTopWindow(win)
  var tabs = getAll(win)
  setActive(win, tabs[tabs.length - 1])
}

export function getPreviousTabIndex (win) {
  var index = lastSelectedTabIndex[win.id]
  if (typeof index !== 'number') return 0
  if (index < 0 || index >= getAll(win).length) return 0
  return index
}

export function openOrFocusDownloadsPage (win) {
  win = getTopWindow(win)
  var tabs = getAll(win)
  var downloadsTab = tabs.find(v => v.url.startsWith('beaker://downloads'))
  if (!downloadsTab) {
    downloadsTab = create(win, 'beaker://downloads')
  }
  setActive(win, downloadsTab)
}

export function emitReplaceState (win) {
  win = getTopWindow(win)
  var state = {tabs: getWindowTabState(win), isFullscreen: win.isFullScreen(), isShellInterfaceHidden: win.isShellInterfaceHidden}
  emit(win, 'replace-state', state)
  win.emit('custom-pages-updated', takeSnapshot(win))
}

export function emitUpdateState (win, tab, state = undefined) {
  win = getTopWindow(win)
  var index = typeof tab === 'number' ? tab : getAll(win).indexOf(tab)
  if (index === -1) {
    console.warn('WARNING: attempted to update state of a tab not on the window')
    return
  }
  state = state || getByIndex(win, index).state
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
    tab = getByIndex(win, tab)
    if (tab) {
      tab.refreshState()
    }
  },

  async getState () {
    var win = getWindow(this.sender)
    return getWindowTabState(win)
  },

  async getTabState (tab, opts) {
    var win = getWindow(this.sender)
    tab = getByIndex(win, tab)
    if (tab) {
      var state = Object.assign({}, tab.state)
      if (opts) {
        if (opts.driveInfo) state.driveInfo = tab.driveInfo
        if (opts.networkStats) state.networkStats = tab.driveInfo ? tab.driveInfo.networkStats : {}
        if (opts.sitePerms) state.sitePerms = await sitedataDb.getPermissions(tab.url)
      }
      return state
    }
  },

  async getNetworkState (tab) {
    var win = getWindow(this.sender)
    tab = getByIndex(win, tab)
    if (tab && tab.driveInfo) {
      var networkStats = await hyper.drives.getDriveNetworkStats(tab.driveInfo.key)
      return {
        peers: tab.peers,
        networkStats
      }
    }
  },

  async getPageMetadata (tab) {
    var win = getWindow(this.sender)
    tab = getByIndex(win, tab)
    if (tab) return tab.getPageMetadata()
    return {}
  },

  async createTab (url, opts = {focusLocationBar: false, setActive: false, addToNoRedirects: false}) {
    if (opts.addToNoRedirects) {
      addToNoRedirects(url)
    }

    var win = getWindow(this.sender)
    var tab = create(win, url, opts)
    return getAll(win).indexOf(tab)
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
    var tab = getByIndex(win, index)
    var menu = Menu.buildFromTemplate([
      { label: (tab.isPinned) ? 'Unpin Tab' : 'Pin Tab', click: () => togglePinned(win, tab) },
      { label: 'Pop Out Tab', click: () => popOutTab(tab) },
      { label: 'Duplicate Tab', click: () => create(win, tab.url) },
      { label: (tab.isAudioMuted) ? 'Unmute Tab' : 'Mute Tab', click: () => tab.toggleMuted() },
      { type: 'separator' },
      { label: 'Close Tab', click: () => remove(win, tab) },
      { label: 'Close Other Tabs', click: () => removeAllExcept(win, tab) },
      { label: 'Close Tabs to the Right', click: () => removeAllToRightOf(win, tab) },
      { type: 'separator' },
      { label: 'New Tab', click: () => create(win, null, {setActive: true}) },
      { label: 'Reopen Closed Tab', click: () => reopenLastRemoved(win) }
    ])
    menu.popup()
  },

  async showLocationBarContextMenu (index) {
    var win = getWindow(this.sender)
    var tab = getByIndex(win, index)
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
      tab.loadURL(url)
    }
  },

  async showNavbarShortcutContextMenu (index) {
    var win = getWindow(this.sender)
    var tab = getByIndex(win, index)
    var fsUrl = filesystem.get().url
    var menu = Menu.buildFromTemplate([
      { label: 'Start Page', click: () => tab.loadURL('beaker://desktop/') },
      { label: 'My Home Drive', click: () => tab.loadURL(fsUrl) },
      { label: 'My Profile', click: () => tab.loadURL(`${fsUrl}/profile`) }
    ])
    menu.popup({window: win})
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

  async toggleLiveReloading (index, enabled) {
    getByIndex(getWindow(this.sender), index).toggleLiveReloading(enabled)
  },

  async executeSidebarCommand (index, ...args) {
    getByIndex(getWindow(this.sender), index).executeSidebarCommand(...args)
  },

  async toggleDevTools (index) {
    getByIndex(getWindow(this.sender), index).webContents.toggleDevTools()
  },

  async print (index) {
    getByIndex(getWindow(this.sender), index).webContents.print()
  },

  async toggleFollowing (index) {
    var tab = getByIndex(getWindow(this.sender), index)
    if (!tab.driveInfo) return

    var fs = filesystem.get()
    if (!tab.isFollowing) {
      let name = await filesystem.getAvailableName('/profile/follows', slugify(tab.driveInfo.title || 'anonymous').toLowerCase())
      await fs.pda.mount(`/profile/follows/${name}`, tab.driveInfo.url)
    } else {
      let mount = await fsquery(fs, {path: '/profile/follows/*', mount: tab.driveInfo.url})
      if (mount[0]) {
        await fs.pda.unmount(mount[0].path)
      }
    }
    await tab.fetchDriveInfo()
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

  async toggleSiteInfo (opts) {
    await siteInfo.toggle(getWindow(this.sender), opts)
  },

  async focusShellWindow () {
    getWindow(this.sender).webContents.focus()
  },

  async onFaviconLoadSuccess (index, dataUrl) {
    var tab = getByIndex(getWindow(this.sender), index)
    if (tab) {
      // if not a hyperdrive site, store the favicon
      // (hyperdrive caches favicons through the hyperdrive/assets.js process)
      if (!tab.url.startsWith('hd:')) {
        sitedataDb.set(tab.url, 'favicon', dataUrl)
      }
    }
  },

  async onFaviconLoadError (index) {
    var tab = getByIndex(getWindow(this.sender), index)
    if (tab) {
      tab.favicons = null
      tab.emitUpdateState()
    }
  }
})

// internal methods
// =

function getWindow (sender) {
  return findWebContentsParentWindow(sender)
}

// helper ensures that if a subwindow is called, we use the parent
function getTopWindow (win) {
  if (!(win instanceof BrowserWindow)) {
    return findWebContentsParentWindow(win)
  }
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
  return getAll(win).map(tab => tab.state)
}

function indexOfLastPinnedTab (win) {
  var tabs = getAll(win)
  var index = 0
  for (index; index < tabs.length; index++) {
    if (!tabs[index].isPinned) break
  }
  return index
}

function toOrigin (str) {
  try {
    var u = new URL(str)
    return u.protocol + '//' + u.hostname + (u.port ? `:${u.port}` : '')
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

// `nextTabIsScriptCloseable` is set by a message received prior to window.open() being called
// we capture the state of the flag on the next created tab, then reset it
function takeIsScriptClosable () {
  var b = nextTabIsScriptCloseable
  nextTabIsScriptCloseable = false
  return b
}