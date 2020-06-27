/* globals customElements */
import { ipcRenderer } from 'electron'
import { LitElement, html, css } from '../../vendor/lit-element/lit-element'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import prettyHash from 'pretty-hash'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'
import tooltipCSS from './tooltip.css'
import './site-info'

const isDatHashRegex = /^[a-z0-9]{64}/i
const NETWORK_STATS_POLL_INTERVAL = 5000 // ms

class NavbarLocation extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      url: {type: String},
      title: {type: String},
      siteTitle: {type: String},
      siteSubtitle: {type: String},
      siteIcon: {type: String},
      siteTrust: {type: String},
      driveDomain: {type: String},
      isSystemDrive: {type: Boolean, attribute: 'is-system-drive'},
      writable: {type: Boolean},
      folderSyncPath: {type: String, attribute: 'folder-sync-path'},
      peers: {type: Number},
      zoom: {type: Number},
      loadError: {type: Object},
      donateLinkHref: {type: String, attribute: 'donate-link-href'},
      isLiveReloading: {type: Boolean, attribute: 'is-live-reloading'},
      isShareMenuOpen: {type: Boolean},
      isPeersMenuOpen: {type: Boolean},
      isSiteMenuOpen: {type: Boolean},
      isDonateMenuOpen: {type: Boolean},
      isBookmarked: {type: Boolean, attribute: 'is-bookmarked'},
      isLocationFocused: {type: Boolean},
      hasExpanded: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.url = ''
    this.title = ''
    this.siteTitle = ''
    this.siteSubtitle = ''
    this.siteIcon = ''
    this.siteTrust = ''
    this.driveDomain = ''
    this.isSystemDrive = false
    this.writable = false
    this.folderSyncPath = undefined
    this.peers = 0
    this.zoom = 0
    this.loadError = null
    this.donateLinkHref = false
    this.isShareMenuOpen = false
    this.isPeersMenuOpen = false
    this.isSiteMenuOpen = false
    this.isDonateMenuOpen = false
    this.isBookmarked = false
    this.isLocationFocused = false
    this.hasExpanded = false
    this.shouldSelectAllOnFocus = false

    setInterval(async () => {
      if (!this.url.startsWith('hyper://')) return
      var state = await bg.views.getNetworkState('active')
      this.peers = state ? state.peers : 0
      this.requestUpdate()
    }, NETWORK_STATS_POLL_INTERVAL)

    // listen for commands from the main process
    ipcRenderer.on('command', this.onCommand.bind(this))
  }

  get isBeaker () {
    return this.url.startsWith('beaker://')
  }

  get isHyperdrive () {
    return this.url.startsWith('hyper://')
  }

  get modifiedUrl () {
    var url = this.url
    if (url.startsWith('beaker://desktop')) {
      url = ''
    } else if (url.includes('://')) {
      try {
        let urlp = (new URL(url))
        url = urlp.pathname + urlp.search + urlp.hash
      } catch (e) {
        // ignore, malformed URL
      }
    }
    return url
  }

  focusLocation () {
    this.shouldSelectAllOnFocus = true
    var input = this.shadowRoot.querySelector('.input-container input')
    input.focus()
    bg.views.focusShellWindow()
  }

  unfocusLocation () {
    var input = this.shadowRoot.querySelector('.input-container input')
    input.blur()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <shell-window-navbar-site-info
        url=${this.url}
        siteTitle=${this.siteTitle}
        siteSubtitle="${this.siteSubtitle}"
        siteIcon=${this.siteIcon}
        siteTrust=${this.siteTrust}
        driveDomain=${this.driveDomain}
        ?writable=${this.writable}
        .loadError=${this.loadError}
        ?hide-origin=${this.hasExpanded}
        ?rounded=${this.url.startsWith('beaker://desktop')}
      >
      </shell-window-navbar-site-info>
      ${this.renderLocation()}
      ${this.renderZoom()}
      ${this.renderDatConverterBtn()}
      ${this.renderLiveReloadingBtn()}
      ${this.renderFolderSyncBtn()}
      ${this.renderPeers()}
      ${this.renderSiteBtn()}
      ${this.renderDonateBtn()}
      ${''/* DISABLED this.renderShareBtn()*/}
      ${this.renderBookmarkBtn()}
    `
  }

  renderLocation () {
    return html`
      <div class="input-container" @contextmenu=${this.onContextMenuLocation}>
        <input
          type="text"
          value="${this.modifiedUrl}"
          placeholder="Search or enter your address here"
          @focus=${this.onFocusLocation}
          @blur=${this.onBlurLocation}
          @input=${this.onInputLocation}
          @keydown=${this.onKeydownLocation}
        >
        ${this.isLocationFocused ? '' : this.renderInputPretty()}
      </div>
    `
  }

  renderInputPretty () {
    if (this.url.startsWith('beaker://desktop')) {
      return html`
        <div class="input-pretty" @mouseup=${this.onClickLocation}>
          <span class="syntax">Search or enter your address here</span>
        </div>
      `
    }
    if (/^(hyper|http|https|beaker|dat):\/\//.test(this.url)) {
      try {
        var { protocol, host, pathname, search, hash } = new URL(this.url)
        // TODO just show path?
        // return html`
        //   <div class="input-pretty">
        //     <span class="path">${pathname}${search}${hash}</span>
        //   </div>
        // `
        var hostVersion
        if (protocol === 'hyper:') {
          let match = /(.*)\+(.*)/.exec(host)
          if (match) {
            host = match[1]
            hostVersion = '+' + match[2]
          }
          if (isDatHashRegex.test(host)) {
            host = prettyHash(host)
          }
        }
        var cls = 'protocol'
        // if (['beaker:'].includes(protocol)) cls += ' protocol-trusted'
        // if (['https:'].includes(protocol) && !this.loadError) cls += ' protocol-trusted'
        if (['https:'].includes(protocol) && this.loadError && this.loadError.isInsecureResponse) cls += ' protocol-untrusted'
        // if (['dat:'].includes(protocol)) cls += ' protocol-trusted'
        // if (['beaker:'].includes(protocol)) cls += ' protocol-trusted'
        return html`
          <div class="input-pretty" @mouseup=${this.onClickLocation}>
            ${''/*<span class=${cls}>${protocol.slice(0, -1)}</span><span class="syntax">://</span><span class="host">${host}</span>*/}
            <span class="path">${pathname}${search}${hash}</span>
          </div>
        `
      } catch (e) {
        // invalid URL, fallback to default
      }
    }
    return html`
      <div class="input-pretty" @mouseup=${this.onClickLocation}>${this.url}</div>
    `
  }

  renderZoom () {
    if (this.zoom === 0) return ''
    var zoomPct = ({
      '-0.5': 90,
      '-1': 75,
      '-1.5': 67,
      '-2': 50,
      '-2.5': 33,
      '-3': 25,
      '0': 100,
      '0.5': 110,
      '1': 125,
      '1.5': 150,
      '2': 175,
      '2.5': 200,
      '3': 250,
      '3.5': 300,
      '4': 400,
      '4.5': 500
    })[this.zoom]
    return html`
      <button @click=${this.onClickZoom} title="Zoom: ${zoomPct}%" class="zoom">
        ${zoomPct}%
      </button>
    `
  }

  renderDatConverterBtn () {
    if (this.url.startsWith('dat:')) {
      return html`
        <button class="dat-converter" title="Convert to Hyperdrive" @click=${this.onClickConvertDat}>
          Convert this site to Hyperdrive
        </button>
      `
    }
    return ''
  }

  renderLiveReloadingBtn () {
    if (!this.isLiveReloading) {
      return ''
    }
    return html`
      <button class="live-reload" @click=${this.onClickLiveReloadingBtn} title="Live reloading enabled">
        <i class="fa fa-bolt"></i>
      </button>
    `
  }

  renderFolderSyncBtn () {
    if (!this.folderSyncPath) {
      return ''
    }
    var cls = classMap({'folder-sync': true})
    return html`
      <button class=${cls} @click=${this.onClickFolderSyncBtn} title="Folder Sync">
        <i class="fas fa-sync"></i>
        <i class="far fa-folder-open"></i>
      </button>
    `
  }

  renderDonateBtn () {
    if (!this.donateLinkHref) {
      return ''
    }
    var cls = classMap({donate: true, pressed: this.isDonateMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickDonateMenu}>
        <i class="fa fa-donate"></i>
      </button>
    `
  }

  renderPeers () {
    if (!this.isHyperdrive) {
      return ''
    }
    var cls = classMap({peers: true, pressed: this.isPeersMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickPeersMenu}>
        <span class="fas fa-share-alt"></span> ${this.peers}
      </button>
    `
  }

  renderBookmarkBtn () {
    return html`
      <button
        class="bookmark tooltip-left"
        @click=${this.onClickBookmark}
        data-tooltip="Bookmark this page"
        title="Bookmark this page"
      >
        <span class="${this.isBookmarked ? 'fas' : 'far'} fa-star"></span>
      </button>
    `
  }

  renderShareBtn () {
    var cls = classMap({share: true, pressed: this.isShareMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickShareMenu}>
        <i class="fas fa-share-square"></i>
      </button>
    `
  }

  renderSiteBtn () {
    var cls = classMap({site: true, pressed: this.isSiteMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickSiteMenu}>
        <i class="fas fa-angle-down"></i>
      </button>
    `
  }

  // events
  // =

  onCommand (e, cmd) {
    if (cmd === 'create-bookmark') {
      this.onClickBookmark()
    }
    if (cmd === 'focus-location') {
      this.focusLocation()
    }
    if (cmd === 'unfocus-location') {
      this.unfocusLocation()
    }
  }

  onContextMenuLocation (e) {
    e.preventDefault()
    e.stopPropagation()
    if (!this.isLocationFocused) {
      this.focusLocation()
    }
    bg.views.showLocationBarContextMenu('active')
  }

  onClickLocation (e) {
    e.preventDefault()
    this.focusLocation()
  }

  async onFocusLocation (e) {
    var input = e.currentTarget
    if (!this.url.startsWith('beaker://desktop')) {
      input.value = this.url
      this.hasExpanded = true
    } else {
      input.value = ''
    }
    this.isLocationFocused = true
    await this.requestUpdate()
    if (this.shouldSelectAllOnFocus) {
      input.setSelectionRange(0, input.value.length)
      this.shouldSelectAllOnFocus = false
    }
  }

  onBlurLocation (e) {
    // clear the selection range so that the next focusing doesnt carry it over
    window.getSelection().empty()
    this.shadowRoot.querySelector('.input-container input').value = this.url // reset value
    this.isLocationFocused = false
    this.hasExpanded = false

    // HACK
    // Sometimes the input is blurred by the user clicking on a separate webContents (eg the current page).
    // For some reason, this correctly triggers the blur event (this function) but it does not put the
    // input into a fully blurred state. I assume it's similar to when you click out of a browser window
    // when an input is focused, it maintains some amount of "focused" state for when you focus the browser
    // window again. We explicitly blur it here to fully enter blurred state.
    // -prf
    this.shadowRoot.querySelector('.input-container input').blur()
  }

  onInputLocation (e) {
    var rect = this.getClientRects()[0]
    var value = e.currentTarget.value
    var selectionStart = e.currentTarget.selectionStart
    bg.views.runLocationBarCmd('set-value', {
      bounds: {
        x: rect.left|0,
        y: (rect.top|0) - 2,
        width: rect.width|0
      },
      value,
      selectionStart
    })
    e.currentTarget.blur()
  }

  onKeydownLocation (e) {
    if (e.key === 'Enter') {
      bg.views.reload('active')
      e.currentTarget.blur()
    }
  }

  onClickZoom (e) {
    bg.views.resetZoom(this.activeTabIndex)
  }

  onClickConvertDat (e) {
    var { host } = new URL(this.url)
    bg.beakerBrowser.convertDat(host)
  }

  onClickLiveReloadingBtn (e) {
    bg.views.toggleLiveReloading('active')
    this.isLiveReloading = false
  }

  async onClickFolderSyncBtn () {
    bg.folderSync.syncDialog(this.url)
  }

  async onClickShareMenu (e) {
    this.isShareMenuOpen = true
    var rect = this.shadowRoot.querySelector('.share').getClientRects()[0]
    await bg.views.toggleMenu('share', {
      bounds: {rightOffset: (window.innerWidth - rect.right)|0},
      params: {url: this.url}
    })
    this.isShareMenuOpen = false
  }

  async onClickDonateMenu (e) {
    this.isDonateMenuOpen = true
    var rect = e.currentTarget.getClientRects()[0]
    await bg.views.toggleMenu('donate', {
      bounds: {rightOffset: (window.innerWidth - rect.right)|0},
      params: {url: this.url}
    })
    this.isDonateMenuOpen = false
  }

  async onClickBookmark () {
    var rect = this.shadowRoot.querySelector('.bookmark').getClientRects()[0]
    // show menu
    bg.views.toggleMenu('bookmark', {
      bounds: {rightOffset: (window.innerWidth - rect.right)|0},
      params: {
        url: this.url,
        metadata: {title: this.title}
      }
    })
  }

  async onClickPeersMenu () {
    if (Date.now() - (this.lastPeersMenuClick||0) < 100) {
      return
    }
    this.isPeersMenuOpen = true
    var rect = this.shadowRoot.querySelector('.peers').getClientRects()[0]
    // show menu
    await bg.views.toggleMenu('peers', {
      bounds: {rightOffset: (window.innerWidth - rect.right)|0},
      params: {
        url: this.url
      }
    })
    this.isPeersMenuOpen = false
    this.lastPeersMenuClick = Date.now()
  }

  async onClickSiteMenu () {
    if (Date.now() - (this.lastSiteMenuClick||0) < 100) {
      return
    }
    this.isSiteMenuOpen = true
    var rect = this.shadowRoot.querySelector('.site').getClientRects()[0]
    // show menu
    await bg.views.toggleMenu('site', {
      bounds: {rightOffset: (window.innerWidth - rect.right)|0},
      params: {
        url: this.url
      }
    })
    this.isSiteMenuOpen = false
    this.lastSiteMenuClick = Date.now()
  }
}
NavbarLocation.styles = [buttonResetCSS, tooltipCSS, css`
:host {
  display: flex;
  flex: 1;
  background: var(--bg-color--location-input);
  border: 1px solid var(--border-color--location-input);
  border-radius: 16px;
  padding-right: 8px;
  user-select: none;
}

:host(.trusted) {
  border: 1px solid var(--border-color--location-input--trusted);
}

:host(.untrusted) {
  border: 1px solid var(--border-color--location-input--untrusted);
}

button {
  width: 27px;
  border-radius: 0;
  color: var(--text-color--location-btn);
}

button.text {
  width: auto;
  padding: 0 4px;
  font-size: 11px;
}

button .fa,
button .far,
button .fas {
  font-size: 15px;
}

button.text .fas,
button.text .far {
  font-size: 13px;
}

button.text .fa-info-circle {
  font-size: 14px;
}

button.bookmark .fa-star {
  font-size: 14px;
}

button.bookmark .fas.fa-star {
  color: var(--text-color--location-bookmark--pressed);
}

button .fa-link {
  font-size: 14px;
}

button.zoom {
  width: auto;
  font-size: 11px;
  line-height: 10px;
  background: var(--bg-color--location-zoom);
  border-radius: 10px;
  margin: 4px;
  padding: 0 9px;
  border: 1px solid var(--border-color--location-zoom);
  font-weight: 500;
}

button.zoom:hover {
  background: var(--bg-color--location-zoom--hover);
}

button.dat-converter {
  width: auto;
  font-size: 13px;
  line-height: 23px;
  background: var(--bg-color--location-dat-convert-btn);
  border-radius: 5px;
  margin: 2px;
  padding: 0 9px;
  font-weight: 500;
  color: var(--text-color--location-dat-convert-btn);
}

button.dat-converter:hover {
  cursor: pointer;
  background: var(--bg-color--location-dat-convert-btn--hover);
}

button.live-reload {
  width: 24px;
}

button.live-reload .fa {
  font-size: 14px;
  color: var(--text-color--location-live-reload-btn);
  -webkit-text-stroke: 1px var(--text-stroke-color--location-live-reload-btn);
  text-shadow: 0 0 8px var(--text-shadow-color--location-live-reload-btn);
  animation: bolt-glow 2s infinite linear;
}

@keyframes bolt-glow {
  0% { text-shadow: 0 0 8px var(--text-shadow-color--location-live-reload-btn); }
  50% { text-shadow: 0 0 0px var(--text-shadow-color--location-live-reload-btn); }
  100% { text-shadow: 0 0 8px var(--text-shadow-color--location-live-reload-btn); }
}

button.folder-sync {
  width: 40px;
}

button.folder-sync .fa-sync {
  font-size: 8px;
  position: relative;
  top: -3px;
}

.input-container {
  position: relative;
  flex: 1;
  margin: 0 6px;
}

.input-pretty,
input {
  position: absolute;
  left: 0;
  top: 0;

  box-sizing: border-box;
  border: 0;
  padding: 0;

  width: 100%;
  height: 26px;
  overflow: hidden;

  color: var(--text-color--location-input);
  background: var(--bg-color--location-input);
  font-size: 12.5px;
  line-height: 27px;
  font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 400;
  letter-spacing: 0.5px;
}

input:focus {
  outline: 0;
}

input::-webkit-input-placeholder {
  font-weight: 400;
}

.input-pretty {
  z-index: 1;
  text-overflow: ellipsis;
  cursor: text;
}

.input-pretty .protocol {
  color: var(--text-color--location-input--light);
}

.input-pretty .protocol-trusted {
  color: var(--text-color--cert--trusted);
}

.input-pretty .protocol-untrusted {
  color: var(--text-color--cert--untrusted);
}

.input-pretty .host-version,
.input-pretty .syntax,
.input-pretty .path {
  color: var(--text-color--location-input--light);
  white-space: nowrap;
  font-weight: 400;
}

.peers {
  letter-spacing: 0.5px;
  height: 27px;
  line-height: 27px;
  width: auto;
  min-width: 32px;
  padding: 0 5px;
  font-size: 13px;
}

.peers .fas {
  font-size: 11px;
  position: relative;
  top: -1px;
}
`]
customElements.define('shell-window-navbar-location', NavbarLocation)
