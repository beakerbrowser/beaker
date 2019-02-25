import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map'
import {findWordBoundary} from 'pauls-word-boundary'
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
      zoom: {type: Number},
      isBookmarked: {type: Boolean, attribute: 'is-bookmarked'},
      isLocationFocused: {type: Boolean},
      siteLoadError: {type: Object, attribute: 'site-load-error'},
      gotInsecureResponse: {type: Boolean, attribute: 'got-insecure-response'}
    }
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.url = ''
    this.zoom = 0
    this.isBookmarked = false
    this.isLocationFocused = false
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <shell-window-navbar-site-info
        url=${this.url}
        .siteLoadError=${this.siteLoadError}
        ?got-insecure-response=${this.gotInsecureResponse}
      >
      </shell-window-navbar-site-info>
      ${this.renderLocation()}
      ${this.renderZoom()}
      ${this.renderSiteMenuBtn()}
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
          @keydown=${this.onKeydownLocation}
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
        if (['https:'].includes(protocol) && !this.siteLoadError && !this.gotInsecureResponse) cls += ' protocol-secure'
        if (['https:'].includes(protocol) && this.gotInsecureResponse) cls += ' protocol-insecure'
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
    var zoomIcon = zoomPct < 100 ? '-minus' : '-plus'
    return html`
      <button @click=${this.onClickZoom} title="Zoom: ${zoomPct}%" class="zoom">
        <i class=${'fa fa-search' + zoomIcon}></i>
        ${zoomPct}%
      </button>
    `
  }

  renderSiteMenuBtn () {
    return html`
      <button>
        <span class="fa fa-ellipsis-h"></span>
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
      <button style="margin-right: 2px">
        <span class="${cls}"></span>
      </button>
    `
  }

  // events
  // =

  onContextMenuLocation (e) {
    // TODO
    // const { Menu, clipboard } = remote
    // var clipboardContent = clipboard.readText()
    // var clipInfo = examineLocationInput(clipboardContent)
    // var menu = Menu.buildFromTemplate([
    //   { label: 'Cut', role: 'cut' },
    //   { label: 'Copy', role: 'copy' },
    //   { label: 'Paste', role: 'paste' },
    //   { label: `Paste and ${clipInfo.isProbablyUrl ? 'Go' : 'Search'}`, click: onPasteAndGo }
    // ])
    // menu.popup(remote.getCurrentWindow())
  
    // function onPasteAndGo () {
    //   var url = clipInfo.isProbablyUrl ? clipInfo.vWithProtocol : clipInfo.vSearch
    //   var page = pages.getActive()
    //   page.navbarEl.querySelector('.nav-location-input').value = url
    //   page.navbarEl.querySelector('.nav-location-input').blur()
    //   page.loadURL(url)
    // }
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
    this.isLocationFocused = false
  }
  
  onInputLocation (e) {
    var rect = this.getClientRects()[0]
    bg.views.showMenu('location', {
      bounds: {
        x: rect.left|0,
        y: rect.top|0,
        width: rect.width|0
      },
      params: {value: e.currentTarget.value}
    })
    e.currentTarget.blur()
  }

  onClickZoom (e) {
    bg.views.resetZoom(this.activeTabIndex)
  }
}
NavbarLocation.styles = css`
:host {
  display: flex;
  flex: 1;
  background: #fff;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
}

${buttonResetCSS}

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

.input-container {
  position: relative;
  flex: 1;
  margin: 0 8px;
}

button.zoom {
  width: auto;
  font-size: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin: 2px;
  padding: 0 6px;
  border: 1px solid #ccc;
}

button.zoom i {
  font-size: 12px;
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
`
customElements.define('shell-window-navbar-location', NavbarLocation)