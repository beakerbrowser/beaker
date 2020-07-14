/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'

const STATUS_BAR_HEIGHT = 22

class ShellWindowPanes extends LitElement {
  static get properties () {
    return {
      activeTab: {type: Object},
      focusAttachId: {type: Number}
    }
  }

  static get styles () {
    return css`
    .pane-background {
      position: fixed;
      background: #fff;
      z-index: 1;
    }
    .pane-border {
      position: fixed;
      background: var(--bg-color--paneborder);
      z-index: 2;
    }
    .pane-border.active {
      z-index: 3;
      background: var(--bg-color--paneborder--active);
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
    .pane-status-bar {
      position: fixed;
      font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Ubuntu, Cantarell, "Oxygen Sans", "Helvetica Neue", sans-serif;
      background: var(--bg-color--pane-status-bar);
      color: var(--text-color--pane-status-bar);
      z-index: 2;
      display: flex;
      align-items: baseline;
      box-sizing: border-box;
      padding: 0 4px;
      font-size: 12px;
      letter-spacing: 0.5px;
      line-height: 23px;
    }
    .pane-status-bar.active {
      color: var(--text-color--pane-status-bar--active);
      background: var(--bg-color--pane-status-bar--active);
    }
    .pane-status-bar .status {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pane-status-bar .indicator {
      position: relative;
      top: -1px;
      font-size: 9px;
      margin: 0 2px;
      color: var(--text-color--pane-status-bar-indicator);
    }
    .pane-status-bar button {
      border: 0;
      font-size: 11px;
      line-height: 12px;
      background: transparent;
      color: inherit;
      padding: 2px 4px;
      border-radius: 2px;
    }
    .pane-status-bar button:hover {
      background: var(--bg-color--pane-status-bar-button--hover);
    }
    .pane-status-bar button.attachment span.icon {
      font-size: 14px;
    }
    .rotate90 {
      transform: rotate(-90deg);
    }
    `
  }

  constructor () {
    super()
    this.activeTab = undefined
    this.isResizing = false
    this.focusAttachId = undefined
    document.body.addEventListener('mousemove', this.onMouseMove.bind(this))
  }

  // rendering
  // =

  render () {
    if (!this.activeTab) {
      return html``
    }
    
    const hasMultiple = this.activeTab.paneLayout.length > 1
    const attachTargets = {}
    for (let pane of this.activeTab.paneLayout) {
      if (pane.attachedPaneId) {
        attachTargets[pane.attachedPaneId] = true
      }
    }

    const background = (pane) => this.isResizing ? '' : html`
      <div class="pane-background"
        style="left: ${pane.bounds.x}px; top: ${pane.bounds.y}px; width: ${pane.bounds.width}px; height: ${pane.bounds.height}px"
      ></div>
    `
    const horzLine = (pane, y, edge) => html`
      <div class="pane-border horz ${!pane.isEdge[edge] ? 'movable' : ''} ${edge === 'top' && pane.isActive ? 'active' : ''}"
        style="left: ${pane.bounds.x - 2}px; top: ${y}px; width: ${pane.bounds.width + 4}px"
        @mousedown=${e => this.onMouseDown(e, pane, edge)}
        @mousemove=${this.onMouseMove}
        @mouseup=${this.onMouseUp}
      ></div>
    `
    const vertLine = (pane, x, edge) => html`
      <div class="pane-border vert ${!pane.isEdge[edge] ? 'movable' : ''}"
        style="left: ${x}px; top: ${pane.bounds.y}px; height: ${pane.bounds.height + 2}px"
        @mousedown=${e => this.onMouseDown(e, pane, edge)}
        @mousemove=${this.onMouseMove}
        @mouseup=${this.onMouseUp}
      ></div>
    `
    const statusBar = (pane) => html`
      <div class="pane-status-bar ${pane.isActive ? 'active' : ''}"
        style="left: ${pane.bounds.x}px; top: ${pane.bounds.y + pane.bounds.height - STATUS_BAR_HEIGHT}px; width: ${pane.bounds.width}px; height: ${STATUS_BAR_HEIGHT}px"
      >
        ${pane.isActive && hasMultiple ? html`<span class="fas fa-circle indicator"></span>` : ''}
        <button @click=${e => this.onClickPaneMenu(e, pane)}>
          <span class="fa fa-bars"></span>
        </button>
        <span class="status">
          ${pane.status || pane.title}
        </span>
        ${hasMultiple ? html`
          <button
            class="attachment"
            @click=${e => this.onClickAttachMenu(e, pane)}
            @mouseover=${e => this.onMouseoverAttachMenu(e, pane)}
            @mouseleave=${e => this.onMouseleaveAttachMenu(e, pane)}
          >
            ${pane.attachedPaneId ? html`
              Attached <span class="icon">⚯</span>
            ` : pane.wantsAttachedPane ? html`
              <span class="icon">⚬</span>
            ` : ''}
          </button>
        ` : ''}
        ${Number(pane.id) === Number(this.focusAttachId) ? html`
          <span class="icon rotate90">☞</span>
        ` : ''}
      </div>
    `

    if (!hasMultiple) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        ${repeat(this.activeTab.paneLayout, pane => pane.id, pane => html`
          ${background(pane)}
          ${statusBar(pane)}
        `)}
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${repeat(this.activeTab.paneLayout, pane => pane.id, pane => html`
        ${background(pane)}
        ${horzLine(pane, pane.bounds.y - 2, 'top')}
        ${!pane.isEdge.bottom ? horzLine(pane, pane.bounds.y + pane.bounds.height, 'bottom') : ''}
        ${!pane.isEdge.right ? vertLine(pane, pane.bounds.x + pane.bounds.width, 'right') : ''}
        ${statusBar(pane)}
      `)}
    `
  }

  // events
  // =

  onMouseDown (e, pane, edge) {
    e.preventDefault()
    e.stopPropagation()
    this.isResizing = true
    this.requestUpdate()
    bg.views.setPaneResizeModeEnabled(true, pane.id, edge)
  }

  onMouseMove (e) {
    if (this.isResizing && !e.buttons) {
      bg.views.setPaneResizeModeEnabled(false)
      this.isResizing = false
      this.requestUpdate()
    }
  }

  onMouseUp (e) {
    if (this.isResizing) {
      bg.views.setPaneResizeModeEnabled(false)
      this.isResizing = false
      this.requestUpdate()
    }
  }

  onClickPaneMenu (e, pane) {
    bg.views.openPaneMenu(pane.id)
  }

  onClickAttachMenu (e, pane) {
    bg.views.openAttachMenu(pane.id)
  }

  onMouseoverAttachMenu (e, pane) {
    this.focusAttachId = pane.attachedPaneId
  }

  onMouseleaveAttachMenu (e, pane) {
    this.focusAttachId = undefined
  }
}
customElements.define('shell-window-panes', ShellWindowPanes)
