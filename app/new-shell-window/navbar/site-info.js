import {LitElement, html, css} from '../../vendor/lit-element/lit-element'
import * as bg from '../bg-process-rpc'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map'
import buttonResetCSS from './button-reset.css'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      isMenuOpen: {type: Boolean},
      siteLoadError: {type: Object, attribute: 'site-load-error'},
      gotInsecureResponse: {type: Boolean, attribute: 'got-insecure-response'}
    }
  }

  constructor () {
    super()
    this.isMenuOpen = false
    this.url = ''
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
    if (scheme) {
      const isHttps = scheme === 'https:'
      if (isHttps && !this.gotInsecureResponse && !this.siteLoadError || scheme === 'beaker:') {
        cls = 'secure'
        icon = 'lock'
      } else if (scheme === 'http:') {
        icon = 'info-circle'
      } else if (isHttps && this.gotInsecureResponse) {
        cls = 'insecure'
        icon = 'exclamation-circle'
      } else if (scheme === 'dat:') {
        cls = 'secure'
        icon = 'share-alt'
      }
    }

    if (!icon) {
      return html`<button></button>`
    }

    const buttonCls = classMap({pressed: this.isMenuOpen})
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <button class=${buttonCls} @click=${this.onClickButton}>
        <span class="fa fa-${icon} ${cls}"></span>
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
  border-right: 1px solid #ddd;
  border-radius: 0;
  height: 26px;
  line-height: 26px;
}

button:hover {
  background: #eee;
}

.fa {
  font-size: 11px;
  line-height: 25px;
  margin: 0 10px;
  color: gray;
}

.secure {
  color: var(--color-secure);
}

.insecure {
  color: var(--color-insecure);
}
`]
customElements.define('shell-window-navbar-site-info', NavbarSiteInfo)
