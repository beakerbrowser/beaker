/* globals customElements */
import { ipcRenderer } from 'electron'
import { LitElement, html, css } from '../../vendor/lit-element/lit-element'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import prettyHash from 'pretty-hash'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'
import { joinPath } from '../../../lib/strings'
import './site-info'

const isDatHashRegex = /^[a-z0-9]{64}/i

class NavbarLocation extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      url: {type: String},
      title: {type: String},
      siteTitle: {type: String},
      datDomain: {type: String},
      writable: {type: Boolean},
      peers: {type: Number},
      zoom: {type: Number},
      loadError: {type: Object},
      donateLinkHref: {type: String, attribute: 'donate-link-href'},
      availableAlternative: {type: String, attribute: 'available-alternative'},
      isLiveReloading: {type: Boolean, attribute: 'is-live-reloading'},
      isShareMenuOpen: {type: Boolean},
      isDonateMenuOpen: {type: Boolean},
      isBookmarked: {type: Boolean, attribute: 'is-bookmarked'},
      isLocationFocused: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.url = ''
    this.title = ''
    this.siteTitle = ''
    this.datDomain = ''
    this.writable = false
    this.peers = 0
    this.zoom = 0
    this.loadError = null
    this.donateLinkHref = false
    this.availableAlternative = ''
    this.isShareMenuOpen = false
    this.isDonateMenuOpen = false
    this.isBookmarked = false
    this.isLocationFocused = false
    this.hasExpanded = false

    // listen for commands from the main process
    ipcRenderer.on('command', this.onCommand.bind(this))
  }

  get isBeaker () {
    return this.url.startsWith('beaker://')
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
    var input = this.shadowRoot.querySelector('.input-container input')
    input.focus()
    bg.views.focusShellWindow() // focus the shell-window UI
    input.setSelectionRange(0, input.value.length)
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
        datDomain=${this.datDomain}
        ?writable=${this.writable}
        peers=${this.peers}
        .loadError=${this.loadError}
      >
      </shell-window-navbar-site-info>
      ${this.renderLocation()}
      ${this.renderZoom()}
      ${this.renderLiveReloadingBtn()}
      ${this.renderAvailableAlternativeBtn()}
      ${this.renderDonateBtn()}
      ${this.renderShareBtn()}
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
    if (/^(hd|http|https|beaker):\/\//.test(this.url)) {
      try {
        var { protocol, host, pathname, search, hash } = new URL(this.url)
        // TODO just show path?
        // return html`
        //   <div class="input-pretty">
        //     <span class="path">${pathname}${search}${hash}</span>
        //   </div>
        // `
        var hostVersion
        if (protocol === 'hd:') {
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
        // if (['beaker:'].includes(protocol)) cls += ' protocol-secure'
        // if (['https:'].includes(protocol) && !this.loadError) cls += ' protocol-secure'
        if (['https:'].includes(protocol) && this.loadError && this.loadError.isInsecureResponse) cls += ' protocol-insecure'
        // if (['dat:'].includes(protocol)) cls += ' protocol-secure'
        // if (['beaker:'].includes(protocol)) cls += ' protocol-secure'
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

  renderAvailableAlternativeBtn () {
    const aa = this.availableAlternative
    if (aa === 'dat:') {
      return html`
        <button class="available-alternative" title="Go to Dat Version of this Site" @click=${this.onClickAvailableAlternative}>
          P2P version available
        </button>
      `
    }
    if (aa === 'http:' || aa === 'https:') {
      return html`
        <button class="available-alternative" title="Go to HTTP/S Version of this Site" @click=${this.onClickAvailableAlternative}>
          HTTP/S version available
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
      <button class="live-reload" @click=${this.onClickLiveReloadingBtn} title="Toggle live reloading">
        <i class="fa fa-bolt"></i>
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

  renderBookmarkBtn () {
    return html`
      <button class="bookmark" @click=${this.onClickBookmark}>
        <span class="far fa-star"></span>
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
    this.focusLocation()
    bg.views.showLocationBarContextMenu('active')
  }

  onClickLocation (e) {
    e.preventDefault()
    this.focusLocation()
  }

  onFocusLocation (e) {
    e.currentTarget.value = this.modifiedUrl
    e.currentTarget.setSelectionRange(0, this.url.length)
    this.isLocationFocused = true
  }

  onBlurLocation (e) {
    // clear the selection range so that the next focusing doesnt carry it over
    window.getSelection().empty()
    this.shadowRoot.querySelector('.input-container input').value = this.url // reset value
    this.isLocationFocused = false
    this.hasExpanded = false
  }

  onInputLocation (e) {
    var rect = this.getClientRects()[0]
    bg.views.runLocationBarCmd('set-value', {
      bounds: {
        x: rect.left|0,
        y: (rect.top|0) - 2,
        width: rect.width|0
      },
      value: e.currentTarget.value,
      selectionStart: e.currentTarget.selectionStart
    })
    e.currentTarget.blur()
  }

  onKeydownLocation (e) {
    var left = (e.key === 'ArrowLeft' || (e.ctrlKey && e.key === 'b'))
    if (left && !this.hasExpanded) {
      let input = this.shadowRoot.querySelector('.input-container input')
      if (input.selectionStart === 0) {
        e.preventDefault()
        this.hasExpanded = true
        try {
          var oldValueLen = input.value.length
          input.value = this.url
          input.selectionStart = input.selectionEnd = this.url.length - oldValueLen
        } catch (e) {
          // ignore
        }
      }
    }
  }

  onClickZoom (e) {
    bg.views.resetZoom(this.activeTabIndex)
  }

  onClickAvailableAlternative (e) {
    var url = new URL(this.url)
    url.protocol = this.availableAlternative

    if (e.metaKey || e.ctrlKey) {
      bg.views.createTab(url.toString(), {setActive: true, addToNoRedirects: true})
    } else {
      bg.views.loadURL(this.activeTabIndex, url.toString(), {addToNoRedirects: true})
    }
  }

  onClickLiveReloadingBtn (e) {
    bg.views.toggleLiveReloading('active')
    this.isLiveReloading = false
  }

  async onClickShareMenu (e) {
    this.isShareMenuOpen = true
    var rect = this.shadowRoot.querySelector('.share').getClientRects()[0]
    await bg.views.toggleMenu('share', {
      bounds: {
        top: Number(rect.bottom),
        left: Number(rect.right)
      },
      params: {url: this.url}
    })
    this.isShareMenuOpen = false
  }

  async onClickDonateMenu (e) {
    this.isDonateMenuOpen = true
    var rect1 = this.getClientRects()[0]
    var rect2 = e.currentTarget.getClientRects()[0]
    await bg.views.toggleMenu('donate', {
      bounds: {
        top: (rect1.bottom|0),
        left: (rect2.right|0)
      },
      params: {url: this.url}
    })
    this.isDonateMenuOpen = false
  }

  async onClickBookmark () {
    var rect = this.shadowRoot.querySelector('.bookmark').getClientRects()[0]
    // show menu
    bg.views.toggleMenu('bookmark', {
      bounds: {
        top: Number(rect.bottom),
        left: Number(rect.right)
      },
      params: {
        url: this.url,
        metadata: {title: this.title} // DISABLED was causing issues -prf await bg.views.getPageMetadata(this.activeTabIndex)
      }
    })
  }
}
NavbarLocation.styles = [buttonResetCSS, css`
:host {
  display: flex;
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  padding-right: 2px;
  user-select: none;
}

shell-window-navbar-site-info {
  margin-right: 5px;
}

button {
  width: 27px;
  border-radius: 0;
  color: #666;
  margin: 0 2px;
}

button.share {
  border-radius: 4px;
}

button.text {
  width: auto;
  padding: 0 4px;
  font-size: 11px;
}

button.text.highlight {
  color: #157bcc;
  font-weight: 500;
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

button.bookmark {
  border-radius: 4px;
  margin: 0;
}

button.bookmark .fa-star {
  font-size: 16px;
}

button .fa-link {
  font-size: 14px;
}

button.zoom {
  width: auto;
  font-size: 11px;
  line-height: 10px;
  background: #f5f5f5;
  border-radius: 10px;
  margin: 4px;
  padding: 0 9px;
  border: 1px solid #ccc;
  font-weight: 500;
}

button.zoom:hover {
  background: #eaeaea;
}

button.available-alternative {
  width: auto;
  line-height: 26px;
  padding: 0 6px;
}

button.live-reload {
  width: 24px;
  margin-right: 2px;
}

button.live-reload .fa {
  color: #ffff91;
  -webkit-text-stroke: 1px #daba47;
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

  line-height: 26px;
  width: 100%;
  height: 25px;
  overflow: hidden;

  color: var(--color-input);
  background: var(--bg-input);
  font-size: 13.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 500;
  letter-spacing: -.2px;
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
  color: var(--color-text--light);
}

.input-pretty .protocol-secure {
  color: var(--color-secure);
}

.input-pretty .protocol-insecure {
  color: var(--color-insecure);
}

.input-pretty .host-version,
.input-pretty .syntax,
.input-pretty .path {
  color: var(--color-text--light);
  white-space: nowrap;
  font-weight: 400;
}

`]
customElements.define('shell-window-navbar-location', NavbarLocation)
