/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'

class BackgroundTrayMenu extends LitElement {
  static get properties () {
    return {
      tabs: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.tabs = undefined
  }

  async init (params) {
    this.tabs = await bg.views.getBackgroundTabs()
  }

  // rendering
  // =

  render () {
    if (!this.tabs) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper">
          <div class="header"><h1>Background Tray</h1></div>
          <span class="spinner"></span>
        </div>
      `
    }
    if (!this.tabs.length) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper">
          <div class="header"><h1>Background Tray</h1></div>
          <div class="empty">You can minimize tabs to this tray and they will run in the background.</div>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header"><h1>Background Tray</h1></div>
        <div class="tabs">
          ${repeat(this.tabs, (tab, i) => html`
            <div class="tab" @click=${e => this.onClickRestore(e, i)}>
              <div class="info">
                <div class="title">${tab.title}</div>
                <div class="url">${tab.url}</div>
              </div>
              <button @click=${e => this.onClickClose(e, i)}><span class="fas fa-times"></span></button>
            </div>
          `)}
        </div>
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  onClickRestore (e, index) {
    bg.views.restoreBgTab(index)
    bg.shellMenus.close()
  }

  onClickClose (e, index) {
    e.preventDefault()
    e.stopPropagation()
    bg.views.closeBgTab(index)
    this.tabs.splice(index, 1)
    this.requestUpdate()
  }
}
BackgroundTrayMenu.styles = [buttonsCSS, spinnerCSS, css`
.wrapper {
  color: #333;
  width: 400px;
}

.header {
  padding: 10px;
  border-bottom: 1px solid #dde;
  text-align: center;
}

.header h1 {
  font-size: 0.825rem;
  font-weight: 500;
  margin: 0;
}

.spinner {
  margin: 12px;
}

.empty {
  padding: 10px 12px;
  color: #778;
}

.tabs {
  max-height: 320px;
  overflow-y: auto;
}

.tab {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #ccd;
  cursor: pointer;
}

.tab:hover {
  background: #fafafd;
}

.tab:last-child {
  border-bottom: 0;
}

.tab .info {
  flex: 1;
}

.tab .info * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 320px;
}

.tab .info .title {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 1px;
}

.tab .info .url {
  color: #778;
}

button {
  cursor: pointer;
}

button:hover {
  background: #fafafd;
}
`]

customElements.define('background-tray-menu', BackgroundTrayMenu)
