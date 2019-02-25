import {LitElement, html, css} from './lit-element/lit-element'
import _get from 'lodash.get'
import buttonResetCSS from './navbar/button-reset.css'
import './navbar/location'

class ShellWindowNavbar extends LitElement {
  static get properties () {
    return {
      activeTab: {type: Object},
      hasUpdateAvailable: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.activeTab = null
  }

  get canGoBack () {
    return _get(this, 'activeTab.canGoBack')
  }

  get canGoForward () {
    return _get(this, 'activeTab.canGoForward')
  }

  get isLoading () {
    return _get(this, 'activeTab.isLoading')
  }

  // rendering
  // =

  render () {
    console.log(this.activeTab)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="buttons" style="padding-left: 6px;">
        ${this.backBtn}
        ${this.forwardBtn}
        ${this.reloadBtn}
      </div>
      <shell-window-navbar-location url="${_get(this, 'activeTab.url', '')}"></shell-window-navbar-location>
      <div class="buttons">
        ${this.updateBtn}
        ${this.browserMenuBtn}
      </div>
    `
  }

  get backBtn () {
    return html`
      <button class="nav-arrow-btn" ?disabled=${!this.canGoBack}>
        <svg
          class="icon nav-arrow"
          width="9" height="16"
          viewBox="0 0 9 16"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          style="position: relative; left: -2px;"
        >
          <g fill="none" stroke-linejoin="round">
            <polyline stroke-width="2" transform="translate(4.500000, 8.000000) scale(1, 1) translate(-4.500000, -8.000000) " points="8 1 1 8 8 15"/>
          </g>
        </svg>
      </button>
    `
  }

  get forwardBtn () {
    return html`
      <button class="nav-arrow-btn" ?disabled=${!this.canGoForward}>
        <svg
          class="icon nav-arrow"
          width="9" height="16"
          viewBox="0 0 9 16"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <g fill="none" stroke-linejoin="round">
            <polyline stroke-width="2" transform="translate(4.500000, 8.000000) scale(-1, 1) translate(-4.500000, -8.000000) " points="8 1 1 8 8 15"/>
          </g>
        </svg>
      </button>
    `
  }

  get reloadBtn () {
    if (this.isLoading) {
      return html`
        <button>
          <svg
            class="icon close"
            width="12"
            height="12"
            viewBox="0 0 58 58"
            xmlns:xlink="http://www.w3.org/1999/xlink"
          >
            <g id="svg-close" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
              <g transform="translate(4, 5)" stroke-width="10">
                <path d="M1.5,0.5 L48.5,47.5"/>
                <path d="M48.5,0 L1,48"/>
              </g>
            </g>
          </svg>
        </button>
      `
    }
    return html`
      <button>
        <svg
          class="icon refresh"
          width="16"
          height="15"
          viewBox="0 0 16 15"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <g transform="translate(1.000000, 1.000000)" fill="none">
            <path d="M10.9451459,1.75753722 C9.78269142,0.66752209 8.21929978,0 6.5,0 C2.91014913,0 0,2.91014913 0,6.5 C0,10.0898509 2.91014913,13 6.5,13 C9.00186057,13 11.173586,11.5865234 12.2601674,9.51457898" stroke-linecap="round"/>
            <polygon fill="#666666" points="14.2374369 4.98743687 9.64124279 4.63388348 13.8838835 0.391242789"/>
          </g>
        </svg>
      </button>
    `
  }

  get updateBtn () {
    if (!this.hasUpdateAvailable) {
      return ''
    }
    return html`
      <button>update available</button>
    `
  }

  get browserMenuBtn () {
    return html`
      <button><span class="fa fa-bars"></span></button>
    `
  }
}
ShellWindowNavbar.styles = css`
:host {
  display: flex;
  background: var(--bg-foreground);
  height: 28px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}

${buttonResetCSS}

button {
  width: 30px;
}

button.nav-arrow-btn {
  width: 28px;
}

button .fa {
  font-size: 16px;
}

svg.icon * {
  stroke: #666;
}

svg.icon.refresh {
  stroke-width: 1.75;
}

.buttons {
  display: flex;
  padding: 0 8px;
}
`
customElements.define('shell-window-navbar', ShellWindowNavbar)
