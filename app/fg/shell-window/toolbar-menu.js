/* globals customElements */
import { ipcRenderer } from 'electron'
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'

const WINDOW_MENU_ENABLED = false

const BASIC_BUILTINS = [
  {builtin: true, url: 'beaker://about/', hyperOnly: true},
  {builtin: true, url: 'beaker://activity/'},
  {builtin: true, url: 'beaker://library/'}
]
const ADVANCED_BUILTINS = [
  {builtin: true, url: 'beaker://editor/'},
  {builtin: true, url: 'beaker://explorer/', hyperOnly: true},
  {builtin: true, url: 'beaker://webterm/'}
]

class ShellWindowToolbarMenu extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      activeTab: {type: Object},
      toolbar: {type: Object},
      openMenu: {type: String},
      isExpanded: {type: Boolean}
    }
  }

  static get styles () {
    return css`
    :host {
      position: fixed;
      left: 0;
      top: 75px;
      width: 40px;
      height: calc(100vh - 69px);

      display: flex;
      flex-direction: column;
      font-size: 11px;
      letter-spacing: 0.4px;
      box-sizing: border-box;
      border-right: 1px solid var(--border-color--toolbar);
      background: var(--bg-color--toolbar);
      color: var(--text-color--toolbar);
      user-select: none;
    }
    .loading-bar {
      position: fixed;
      left: 0;
      top: 74px;
      width: 100vw;
      height: 1px;
      background: linear-gradient(to right, #2196F3 0%, #E3F2FD 50%, #2196F3 100%);
      background-size: 50% 50%;
      animation: loading-bar-anim 1s infinite linear;
    }
    @keyframes loading-bar-anim {
      0%    { background-position: 0% 0%; }
      100%  { background-position: 100% 0%; }
    }
    .spacer {
      flex: 1;
    }
    .fa-tags {
      height: 20px;
      line-height: 22px;
    }
    a {
      width: 39px;
      height: 34px;
      padding: 6px 0;
      margin: 1px 0;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
    }
    a:hover {
      background: var(--bg-color--toolbar--hover);
      color: var(--text-color--toolbar--hover);
    }
    a.pressed {
      background: var(--bg-color--toolbar--pressed);
      color: var(--text-color--toolbar--pressed);
    }
    a.disabled {
      opacity: 0.5;
      cursor: default;
    }
    a .far,
    a .fas {
      font-size: 12px;
      position: relative;
      top: 5px;
    }
    .favicon {
      object-fit: contain;
      width: 16px;
      height: 16px;
      position: relative;
      top: 2px;
    }
    hr {
      border: 0;
      border-top: 1px solid var(--border-color--toolbar);
      width: 70%;
      margin: 8px 6px;
    }
    `
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.activeTab = undefined
    this.toolbar = undefined
    this.openMenu = undefined
    this.isExpanded = false
    this.addEventListener('contextmenu', this.onMainContextmenu.bind(this))
  }

  isPaneActive (item) {
    if (!this.activeTab || this.activeTab?.paneLayout?.length === 1) return false
    let origin = (new URL(item.url)).origin
    return !!this.activeTab.paneLayout.find(pane => pane.url.startsWith(origin))
  }

  isPaneDisabled (item) {
    return item.hyperOnly && (!this.activeTab || !this.activeTab.url.startsWith('hyper://'))
  }

  get visibleToolbar () {
    let arr = BASIC_BUILTINS.concat({type: 'separator'})
    if (this.toolbar?.length) arr = arr.concat(this.toolbar).concat({type: 'separator'})
    if (this.isExpanded) arr = arr.concat(ADVANCED_BUILTINS)
    return arr
  }

  // rendering
  // =

  render () {
    const btn = (item) => {
      if (item.type === 'separator') {
        return html`<hr>`
      }
      return this.isPaneDisabled(item) ? html`
        <a class="disabled"><img class="favicon" src="asset:favicon:${item.url}"></a>
      ` : html`
        <a
          @mousedown=${e => this.onMousedownLink(e, item)}
          @mouseover=${e => this.onMouseoverLink(e, item)}
          @mouseleave=${e => this.onMouseleaveLink(e, item)}
          class=${this.isPaneActive(item) ? 'pressed' : ''}
        >
          <img class="favicon" src="asset:favicon:${item.url}">
        </a>
      `
    }

    const expanderBtn = () => {
      if (this.isExpanded) {
        return html`
          <a @click=${e => { this.isExpanded = false }}><span class="fas fa-fw fa-caret-up"></span></a>
        `
      }
      return html`
        <a @click=${e => { this.isExpanded = true }}><span class="fas fa-fw fa-caret-down"></span></a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${WINDOW_MENU_ENABLED ? html`
        ${this.renderMenuButton('file', 'File')}
        ${this.renderMenuButton('drive', 'Site')}
        ${this.renderMenuButton('bookmarks', 'Bookmarks')}
        ${this.renderMenuButton('developer', 'Developer')}
        ${this.renderMenuButton('help', 'Help')}
        <span class="divider"></span>
      ` : ''}
      ${repeat(this.visibleToolbar, item => item.url, btn)}
      ${expanderBtn()}
      ${this.activeTab && this.activeTab.isLoading ? html`<div class="loading-bar"></div>` : ''}
    `
  }

  renderMenuButton (id, label) {
    const cls = classMap({pressed: this.openMenu === id})
    return html`
      <a class=${cls} @click=${this.onClickMenu(id)} @mouseover=${this.onMouseoverMenu(id)}>
        ${label}
      </a>
    `
  }

  // events
  // =

  async onMousedownLink (e, item) {
    e.stopPropagation()
    var el = e.currentTarget
    var menuChoice
    if (e.button === 2 || (e.button === 1 && (e.metaKey || e.ctrlKey))) {
      var menu = [
        {id: 'goto', label: 'Open in Current Pane'},
        {id: 'tab', label: 'Open in New Tab'},
        {id: 'window', label: 'Open in New Window'},
      ]
      if (!item.builtin) {
        menu.push({type: 'separator'})
        menu.push({id: 'remove', label: 'Remove from Toolbar'})
      }
      menuChoice = await bg.beakerBrowser.showContextMenu(menu)
    } 
    if (menuChoice === 'tab' || e.button === 1) {
      bg.views.createTab(item.url)
    } else if (menuChoice === 'goto') {
      bg.views.loadURL('active', item.url)
    } else if (menuChoice === 'pane') {
      bg.views.createPane('active', item.url)
    } else if (menuChoice === 'window') {
      bg.beakerBrowser.newWindow({pages: [item.url]})
    } else if (menuChoice === 'remove') {
      bg.toolbar.remove(this.toolbar.indexOf(item))
    } else if (e.button === 0) {
      if (this.isPaneActive(item.url)) {
        el.classList.remove('pressed')
      } else {
        el.classList.add('pressed')
      }
      bg.views.togglePaneByOrigin('active', item.url)
    }
  }

  onMouseoverLink (e, item) {
    let rect = e.currentTarget.getClientRects()[0]
    let label = ({
      'beaker://about': 'Site Profile',
      'beaker://activity': 'Comments',
      'beaker://editor': 'Editor',
      'beaker://explorer': 'Files Explorer',
      'beaker://library': 'My Library',
      'beaker://webterm': 'Terminal'
    })[(new URL(item.url)).origin] || item.url
    bg.overlay.set({
      value: label,
      bounds: {
        x: rect.right + 5,
        y: rect.top + 2,
        width: 50 + label.length * 5, // rough approximation of needed width
        height: 30
      }
    })
  }

  onMouseleaveLink (e, item) {
    bg.overlay.set(false)
  }

  async onMainContextmenu (e) {
    e.preventDefault()
    e.stopPropagation()
    var menuChoice = await bg.beakerBrowser.showContextMenu([
      {id: 'new-item', label: 'Add Application to Sidebar'}
    ])
    if (menuChoice === 'new-item') {
      var first = true
      while (true) {
        let url = ipcRenderer.sendSync('page-prompt-dialog', first ? 'URL of the application' : 'Invalid URL, try again')
        if (!url) return
        first = false
        try {
          new URL(url)
        } catch (e) {
          continue
        }
        bg.toolbar.add({url})
        return
      }
    }
  }

  onClickMenu (id) {
    return async (e) => {
      if (Date.now() - (this.lastMenuClick||0) < 100) {
        return
      }
      this.openMenu = id
      var rect = e.currentTarget.getClientRects()[0]
      await bg.views.toggleMenu('toolbar', {
        bounds: {left: (rect.left|0) + 1, top: (rect.bottom|0) + 1},
        params: {menu: id}
      })
      this.openMenu = undefined
      this.lastMenuClick = Date.now()
    }
  }

  onMouseoverMenu (id) {
    return async (e) => {
      if (!this.openMenu || this.openMenu === id) {
        return
      }
      var rect = e.currentTarget.getClientRects()[0]
      bg.views.updateMenu({
        bounds: {left: (rect.left|0) + 1, top: (rect.bottom|0) + 1},
        params: {menu: id}
      })
      this.openMenu = id
    }
  }
}
customElements.define('shell-window-toolbar-menu', ShellWindowToolbarMenu)
