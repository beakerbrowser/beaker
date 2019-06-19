/* globals customElements */
import { ipcRenderer } from 'electron'
import { LitElement, html, css } from '../../vendor/lit-element/lit-element'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import { pluralize } from '../../lib/strings'
import { findWordBoundary } from 'pauls-word-boundary'
import prettyHash from 'pretty-hash'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'
import './site-info'

const isDatHashRegex = /^[a-z0-9]{64}/i

class NavbarLocation extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      url: {type: String},
      title: {type: String},
      peers: {type: Number},
      zoom: {type: Number},
      loadError: {type: Object},
      donateLinkHref: {type: String, attribute: 'donate-link-href'},
      availableAlternative: {type: String, attribute: 'available-alternative'},
      isLiveReloading: {type: Boolean, attribute: 'is-live-reloading'},
      previewMode: {type: Boolean, attribute: 'preview-mode'},
      uncommittedChanges: {type: Number, attribute: 'uncommitted-changes'},
      isSiteToolsMenuOpen: {type: Boolean},
      isPreviewModeToolsMenuOpen: {type: Boolean},
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
    this.peers = 0
    this.zoom = 0
    this.loadError = null
    this.donateLinkHref = false
    this.availableAlternative = ''
    this.previewMode = false
    this.uncommittedChanges = 0
    this.isSiteToolsMenuOpen = false
    this.isPreviewModeToolsMenuOpen = false
    this.isDonateMenuOpen = false
    this.isBookmarked = false
    this.isLocationFocused = false

    // listen for commands from the main process
    ipcRenderer.on('command', this.onCommand.bind(this))
  }

  get isDat () {
    return this.url.startsWith('dat://')
  }

  get isViewingPreview () {
    try {
      return (new URL(this.url)).hostname.includes('+preview')
    } catch (e) {
      return false
    }
  }

  focusLocation () {
    var input = this.shadowRoot.querySelector('.input-container input')
    input.focus()
    input.setSelectionRange(0, input.value.length)
    bg.views.focusShellWindow() // focus the shell-window UI
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
        peers=${this.peers}
        .loadError=${this.loadError}
      >
      </shell-window-navbar-site-info>
      ${this.renderLocation()}
      ${this.renderZoom()}
      ${this.renderLiveReloadingBtn()}
      ${this.renderPreviewModeToolsBtn()}
      ${this.renderSiteToolsBtn()}
      ${this.renderAvailableAlternativeBtn()}
      ${this.renderDonateBtn()}
      ${this.renderBookmarkBtn()}
    `
  }

  renderLocation () {
    return html`
      <div class="input-container">
        <input
          type="text"
          value="${this.url}"
          @contextmenu=${this.onContextMenuLocation}
          @mousedown=${this.onMousedownLocation}
          @mouseup=${this.onMouseupLocation}
          @dblclick=${this.onDblclickLocation}
          @focus=${this.onFocusLocation}
          @blur=${this.onBlurLocation}
          @input=${this.onInputLocation}
        >
        ${this.isLocationFocused ? '' : this.renderInputPretty()}
      </div>
    `
  }

  renderInputPretty () {
    if (/^(dat|http|https|beaker):\/\//.test(this.url)) {
      try {
        var { protocol, host, pathname, search, hash } = new URL(this.url)
        var hostVersion
        if (protocol === 'dat:') {
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
        if (['beaker:'].includes(protocol)) cls += ' protocol-secure'
        if (['https:'].includes(protocol) && !this.loadError) cls += ' protocol-secure'
        if (['https:'].includes(protocol) && this.loadError && this.loadError.isInsecureResponse) cls += ' protocol-insecure'
        if (['dat:'].includes(protocol)) cls += ' protocol-secure'
        if (['beaker:'].includes(protocol)) cls += ' protocol-secure'
        return html`
          <div class="input-pretty">
            <span class=${cls}>${protocol.slice(0, -1)}</span><span class="syntax">://</span><span class="host">${host}</span>${hostVersion ? html`<span class="host-version">${hostVersion}</span>` : ''}<span class="path">${pathname}${search}${hash}</span>
          </div>
        `
      } catch (e) {
        // invalid URL
        return html`
          <div class="input-pretty">${this.url}</div>
        `
      }
    }
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

  renderPreviewModeToolsBtn () {
    if (!this.isDat || !this.previewMode) {
      return ''
    }
    var isViewingPreview = this.isViewingPreview
    var versionLabel = isViewingPreview ? 'Preview' : 'Latest'
    var hasChanges = (+this.uncommittedChanges !== 0)
    var changeLabel = hasChanges ? `(${this.uncommittedChanges} ${pluralize(+this.uncommittedChanges, 'change')}${isViewingPreview ? '' : ' in preview'})` : ''
    var cls = classMap({'preview-mode-tools': true, 'has-changes': hasChanges, pressed: this.isPreviewModeToolsMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickPreviewModeToolsBtn}>
        <i class="fas fa-circle"></i> Viewing: ${versionLabel} ${changeLabel}
      </button>
    `
  }

  renderSiteToolsBtn () {
    var cls = classMap({'site-tools': true, pressed: this.isSiteToolsMenuOpen})
    return html`
      <button class="${cls}" @click=${this.onClickSiteToolsBtn}>
        <span class="fa fa-ellipsis-h"></span>
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
    const cls = classMap({
      far: !this.isBookmarked,
      fas: this.isBookmarked,
      'fa-star': true
    })
    return html`
      <button class="bookmark-btn" style="margin-right: 2px" @click=${this.onClickBookmark}>
        <span class="${cls}"></span>
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
    bg.views.showLocationBarContextMenu('active')
  }

  onMousedownLocation (e) {
    // track if the user is clicking, doubleclicking, or dragging the location before its focused
    // if a click, select all; if a doubleclick, select word under cursor; if a drag, do default behavior
    if (!e.currentTarget.matches(':focus')) {
      this.lastMousedownLocationTs = Date.now()
    }
  }

  onMouseupLocation (e) {
    if (Date.now() - this.lastMousedownLocationTs <= 300) {
      // was a fast click (probably not a drag) so select all
      let inputEl = e.currentTarget
      this.mouseupClickIndex = inputEl.selectionStart
      inputEl.select()

      // setup double-click override
      this.lastMousedownLocationTs = 0
      this.lastMouseupLocationTs = Date.now()
    }
  }

  onDblclickLocation (e) {
    if (Date.now() - this.lastMouseupLocationTs <= 300) {
      e.preventDefault()

      // select the text under the cursor
      // (we have to do this manually because we previously selected all on mouseup, which f's that default behavior up)
      let inputEl = e.currentTarget
      let {start, end} = findWordBoundary(inputEl.value, this.mouseupClickIndex)
      inputEl.setSelectionRange(start, end)
      this.lastMouseupLocationTs = 0
    }
  }

  onFocusLocation (e) {
    e.currentTarget.value = this.url
    this.isLocationFocused = true
  }

  onBlurLocation (e) {
    // clear the selection range so that the next focusing doesnt carry it over
    window.getSelection().empty()
    this.shadowRoot.querySelector('.input-container input').value = this.url // reset value
    this.isLocationFocused = false
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

  onClickZoom (e) {
    bg.views.resetZoom(this.activeTabIndex)
  }

  async onClickPreviewModeToolsBtn (e) {
    this.isPreviewModeToolsMenuOpen = true
    var rect1 = this.getClientRects()[0]
    var rect2 = e.currentTarget.getClientRects()[0]
    await bg.views.toggleMenu('preview-mode-tools', {
      bounds: {
        top: (rect1.bottom|0),
        right: (rect2.right|0)
      },
      params: {url: this.url}
    })
    this.isPreviewModeToolsMenuOpen = false
  }

  async onClickSiteToolsBtn (e) {
    this.isSiteToolsMenuOpen = true
    var rect1 = this.getClientRects()[0]
    var rect2 = e.currentTarget.getClientRects()[0]
    await bg.views.toggleMenu('site-tools', {
      bounds: {
        top: (rect1.bottom|0),
        right: (rect2.right|0)
      },
      params: {url: this.url}
    })
    this.isSiteToolsMenuOpen = false
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

  async onClickDonateMenu (e) {
    this.isDonateMenuOpen = true
    var rect1 = this.getClientRects()[0]
    var rect2 = e.currentTarget.getClientRects()[0]
    await bg.views.toggleMenu('donate', {
      bounds: {
        top: (rect1.bottom|0),
        right: (rect2.right|0)
      },
      params: {url: this.url}
    })
    this.isDonateMenuOpen = false
  }

  async onClickBookmark () {
    var rect = this.shadowRoot.querySelector('.bookmark-btn').getClientRects()[0]

    // create a bookmark if needed
    var bookmarkIsNew = false
    if (!this.isBookmarked) {
      bookmarkIsNew = true
      var metadata = await bg.views.getPageMetadata(this.activeTabIndex)
      await bg.bookmarks.add({
        href: this.url,
        title: metadata.title || this.title || '',
        description: metadata.description || '',
        tags: metadata.keywords
      })
      bg.views.refreshState(this.activeTabIndex) // pull latest state
    }

    // show menu
    bg.views.toggleMenu('bookmark', {
      bounds: {
        top: Number(rect.bottom),
        right: Number(rect.right)
      },
      params: {url: this.url, bookmarkIsNew}
    })
  }
}
NavbarLocation.styles = [buttonResetCSS, css`
:host {
  display: flex;
  flex: 1;
  background: #fff;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
}

button {
  width: 27px;
  border-radius: 0;
  color: #666;
}

button .fa,
button .far,
button .fas {
  font-size: 15px;
}

button .fa-star {
  font-size: 14px;
}

button .fas.fa-star {
  color: #ffcc00;
  -webkit-text-stroke: 1px #f7c600;
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

button.preview-mode-tools {
  width: auto;
  padding: 0 5px;
  font-size: 11px;
  line-height: 12px;
  margin: 2px 6px;
  border-radius: 2px;
  border: 1px solid #bbdefb;
  color: #2471af;
  background: linear-gradient(#e3f2fd, #e2eef7);
}

button.preview-mode-tools:hover {
  background: #d7e7f5;
}

button.preview-mode-tools.has-changes {
  border-color: #f3de4a;
  color: #695116;
  background: linear-gradient(#fff9c4, #fff5c4);
}

button.preview-mode-tools.has-changes:hover {
  background: #fbefb5;
}

button.preview-mode-tools .fas {
  display: none;
  font-size: 7px;
  position: relative;
  top: -1px;
  margin-right: 2px;
  color: #FFC107;
}

button.preview-mode-tools.has-changes .fas {
  display: inline;
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
  margin: 0 8px;
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

  color: #222;
  font-size: 13.5px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
  font-weight: 500;
  letter-spacing: -.2px;
}

input:focus {
  outline: 0;
}

.input-pretty {
  z-index: 1;
  text-overflow: ellipsis;
  color: #000;
  background: #fff;
  cursor: text;
  pointer-events: none;
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
}

`]
customElements.define('shell-window-navbar-location', NavbarLocation)
