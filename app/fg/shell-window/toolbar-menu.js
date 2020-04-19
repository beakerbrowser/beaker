/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import * as bg from './bg-process-rpc'

class ShellWindowToolbarMenu extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      activeTab: {type: Object},
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
      border-bottom: 1px solid var(--color-toolbar-border);
      background: var(--bg-toolbar);
      color: var(--color-toolbar);
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
    a {
      padding: 0 10px;
      margin-right: 1px;
      height: 20px;
      line-height: 22px;
      box-sizing: border-box;
      text-align: center;
      cursor: pointer;
    }
    a:hover {
      background: var(--bg-toolbar--hover);
      color: var(--color-toolbar--hover);
    }
    a.pressed {
      background: var(--bg-toolbar--pressed);
      color: var(--color-toolbar--pressed);
    }
    a .fas {
      font-size: 10px;
      position: relative;
      top: -1px;
    }
    `
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.activeTab = undefined
    this.openMenu = undefined
  }

  // rendering
  // =

  render () {
    const sidebarBtn = (panel, label) => {
      var panels = this.activeTab ? this.activeTab.sidebarPanels : []
      return html`
        <a
          class=${classMap({pressed: panels.includes(panel)})}
          @click=${e => this.onClickSidebarToggle(e, panel)}
          style="padding: 0 6px 0 7px; margin-right: -2px;"
        >${label}</a>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${''/*sidebarBtn('site-info-app', html`<span class="fas fa-info-circle"></span> Site Info`)*/}
      ${''/*sidebarBtn('files-explorer-app', html`<span class="far fa-folder"></span> Explore Files`)*/}
      ${sidebarBtn('editor-app', html`<span class="fas fa-edit"></span>`)}
      ${''/*sidebarBtn('web-term', html`<span class="fas fa-terminal"></span> Terminal`)*/}
      ${this.renderMenuButton('file', 'File')}
      ${this.renderMenuButton('edit', 'Edit')}
      ${this.renderMenuButton('view', 'View')}
      ${this.renderMenuButton('drive', 'Drive')}
      ${this.renderMenuButton('history', 'History')}
      ${this.renderMenuButton('bookmarks', 'Bookmarks')}
      ${this.renderMenuButton('developer', 'Developer')}
      ${this.renderMenuButton('help', 'Help')}
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

  onClickSidebarToggle (e, panel) {
    bg.views.executeSidebarCommand('active', 'toggle-panel', panel)
  }

  onClickFilesExplorer (e) {
    if (!this.activeTab) return
    bg.views.loadURL('active', `https://hyperdrive.network/${this.activeTab.url.slice('hyper://'.length)}`)
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
