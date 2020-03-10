/* globals customElements */
import {LitElement, html, css} from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'

const WIDTH = 6
const HALF_WIDTH = WIDTH / 2

class ShellWindowSidebarResizer extends LitElement {
  static get properties () {
    return {
      activeTabIndex: {type: Number},
      activeTab: {type: Object}
    }
  }

  static get styles () {
    return css`
    #resizer {
      position: fixed;
      top: 76px;
      height: 100vh;
      width: 6px;
      cursor: ew-resize;
      background: #334;
    }

    :host(.fullheight) #resizer {
      top: 0;
    }
    `
  }

  constructor () {
    super()
    this.activeTabIndex = -1
    this.activeTab = undefined
    this.isResizing = false
  }

  // rendering
  // =

  render () {
    if (!this.activeTab || !this.activeTab.isSidebarActive) {
      return html``
    }
    return html`
      <div id="resizer" style="left: ${this.activeTab.sidebarWidth - HALF_WIDTH}px" @mousedown=${this.onMouseDown} @mousemove=${this.onMouseMove}>
      </div>
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
customElements.define('shell-window-sidebar-resizer', ShellWindowSidebarResizer)
