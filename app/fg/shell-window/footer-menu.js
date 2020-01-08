/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import * as bg from './bg-process-rpc'

class ShellWindowFooterMenu extends LitElement {
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
      bottom: 0;
      width: 100vw;
      height: 25px;

      display: flex;
      font-size: 11px;
      letter-spacing: 0.4px;
      padding: 0 5px;
      box-sizing: border-box;
      border-top: 1px solid var(--color-footer-border);
      background: var(--bg-footer);
      color: var(--color-footer);
      user-select: none;
    }
    a {
      padding: 0 8px;
      margin-right: 1px;
      height: 24px;
      box-sizing: border-box;
      text-align: center;
      line-height: 24px;
      cursor: pointer;
    }
    a.pressed,
    a:hover {
      background: var(--bg-footer--hover);
      color: var(--color-footer--hover);
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
      ${sidebarBtn('web-term', html`<span class="fas fa-terminal"></span> Terminal`)}
      ${sidebarBtn('editor-app', html`<span class="fas fa-edit"></span> Editor`)}
    `
  }

  // events
  // =

  onClickSidebarToggle (e, panel) {
    bg.views.executeSidebarCommand('active', 'toggle-panel', panel)
  }
}
customElements.define('shell-window-footer-menu', ShellWindowFooterMenu)
