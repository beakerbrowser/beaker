import {LitElement, html, css} from '../../vendor/lit-element/lit-element'

class NavbarSiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteLoadError: {type: Object, attribute: 'site-load-error'},
      gotInsecureResponse: {type: Boolean, attribute: 'got-insecure-response'}
    }
  }

  get scheme () {
    try {
      return (new URL(this.url)).protocol
    } catch (e) {
      return false
    }
  }

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
      return html`<div></div>`
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div>
        <span class="fa fa-${icon} ${cls}"></span>
      </div>
    `
  }
}
NavbarSiteInfo.styles = css`
:host {
  display: block;
}

:host > div {
  border-right: 1px solid #ddd;
}

:host > div:hover {
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
`
customElements.define('shell-window-navbar-site-info', NavbarSiteInfo)
