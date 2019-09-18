/* globals customElements */
import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from '../bg-process-rpc'
import { isDatHashRegex } from '../../lib/urls'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import buttonResetCSS from './button-reset.css'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteIcon: {type: String},
      siteTitle: {type: String},
      datDomain: {type: String},
      isOwner: {type: Boolean},
      peers: {type: Number},
      loadError: {type: Object},
      isPressed: {type: Boolean}
    }
  }
  
  constructor () {
    super()
    this.url = ''
    this.siteIcon = ''
    this.siteTitle = ''
    this.datDomain = ''
    this.isOwner = false
    this.peers = 0
    this.loadError = null
    this.isPressed = false
  }

  get scheme () {
    try {
      return (new URL(this.url)).protocol
    } catch (e) {
      return ''
    }
  }

  get hostname () {
    try {
      return (new URL(this.url)).hostname
    } catch (e) {
      return ''
    }
  }

  // rendering
  // =

  render () {
    const scheme = this.scheme
    var innerHTML
    if (scheme) {
      const isHttps = scheme === 'https:'
      const isInsecureResponse = _get(this, 'loadError.isInsecureResponse')
      if ((isHttps && !isInsecureResponse) || scheme === 'beaker:') {
        innerHTML = html`
          ${scheme !== 'beaker:' ? html`<span class="fas fa-info-circle"></span>` : ''}
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'http:') {
        innerHTML = html`
          <span class="fas insecure fa-exclamation-triangle"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (isHttps && isInsecureResponse) {
        innerHTML = html`
          <span class="fas insecure fa-exclamation-triangle"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'dat:') {
        innerHTML = html`
          ${this.isOwner ? html`<span class="label darkbg" style="margin-left: -3px; margin-right: 4px">My Site</span>` : ''}
          <span class="${this.siteIcon || 'fas fa-info-circle'}"></span>
          <span class="label">
            ${this.siteAuthor ? html`${this.siteAuthor} <span class="fas fa-fw fa-angle-right"></span>` : ''}
            ${this.siteTitle}
          </span>
        `
      }
    }

    if (!innerHTML) {
      return html`<button class="hidden"></button>`
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <button class=${classMap({pressed: this.isPressed})} @click=${this.onClickButton}>
        ${innerHTML}
      </button>
    `
  }

  // events
  // =

  async onClickButton (e) {
    this.isPressed = true
    var rect = e.currentTarget.getClientRects()[0]
    await bg.views.toggleSiteInfo({
      bounds: {
        top: (rect.bottom|0),
        left: (rect.left|0)
      }
    })
    this.isPressed = false
  }
}
NavbarSiteInfo.styles = [buttonResetCSS, css`
:host {
  display: block;
}

button {
  border-radius: 0;
  height: 26px;
  line-height: 26px;
  padding: 0 4px 0 10px;
}

button:hover {
  background: #eee;
}

button.hidden {
  display: none;
}

.fa {
  font-size: 11px;
  line-height: 25px;
  color: gray;
}

.fa-user {
  font-size: 9px;
  position: relative;
  top: -1px;
}

.fa-caret-down {
  color: #adadad;
  margin-left: 2px;
}

.label {
  margin-left: 2px;
  margin-right: 2px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.label.darkbg {
  background: rgba(0,0,0,.08);
  padding: 2px 4px;
  border-radius: 3px;
  color: #444;
  font-size: 10px;
}

.secure {
  color: var(--color-secure);
}

.warning {
  color: var(--color-warning);
}

.insecure {
  color: var(--color-insecure);
}
`]
customElements.define('shell-window-navbar-site-info', NavbarSiteInfo)
