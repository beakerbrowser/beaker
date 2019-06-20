/* globals customElements */
import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from '../bg-process-rpc'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map'
import buttonResetCSS from './button-reset.css'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      isMenuOpen: {type: Boolean},
      url: {type: String},
      siteTitle: {type: String},
      peers: {type: Number},
      numFollowers: {type: Number},
      loadError: {type: Object}
    }
  }

  constructor () {
    super()
    this.isMenuOpen = false
    this.url = ''
    this.siteTitle = ''
    this.peers = 0
    this.numFollowers = 0
    this.loadError = null
  }

  get scheme () {
    try {
      return (new URL(this.url)).protocol
    } catch (e) {
      return false
    }
  }

  // rendering
  // =

  render () {
    var icon
    var cls = ''
    const scheme = this.scheme
    const isDat = scheme === 'dat:'
    var innerHTML
    if (scheme) {
      const isHttps = scheme === 'https:'
      const isInsecureResponse = _get(this, 'loadError.isInsecureResponse')
      if ((isHttps && !isInsecureResponse) || scheme === 'beaker:') {
        innerHTML = html`
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'http:') {
        innerHTML = html`
          <span class="fas insecure fa-lock-open"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (isHttps && isInsecureResponse) {
        innerHTML = html`
          <span class="fas insecure fa-exclamation-circle"></span>
          <span class="label">${this.siteTitle}</span>
        `
      } else if (scheme === 'dat:') {
        innerHTML = html`
          ${''/*<span class="fas secure fa-share-alt"></span>
          <span class="label secure ${cls}">${this.peers}</span>*/}
          <span class="label">${this.siteTitle}</span>
          <span class="far fa-user" style="color: gray;"></span>
          <span class="label ${cls}" style="color: gray; margin-left: 0">${this.numFollowers}</span>
        `
      }
    }

    if (!innerHTML) {
      return html`<button></button>`
    }

    const buttonCls = classMap({pressed: this.isMenuOpen})
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <button class=${buttonCls} @click=${this.onClickButton}>
        ${innerHTML}
        <span class="fas fa-caret-down"></span>
      </button>
    `
  }

  // events
  // =

  async onClickButton () {
    this.isMenuOpen = true
    await bg.views.toggleMenu('site-info', {
      params: {url: this.url}
    })
    this.isMenuOpen = false
  }
}
NavbarSiteInfo.styles = [buttonResetCSS, css`
:host {
  display: block;
}

button {
  border-right: 1px solid #ccc;
  border-radius: 0;
  height: 26px;
  line-height: 26px;
  padding: 0 10px;
}

button:hover {
  background: #eee;
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

.secure {
  color: var(--color-secure);
}

.insecure {
  color: var(--color-insecure);
}
`]
customElements.define('shell-window-navbar-site-info', NavbarSiteInfo)
