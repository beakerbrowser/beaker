/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'

class BackgroundTrayMenu extends LitElement {
  static get properties () {
    return {
      tabs: {type: String},
      keyboardFocused: {type: Number}
    }
  }

  constructor () {
    super()
    this.$onGlobalKeyup = this.onGlobalKeyup.bind(this)
    this.reset()
  }

  reset () {
    this.tabs = undefined
    this.keyboardFocused = -1
    window.removeEventListener('keyup', this.$onGlobalKeyup)
  }

  async init (params) {
    window.addEventListener('keyup', this.$onGlobalKeyup)
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
            <div
              class="tab ${this.keyboardFocused === i ? 'keyboard-focus' : ''}"
              @click=${e => this.onClickRestore(e, i)}
              @contextmenu=${e => this.onContextMenuTab(e, i)}
            >
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

  onGlobalKeyup (e) {
    if (!this.tabs) return
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.keyboardFocused === -1) {
      this.keyboardFocused = 0
      return
    }
    if (e.key === 'ArrowUp') {
      if (this.keyboardFocused > 0) {
        this.keyboardFocused--
      }
    } else if (e.key === 'ArrowDown') {
      if (this.keyboardFocused < this.tabs.length - 1) {
        this.keyboardFocused++
      }
    } else if (e.key === 'Enter') {
      this.onClickRestore(undefined, this.keyboardFocused)
    }
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
  width: 350px;
  background: var(--bg-color--bgtabs--main);
}

.header {
  padding: 6px 7px;
  border-bottom: 1px solid var(--border-color--default);
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
  color: var(--text-color--menus-wrapper--light);
}

.tabs {
  max-height: 320px;
  overflow-y: auto;
}

.tab {
  display: flex;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid var(--border-color--default);
  cursor: pointer;
}

.tab.keyboard-focus,
.tab:hover {
  background: var(--bg-color--bgtabs--active);
}

.tab.keyboard-focus {
  box-shadow: 0 0 3px #0005;
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
  color: var(--text-color--menus-wrapper--light);
}
`]

customElements.define('background-tray-menu', BackgroundTrayMenu)
