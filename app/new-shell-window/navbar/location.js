import {LitElement, html, css} from '../lit-element/lit-element'
import prettyHash from 'pretty-hash'
import buttonResetCSS from './button-reset.css'
import './site-info'

const isDatHashRegex = /^[a-z0-9]{64}/i

class NavbarLocation extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteLoadError: {type: Object, attribute: 'site-load-error'},
      gotInsecureResponse: {type: Boolean, attribute: 'got-insecure-response'}
    }
  }

  constructor () {
    super()
    this.url = ''
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <shell-window-navbar-site-info
        url=${this.url}
        .site-load-error=${this.siteLoadError}
        ?got-insecure-response=${this.gotInsecureResponse}
      >
      </shell-window-navbar-site-info>
      ${this.renderLocation()}
      ${this.renderSiteMenuBtn()}
      ${this.renderBookmarkBtn()}
    `
  }

  renderLocation () {
    return html`
      <div class="input-container">
        <input type="text" value="${this.url}">
        ${this.renderInputPretty()}
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

  renderSiteMenuBtn () {
    return html`
      <button>
        <span class="fa fa-ellipsis-h"></span>
      </button>
    `
  }

  renderBookmarkBtn () {
    return html`
      <button style="margin-right: 2px">
        <span class="far fa-star"></span>
      </button>
    `
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
  border: 0;
  box-sizing: border-box;
  font-size: 13.5px;
  font-weight: 500;
  line-height: 26px;
  width: 100%;
  height: 24px;
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
  letter-spacing: -.2px;
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
