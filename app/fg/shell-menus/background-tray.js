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
          <div class="header"><h1>Minimized Tabs</h1></div>
          <span class="spinner"></span>
        </div>
      `
    }
    if (!this.tabs.length) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper">
          <div class="header"><h1>Minimized Tabs</h1></div>
          <div class="empty">You can minimize tabs to this tray and they will run in the background.</div>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header"><h1>Minimized Tabs</h1></div>
        <div class="tabs">
          ${repeat(this.tabs, (tab, i) => html`
            <div class="tab" @click=${e => this.onClickRestore(e, i)} @contextmenu=${e => this.onContextMenuTab(e, i)}>
              <img src="asset:favicon:${tab.url}">
              <div class="title">${tab.title || '-'}</div>
              <div class="url">${tab.url || html`<em>Loading...</em>`}</div>
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

  async onContextMenuTab (e, index) {
    var menu = [
      {id: 'restore', label: 'Restore tab'},
      {id: 'close', label: 'Close tab'}
    ]
    var choice = await bg.beakerBrowser.showContextMenu(menu)
    if (choice === 'restore') this.onClickRestore(undefined, index)
    if (choice === 'close') this.onClickClose(undefined, index)
  }

  onClickRestore (e, index) {
    bg.views.restoreBgTab(index)
    bg.shellMenus.close()
  }

  onClickClose (e, index) {
    bg.views.closeBgTab(index)
    this.tabs.splice(index, 1)
    this.requestUpdate()
  }
}
BackgroundTrayMenu.styles = [buttonsCSS, spinnerCSS, css`
.wrapper {
  color: #333;
  width: 350px;
  background: #fafafa;
}

.header {
  padding: 6px 7px;
  border-bottom: 1px solid #dde;
}

.header h1 {
  font-size: 0.725rem;
  font-weight: 500;
  margin: 0;
}

.spinner {
  margin: 12px;
}

.empty {
  padding: 10px 22px 10px 12px;
  color: #778;
}

.tabs {
  max-height: 320px;
  overflow-y: auto;
}

.tab {
  display: flex;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid #ccd;
  cursor: pointer;
}

.tab:hover {
  background: #fff;
}

.tab:last-child {
  border-bottom: 0;
}

.tab * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab img {
  width: 16px;
  height: 16px;
  object-fit: cover;
  margin-right: 5px;
}

.tab .title {
  flex: 1;
  font-weight: 500;
}

.tab .url {
  flex: 1;
  color: #778;
}

button {
  cursor: pointer;
  background: #fafafa;
}

button:hover {
  background: #fff;
}
`]

customElements.define('background-tray-menu', BackgroundTrayMenu)
