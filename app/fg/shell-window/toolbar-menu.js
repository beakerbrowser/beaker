/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import * as bg from './bg-process-rpc'

class ShellWindowToolbarMenu extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      activeTab: {type: Object}
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
    a {
      padding: 0 8px;
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
  }

  // rendering
  // =

  render () {
    const isHyper = this.activeTab ? this.activeTab.url.startsWith('hyper://') : false
    const sidebarBtn = (panel, label) => {
      var panels = this.activeTab ? this.activeTab.sidebarPanels : []
      return html`
        <a
          class=${classMap({pressed: panels.includes(panel)})}
          @click=${e => this.onClickSidebarToggle(e, panel)}
        >${label}</a>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${sidebarBtn('site-info-app', html`<span class="fas fa-info-circle"></span> Site Info`)}
      ${sidebarBtn('files-explorer-app', html`<span class="far fa-folder"></span> Explore Files`)}
      ${sidebarBtn('editor-app', html`<span class="fas fa-edit"></span> Editor`)}
      ${sidebarBtn('web-term', html`<span class="fas fa-terminal"></span> Terminal`)}
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
}
customElements.define('shell-window-toolbar-menu', ShellWindowToolbarMenu)
