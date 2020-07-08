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
      cursor: ns-resize;
    }
    .pane-border.vert {
      width: 2px;
    }
    .pane-border.vert.movable {
      cursor: ew-resize;
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
    document.body.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  // rendering
  // =

  render () {
    if (!this.activeTab || this.activeTab.paneLayout.length <= 1) {
      return html``
    }
    const horzLine = (pane, y, edge) => html`
      <div class="pane-border horz ${pane.isActive ? 'active' : ''} ${!pane.isEdge[edge] ? 'movable' : ''}"
        style="left: ${pane.bounds.x - 2}px; top: ${y}px; width: ${pane.bounds.width + 4}px"
        @mousedown=${e => this.onMouseDown(e, pane, edge)}
        @mousemove=${this.onMouseMove}
        @mouseup=${this.onMouseUp}
      ></div>
    `
    const vertLine = (pane, x, edge) => html`
      <div class="pane-border vert ${pane.isActive ? 'active' : ''} ${!pane.isEdge[edge] ? 'movable' : ''}"
        style="left: ${x}px; top: ${pane.bounds.y - 2}px; height: ${pane.bounds.height + 4}px"
        @mousedown=${e => this.onMouseDown(e, pane, edge)}
        @mousemove=${this.onMouseMove}
        @mouseup=${this.onMouseUp}
      ></div>
    `
    return html`
      ${repeat(this.activeTab.paneLayout, pane => pane.id, pane => html`
        ${horzLine(pane, pane.bounds.y - 2, 'top')}
        ${horzLine(pane, pane.bounds.y + pane.bounds.height, 'bottom')}
        ${vertLine(pane, pane.bounds.x - 2, 'left')}
        ${vertLine(pane, pane.bounds.x + pane.bounds.width, 'right')}
      `)}
    `
  }

  // events
  // =

  onMouseDown (e, pane, edge) {
    e.preventDefault()
    e.stopPropagation()
    this.isResizing = true
    bg.views.setPaneResizeModeEnabled(true, pane.id, edge)
  }

  onMouseMove (e) {
    if (this.isResizing && !e.buttons) {
      bg.views.setPaneResizeModeEnabled(false)
      this.isResizing = false
    }
  }

  onMouseUp (e) {
    if (this.isResizing) {
      bg.views.setPaneResizeModeEnabled(false)
      this.isResizing = false
    }
  }
}
customElements.define('shell-window-panes', ShellWindowPanes)
