/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'

const WINDOW_MENU_ENABLED = false

class ShellWindowToolbarMenu extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      activeTab: {type: Object},
      toolbar: {type: Object},
      openMenu: {type: String}
    }
  }

  static get styles () {
    return css`
    :host {
      position: fixed;
      left: 0;
      top: 69px;
      width: 100vw;
      height: 25px;

      display: flex;
      font-size: 11px;
      letter-spacing: 0.4px;
      padding: 1px 5px;
      box-sizing: border-box;
      border-bottom: 1px solid var(--border-color--toolbar);
      background: var(--bg-color--toolbar);
      color: var(--text-color--toolbar);
      user-select: none;
    }
    .loading-bar {
      position: fixed;
      left: 0;
      top: 93px;
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
    a {
      padding: 0 10px;
      margin-right: 1px;
      height: 20px;
      line-height: 22px;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    a:hover {
      background: var(--bg-color--toolbar--hover);
      color: var(--text-color--toolbar--hover);
    }
    a.pressed {
      background: var(--bg-color--toolbar--pressed);
      color: var(--text-color--toolbar--pressed);
    }
    a .attach-icon {
      position: relative;
      font-size: 8px;
      left: -1px;
      top: -4px;
    }
    a + a .far,
    a + a .fas {
      margin-left: -2px;
    }
    .favicon {
      object-fit: contain;
      width: 12px;
      height: 12px;
      position: relative;
      top: 2px;
    }
    .divider {
      margin: 6px 10px 2px 6px;
      width: 1px;
      height: 10px;
      background-color: var(--border-color--tab);
    }
    `
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.activeTab = undefined
    this.toolbar = undefined
    this.openMenu = undefined
    this.addEventListener('contextmenu', this.onMainContextmenu.bind(this))
  }

  // rendering
  // =

  render () {
    const btn = (item, index) => {
      return html`
        <a @mousedown=${e => this.onMousedownBookmark(e, index)}>
          <img class="favicon" src="asset:favicon:${item.href}">
          ${item.title}
          ${item.openInPane ? html`<span class="attach-icon">⚯</span>` : ''}
        </a>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${WINDOW_MENU_ENABLED ? html`
        ${this.renderMenuButton('file', 'File')}
        ${this.renderMenuButton('drive', 'Drive')}
        ${this.renderMenuButton('bookmarks', 'Bookmarks')}
        ${this.renderMenuButton('developer', 'Developer')}
        ${this.renderMenuButton('help', 'Help')}
        <span class="divider"></span>
      ` : ''}
      ${this.toolbar ? repeat(this.toolbar, btn) : ''}
      <span class="spacer"></span>
      <a data-href="https://userlist.beakerbrowser.com/" title="Beaker User Directory" @mousedown=${this.onMousedownLink}>User Directory</a>
      <a data-href="https://beaker.dev/" title="Developer Portal" @mousedown=${this.onMousedownLink}>Dev Portal</a>
      <a data-href="https://docs.beakerbrowser.com/" title="Help" @mousedown=${this.onMousedownLink}>Help</a>
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

  async onMousedownBookmark (e, index) {
    e.stopPropagation()
    var item = this.toolbar[index]
    let rect = e.currentTarget.getClientRects()[0]
    var menuChoice
    if (e.button === 2 || (e.button === 1 && (e.metaKey || e.ctrlKey))) {
      var menu = [
        {id: 'goto', label: 'Open in Current Pane'},
        {id: 'pane', label: 'Open in New Pane'},
        {id: 'tab', label: 'Open in New Tab'},
        {id: 'window', label: 'Open in New Window'},
        {type: 'separator'},
        {id: 'togglePaneDefault', label: 'Open as Attached Pane by Default', type: 'checkbox', checked: item.openInPane},
        {type: 'separator'},
        {id: 'edit', label: 'Edit Bookmark'},
        {id: 'remove', label: 'Remove from Toolbar'}
      ]
      menuChoice = await bg.beakerBrowser.showContextMenu(menu)
    } 
    if (menuChoice === 'tab' || e.button === 1) {
      bg.views.createTab(item.href)
    } else if (menuChoice === 'goto') {
      bg.views.loadURL('active', item.href)
    } else if (menuChoice === 'pane') {
      bg.views.createPane('active', item.href)
    } else if (menuChoice === 'window') {
      bg.beakerBrowser.newWindow({pages: [item.href]})
    } else if (menuChoice === 'togglePaneDefault') {
      bg.toolbar.update({bookmark: item.bookmark, openInPane: !item.openInPane})
    } else if (menuChoice === 'edit') {
      bg.views.toggleMenu('bookmark-edit', {
        bounds: {left: rect.left|0, top: rect.bottom|0},
        params: {url: item.href}
      })
    } else if (menuChoice === 'remove') {
      bg.toolbar.remove(item)
    } else if (e.button === 0) {
      if (item.openInPane) {
        bg.views.togglePaneByOrigin('active', item.href)
      } else {
        bg.views.loadURL('active', item.href)
      }
    }
  }

  async onMainContextmenu (e) {
    e.preventDefault()
    e.stopPropagation()
    var x = e.clientX
    var y = e.clientY
    var menuChoice = await bg.beakerBrowser.showContextMenu([
      {id: 'new-bookmark', label: 'New Bookmark'}
    ])
    if (menuChoice === 'new-bookmark') {
      bg.views.toggleMenu('bookmark-edit', {
        bounds: {left: x|0, top: y|0},
        params: {url: '', toolbar: true}
      })
    }
  }

  onMousedownLink (e) {
    e.preventDefault()
    if (e.button === 1 || e.metaKey || e.ctrlKey) {
      bg.views.createTab(e.currentTarget.dataset.href, {setActive: true, adjacentActive: true})
    } else if (e.button === 0) {
      bg.views.loadURL('active', e.currentTarget.dataset.href)
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
