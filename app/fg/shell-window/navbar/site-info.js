/* globals customElements */
import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map'
import _get from 'lodash.get'
import * as bg from '../bg-process-rpc'
import buttonResetCSS from './button-reset.css'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteTitle: {type: String},
      driveDomain: {type: String},
      writable: {type: Boolean},
      peers: {type: Number},
      loadError: {type: Object},
      isPressed: {type: Boolean},
      hideOrigin: {type: Boolean, attribute: 'hide-origin'}
    }
  }

  constructor () {
    super()
    this.url = ''
    this.siteTitle = ''
    this.driveDomain = ''
    this.writable = false
    this.peers = 0
    this.loadError = null
    this.isPressed = false
    this.hideOrigin = false
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
    var certified = false
    var insecure = false
    var innerHTML
    if (scheme) {
      const isHttps = scheme === 'https:'
      const isInsecureResponse = _get(this, 'loadError.isInsecureResponse')
      if ((isHttps && !isInsecureResponse) || scheme === 'beaker:') {
        certified = true
        innerHTML = html`
          <span class="fas fa-check-circle certified"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'http:') {
        insecure = true
        innerHTML = html`
          <span class="fas insecure fa-exclamation-triangle"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (isHttps && isInsecureResponse) {
        insecure = true
        innerHTML = html`
          <span class="fas insecure fa-exclamation-triangle"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'hd:') {
        if (this.writable) {
          certified = true
        }
        innerHTML = html`
          ${this.writable ? html`
            <span class="fas fa-check-circle certified"></span>
          ` : ''}
          <span class="label">${this.siteTitle}</span>
        `
      }
    }

    if (!innerHTML) {
      return html`<button class="hidden"></button>`
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <button class=${classMap({certified, insecure, pressed: this.isPressed, 'hide-origin': this.hideOrigin})} @click=${this.onClickButton}>
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
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
  height: 26px;
  line-height: 26px;
  padding: 0 12px 0 10px;
  background: var(--bg-cert-default);
  clip-path: polygon(0% 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%);
}

button:not(:disabled):hover {
  background: var(--bg-cert-default--hover);
}

button.certified {
  background: var(--bg-cert-certified);
}

button.certified:hover {
  background: var(--bg-cert-certified--hover);
}

button.insecure {
  background: var(--bg-cert-insecure);
}

button.insecure:hover {
  background: var(--bg-cert-insecure--hover);
}

button.hide-origin .label {
  display: none;
}

button.hidden {
  display: none;
}

.fa {
  font-size: 11px;
  line-height: 25px;
  color: gray;
}

.fa-exclamation-triangle,
.fa-check-circle {
  font-size: 12.5px;
  line-height: 27px;
}

.fa-user {
  font-size: 9px;
  position: relative;
  top: -1px;
}

.label {
  margin-left: 2px;
  margin-right: 2px;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  font-size: 12.5px;
  line-height: 27px;
  letter-spacing: 0.5px;
}

.certified {
  color: var(--color-certified);
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
