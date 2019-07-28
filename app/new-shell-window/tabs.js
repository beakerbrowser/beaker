/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import { urlsToData } from '../lib/fg/img.js'
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
    this.isDraggingWindow = false

    // use mousemove to ensure that dragging stops if the mouse button isnt pressed
    // (we use this instead of mouseup because mouseup could happen outside the window)
    window.addEventListener('mousemove', e => {
      if (this.isDraggingWindow && (e.buttons & 1) === 0) {
        bg.beakerBrowser.setWindowDragModeEnabled(false)
        this.isDraggingWindow = false
      }
    })
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
            @mousedown=${this.onMousedownUnusedSpace}
            @dblclick=${this.onDblclickUnusedSpace}
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
    const showFavicon = (
      tab.isLoading
      || tab.isPinned
      || (tab.favicons && tab.favicons[0])
      || tab.url.startsWith('beaker:')
    )
    const cls = classMap({tab: true, current: tab.isActive, pinned: tab.isPinned, 'no-favicon': !showFavicon})
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
        ${showFavicon ? html`
          <div class="tab-favicon">
            ${tab.isLoading
              ? tab.isReceivingAssets
                ? html`<div class="spinner"></div>`
                : html`<div class="spinner reverse"></div>`
              : tab.favicons && tab.favicons[0]
                ? html`
                  <img
                    src="${tab.favicons[tab.favicons.length - 1]}"
                    @load=${e => this.onFaviconLoad(e, index)}
                    @error=${e => this.onFaviconError(e, index)}
                  >
                `
                : html`<img src="beaker-favicon:${tab.url}?cache=${Date.now()}">`
            }
          </div>
        ` : ''}
        ${tab.isPinned
          ? ''
          : html`
            <div class="tab-title">${tab.title || tab.url}</div>
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

  updated (changedProperties) {
    if (changedProperties.has('tabs')) {
      var oldVal = changedProperties.get('tabs') || []
      var [oldLen, newLen] = [oldVal.length, this.tabs.length]
      if (newLen > oldLen) {
        // animate new tabs
        Array.from(this.shadowRoot.querySelectorAll('.tabs > .tab')).pop().animate([
          { transform: 'scaleX(0)' },
          { transform: 'scaleX(1)' }
        ], {
          duration: 200,
          iterations: 1
        })
      }
    }
  }

  // events
  // =

  onClickNew (e) {
    bg.views.createTab(undefined, {focusLocationBar: true, setActive: true})
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

  async onFaviconLoad (e, index) {
    // favicon loaded successfuly, capture for cache
    var tab = this.tabs[index]
    var {dataUrl} = await urlsToData(tab.favicons)
    bg.views.onFaviconLoadSuccess(index, dataUrl)
  }

  onFaviconError (e, index) {
    this.tabs[index].favicons = null
    bg.views.onFaviconLoadError(index)
    this.requestUpdate()
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

  onMousedownUnusedSpace (e) {
    if (e.button === 0) {
      this.isDraggingWindow = true
      bg.beakerBrowser.setWindowDragModeEnabled(true)
    }
  }

  onDblclickUnusedSpace (e) {
    bg.beakerBrowser.maximizeWindow()
  }
}
ShellWindowTabs.styles = css`
${spinnerCSS}

.shell {
  background: var(--bg-background);
  position: relative;
  padding: 0 18px 0 0px;
  height: 34px;
  border-bottom: 1px solid var(--color-border);
}

.shell.win32 {
  padding-right: 150px;
}

.tabs {
  display: flex;
  padding-left: 10px;
  height: 34px;
}

.unused-space {
  flex: 1;
  position: relative;
  top: 0px;
  height: 34px;
  border-left: 1px solid var(--color-border);
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
  top: 0px;
  height: 34px;
  width: 235px;
  min-width: 0; /* HACK: https://stackoverflow.com/questions/38223879/white-space-nowrap-breaks-flexbox-layout */
  border: 1px solid transparent;
}

.tab.pinned {
  flex: 0 0 45px;
}

.tab-favicon {
  width: 16px;
  height: 23px;
  text-align: center;
  position: absolute;
  left: 10px;
  top: 9px;
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
  padding: 11px 11px 9px 30px;
  height: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-left: 1px solid var(--color-border);
}

.tab.no-favicon .tab-title {
  padding-left: 11px;
}

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
  top: 8px;
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
  width: 40px;
}

.tab-add-btn .plus {
  position: absolute;
  top: 0;
  display: block;
  font-size: 22px;
  font-weight: 300;
  color: var(--color-tab-add);
  margin: 4px 7px;
  width: 26px;
  height: 25px;
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
  position: relative;
  background: var(--bg-tab--current);
  border: 1px solid var(--color-border);
  border-top: 0;
  border-bottom: 0;
  top: 1px;
}

.tab.current:before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 2px;
  background: #0f8aea;
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

.tab.current + .unused-space {
  border-left-color: transparent;
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
