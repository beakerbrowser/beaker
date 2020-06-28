/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'

class ShellWindowPanes extends LitElement {
  static get properties () {
    return {
      activeTab: {type: Object}
    }
  }

  static get styles () {
    return css`
    .pane-border {
      position: fixed;
      background: var(--bg-color--paneborder);
      z-index: 1;
    }
    .pane-border.horz {
      height: 2px;
    }
    .pane-border.horz.movable {
      cursor: ew-resize;
    }
    .pane-border.vert {
      width: 2px;
    }
    .pane-border.vert.movable {
      cursor: ns-resize;
    }
    .pane-border.active {
      background: var(--bg-color--paneborder--active);
      z-index: 2;
    }
    `
  }

  constructor () {
    super()
    this.activeTab = undefined
    this.isResizing = false
  }

  // rendering
  // =

  render () {
    if (!this.activeTab) {
      return html``
    }
    const horzLine = (pane, y) => html`
      <div class="pane-border horz ${pane.isActive ? 'active' : ''}"
        style="left: ${pane.bounds.x}px; top: ${y}px; width: ${pane.bounds.width}px"
        @mousedown=${this.onMouseDown}
        @mousemove=${this.onMouseMove}
      ></div>
    `
    const vertLine = (pane, x) => html`
      <div class="pane-border vert ${pane.isActive ? 'active' : ''}"
        style="left: ${x}px; top: ${pane.bounds.y}px; height: ${pane.bounds.height}px"
        @mousedown=${this.onMouseDown}
        @mousemove=${this.onMouseMove}
      ></div>
    `
    return html`
      ${repeat(this.activeTab.paneLayout, pane => pane.id, pane => html`
        ${horzLine(pane, pane.bounds.y)}
        ${horzLine(pane, pane.bounds.y + pane.bounds.height - 2)}
        ${vertLine(pane, pane.bounds.x)}
        ${vertLine(pane, pane.bounds.x + pane.bounds.width - 2)}
      `)}
    `
  }

  // events
  // =

  onMouseDown (e) {
    this.isResizing = true
    bg.beakerBrowser.setSidebarResizeModeEnabled(true)
  }

  onMouseMove (e) {
    if (this.isResizing && !e.buttons) {
      bg.beakerBrowser.setSidebarResizeModeEnabled(false)
      this.isResizing = false
    }
  }
}
customElements.define('shell-window-panes', ShellWindowPanes)
