/* globals customElements */
import {LitElement, html, css} from '../vendor/lit-element/lit-element'
import {classMap} from '../vendor/lit-element/lit-html/directives/class-map'
import {repeat} from '../vendor/lit-element/lit-html/directives/repeat'
import spinnerCSS from './spinner.css'
import * as bg from './bg-process-rpc'

class ShellWindowTabs extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array},
      isFullscreen: {type: Boolean, attribute: 'is-fullscreen'}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.isFullscreen = false
    this.draggedTabIndex = null
  }

  render () {
    const shellCls = classMap({
      shell: true,
      [window.platform]: true,
      fullscreen: this.isFullscreen
    })
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="${shellCls}">
        <div class="tabs">
          ${repeat(this.tabs, (tab, index) => this.renderTab(tab, index))}
          <div
            class="unused-space"
            @dragover=${e => this.onDragoverTab(e, this.tabs.length)}
            @dragleave=${e => this.onDragleaveTab(e, this.tabs.length)}
            @drop=${e => this.onDropTab(e, this.tabs.length)}
          >
            <div class="tab tab-add-btn" @click=${this.onClickNew} title="Open new tab">
              <span class="plus">+</span>
            </div>
          </div>
        </div>
      </div>
    `
  }

  renderTab (tab, index) {
    const cls = classMap({tab: true, current: tab.isActive, pinned: tab.isPinned})
    return html`
      <div
        class="${cls}"
        draggable="true"
        @click=${e => this.onClickTab(e, index)}
        @contextmenu=${e => this.onContextmenuTab(e, index)}
        @mousedown=${e => this.onMousedownTab(e, index)}
        @dragstart=${e => this.onDragstartTab(e, index)}
        @dragend=${e => this.onDragendTab(e, index)}
        @dragover=${e => this.onDragoverTab(e, index)}
        @dragleave=${e => this.onDragleaveTab(e, index)}
        @drop=${e => this.onDropTab(e, index)}
      >
        <div class="tab-favicon">
          ${tab.isLoading
            ? tab.isReceivingAssets
              ? html`<div class="spinner"></div>`
              : html`<div class="spinner reverse"></div>`
            : html`<img src="beaker-favicon:${tab.url}?cache=${Date.now()}">`}
        </div>
        ${tab.isPinned
          ? ''
          : html`
            <div class="tab-title">${tab.title}</div>
            ${tab.isAudioMuted
              ? html`<span class="fas fa-volume-mute"></span>`
              : tab.isCurrentlyAudible
                ? html`<span class="fas fa-volume-up"></span>`
                : ''}
            <div class="tab-close" title="Close tab" @click=${e => this.onClickClose(e, index)}></div>
          `}
      </div>
    `
  }

  // events
  // =

  async onClickNew (e) {
    var index = await bg.views.createTab()
    bg.views.setActiveTab(index)
  }

  onClickTab (e, index) {
    // optimistically update frontend (improves perceived performance)
    this.tabs.find(t => t.isActive).isActive = false
    this.tabs[index].isActive = true
    this.requestUpdate()

    // call to backend
    bg.views.setActiveTab(index)
  }

  onContextmenuTab (e, index) {
    bg.views.showTabContextMenu(index)
  }

  onMousedownTab (e, index) {
    // middle click
    if (e.which === 2) {
      bg.views.closeTab(index)
    }
  }

  onClickClose (e, index) {
    e.preventDefault()
    e.stopPropagation()
    bg.views.closeTab(index)
  }

  onDragstartTab (e, index) {
    this.draggedTabIndex = index
    e.dataTransfer.effectAllowed = 'move'
  }

  onDragendTab (e, index) {
    // TODO needed?
  }

  onDragoverTab (e, index) {
    if (e.dataTransfer.files.length) {
      return // allow toplevel event-handler to handle
    }
    e.preventDefault()

    if (!this.canDrop(index)) {
      return false
    }

    e.currentTarget.classList.add('drag-hover')
    e.dataTransfer.dropEffect = 'move'
    return false
  }

  onDragleaveTab (e, index) {
    e.currentTarget.classList.remove('drag-hover')
  }

  onDropTab (e, index) {
    if (e.dataTransfer.files.length) {
      return // allow toplevel event-handler to handle
    }
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-hover')

    if (this.draggedTabIndex !== null && this.canDrop(index)) {
      bg.views.reorderTab(this.draggedTabIndex, index)
    }
    this.draggedTabIndex = null
    return false
  }

  canDrop (index) {
    if (this.draggedTabIndex === null) return false
    var draggingTab = this.tabs[this.draggedTabIndex]
    var targetTab = this.tabs[index]
    if (draggingTab.isPinned !== targetTab.isPinned) {
      // only allow tabs to drag within their own pinned/unpinned groups
      return false
    }
    return true
  }
}
ShellWindowTabs.styles = css`
${spinnerCSS}

.shell {
  background: var(--bg-background);
  position: relative;
  padding: 0 18px 0 0px;
  height: 36px;
  border-bottom: 1px solid var(--color-border);
}

.shell.win32 {
  padding-right: 150px;
}

.tabs {
  display: flex;
  padding-left: 10px;
  height: 36px;
}

.unused-space {
  flex: 1;
  position: relative;
  top: 6px;
  height: 30px;
}

.tabs * {
  -webkit-user-select: none;
  cursor: default;
  font-size: 12px;
  line-height: 13px;
}

.tab {
  display: inline-block;
  position: relative;
  top: 6px;
  height: 30px;
  width: 235px;
  -webkit-app-region: no-drag;
  border: 1px solid transparent;
}

.tab.pinned {
  width: 45px;
}

.tab-favicon {
  width: 16px;
  height: 23px;
  text-align: center;
  position: absolute;
  left: 10px;
  top: 8px;
  z-index: 3;
}

.tab-favicon img {
  width: 16px;
  height: 16px;
}

.tab-favicon .spinner {
  position: relative;
  left: 1px;
  top: 1px;
  width: 10px;
  height: 10px;
}

.tab.pinned .tab-favicon {
  left: 14px;
}

.tab-title {
  color: var(--color-tab);
  padding: 9px 11px 5px 30px;
  height: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-left: 1px solid var(--color-border);
}

.tab:first-child .tab-title,
.tab.current .tab-title,
.tab.current + .tab .tab-title {
  border-left-color: transparent;
}

.fa-volume-up,
.fa-volume-mute {
  position: absolute;
  top: 9px;
  right: 10px;
  font-size: 12px;
  color: rgba(0,0,0,.6);
}

.tab-nofavicon .tab-title {
  padding-left: 16px;
}

.tab-close {
  display: none;
  position: absolute;
  right: 8px;
  top: 7px;
  width: 16px;
  height: 16px;
  z-index: 2;
  border-radius: 2px;
  text-align: center;
  color: var(--color-tab-close);
}

.tab-close:before {
  display: block;
  content: "\\00D7";
  font-size: 20px;
  font-weight: 200;
  opacity: 0;
  line-height: .71;
}

.tab-close:hover:before,
.tab-close:active:before {
  opacity: 1;
}

.tab-close:hover,
.tab-close:active {
  background: var(--bg-tab-close--hover);
}

.tab.tab-add-btn {
  top: 0;
  width: 36px;
}

.tab-add-btn .plus {
  position: absolute;
  top: 0;
  display: block;
  font-size: 19px;
  font-weight: 300;
  color: var(--color-tab-add);
  margin: 4px 7px;
  width: 22px;
  height: 21px;
  text-align: center;
  line-height: 100%;
  border-radius: 2px;
}

.tab.tab-add-btn:hover {
  background: inherit;
}

.tab-add-btn:hover .tab-close:before {
  opacity: 1;
}

.tab-add-btn:hover .plus {
  background: var(--bg-tab-add--hover);
  color: var(--color-tab-add--hover);
}

.tab:not(.current):hover .tab-title {
  background: var(--bg-tab--hover);
}

/* add a gradient effect */
.tab:not(.current):hover .tab-title:after {
  content: '';
  display: block;
  position: absolute;
  right: 0;
  top: 0;
  height: 27px;
  width: 60px;
  background: linear-gradient(to right, #d2d2d200, #d2d2d2ff);
}

.tab:hover .tab-close {
  display: block;
  background: var(--bg-tab--hover);
}

.tab:hover .tab-close:hover {
  background: var(--bg-tab-close--hover);
}

.tab.current:hover .tab-close:hover {
  background: var(--bg-tab-close--current--hover);
}

.tab:hover .tab-close:before {
  opacity: 1;
}

.tab.current {
  background: var(--bg-tab--current);
  border: 1px solid var(--color-border);
  border-bottom: 0;
  border-radius: 3px 3px 0 0;
}

.tab.current .tab-favicon {
  top: 8px;
}

.tab.current .tab-title {
  padding-top: 9px;
}

.tab.current .tab-title:after {
  /* adjust color */
  background: linear-gradient(to right, rgba(247,247,247,0), rgb(247, 247, 247));
}

.tab.current .tab-close {
  background: var(--bg-tab--current);
}

.tab.drag-hover .tab-title {
  background: #bbb;
}

.tab.current.drag-hover {
  border-color: #888;
}

.tab.current.drag-hover .tab-title {
  background: #eee;
}

/* draggable region for OSX and windows */
.win32 .tabs,
.darwin .tabs {
  -webkit-app-region: drag;
}

/* make room for traffic lights */
.darwin .tabs {
  padding-left: 75px;
}
.darwin.fullscreen .tabs {
  padding-left: 10px; /* not during fullscreen */
}
`
customElements.define('shell-window-tabs', ShellWindowTabs)
