/* globals customElements */
import {LitElement, html, css} from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'

const WIDTH = 6
const HALF_WIDTH = WIDTH / 2

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
      font-size: 12px;
      padding: 0 5px;
      box-sizing: border-box;
      border-top: 1px solid #445;
      background: #334;
      color: #eef;
    }
    a {
      padding: 0 8px;
      height: 24px;
      box-sizing: border-box;
      text-align: center;
      line-height: 24px;
      cursor: pointer;
    }
    a.pressed,
    a:hover {
      background: #223;
      color: #fff;
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
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <a @click=${e => this.onClickSidebarToggle(e, 'web-term')}><span class="fas fa-terminal"></span> Terminal</a>
      <a @click=${e => this.onClickSidebarToggle(e, 'editor-app')}><span class="fas fa-edit"></span> Editor</a>
    `
  }

  // events
  // =

  onClickSidebarToggle (e, panel) {
    bg.views.executeSidebarCommand('active', 'toggle-panel', panel)
  }
}
customElements.define('shell-window-footer-menu', ShellWindowFooterMenu)
