/* globals customElements */
import { ipcRenderer } from 'electron'
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import spinnerCSS from './spinner.css'
import * as bg from './bg-process-rpc'

class ShellWindowTabs extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array},
      isFullscreen: {type: Boolean, attribute: 'is-fullscreen'},
      isBackgroundTrayOpen: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.tabsTransitionState = undefined // used for 'close animations'
    this.isFullscreen = false
    this.draggedTabIndex = null
    this.isDraggingWindow = false
    this.isBackgroundTrayOpen = false
    this.faviconCache = {}

    // use mousemove to ensure that dragging stops if the mouse button isnt pressed
    // (we use this instead of mouseup because mouseup could happen outside the window)
    window.addEventListener('mousemove', e => {
      if (this.isDraggingWindow && (e.buttons & 1) === 0) {
        bg.beakerBrowser.setWindowDragModeEnabled(false)
        this.isDraggingWindow = false
      }
    })

    // listen for commands from the main process
    ipcRenderer.on('command', this.onCommand.bind(this))
    window.doMinimizeToBgAnim = this.doMinimizeToBgAnim.bind(this)
  }

  get tabsState () {
    return this.tabsTransitionState || this.tabs
  }

  getFavicon (index) {
    var tab = this.tabsState[index]
    if (!tab) return
    var cache
    try {
      cache = this.faviconCache[(new URL(tab.url)).origin]
    } catch (e) {
      // invalid URL
    }
    if (tab.favicons && tab.favicons[0]) {
      if (cache && cache.lastTried === tab.favicons[0]) {
        return null // this favicon has been tried and failed
      }
      return tab.favicons[0]
    }
    if (cache) return cache.url // fallback to cache
  }

  render () {
    const shellCls = classMap({
      shell: true,
      [window.platform]: true,
      fullscreen: this.isFullscreen
    })
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div
        class="${shellCls}"
        @mousedown=${this.onMousedownShell}
        @dblclick=${this.onDblclickShell}
      >
        <div class="tabs">
          ${this.backgroundTrayBtn}
          ${repeat(this.tabsState, (tab, index) => this.renderTab(tab, index))}
          <div
            class="unused-space"
            @dragover=${e => this.onDragoverTab(e, this.tabsState.length)}
            @dragleave=${e => this.onDragleaveTab(e, this.tabsState.length)}
            @drop=${e => this.onDropTab(e, this.tabsState.length)}
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
    const faviconUrl = this.getFavicon(index)
    const showFavicon = Boolean(
      tab.isLoading
      || tab.isPinned
      || faviconUrl
      || tab.url.startsWith('beaker:')
    )
    const cls = classMap({tab: true, current: tab.isActive, pinned: tab.isPinned, 'no-favicon': !showFavicon})
    return html`
      <div
        class="${cls}"
        title=${tab.title || tab.url}
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
              : faviconUrl
                ? html`
                  <img
                    src="${faviconUrl}"
                    @load=${e => this.onFaviconLoad(e, index)}
                    @error=${e => this.onFaviconError(e, index)}
                  >
                `
                : html`<img src="asset:favicon:${tab.url}?cache=${Date.now()}">`
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
            ${tab.isActive ? html`
              <div class="tab-minimize" title="Minimize to background" @click=${e => this.onClickMinimize(e, index)}></div>
              <div class="tab-close" title="Close tab" @click=${e => this.onClickClose(e, index)}></div>
            ` : ''}
          `}
      </div>
    `
  }

  get backgroundTrayBtn () {
    const cls = classMap({'background-tray-btn': true, pressed: this.isBackgroundTrayOpen})
    return html`
      <button class=${cls} @click=${this.onClickBackgroundTray}>
        <span class="fas fa-caret-down"></span>
      </button>
    `
  }

  updated (changedProperties) {
    if (changedProperties.has('tabs')) {
      let oldVal = changedProperties.get('tabs') || []
      let [oldLen, newLen] = [oldVal.length, this.tabs.length]
      if (newLen > oldLen) {
        // new tab
        let newTabIndex = this.tabs.findIndex(t1 => !oldVal.find(t2 => t2.id === t1.id))
        if (newTabIndex === -1) return
        Array.from(this.shadowRoot.querySelectorAll('.tabs > .tab'))[newTabIndex].animate([
          { transform: 'scaleX(0)', transformOrigin: 'center left' },
          { transform: 'scaleX(1)', transformOrigin: 'center left' }
        ], {
          duration: 100,
          iterations: 1
        })
      }
    }
  }

  async shouldUpdate (changedProperties) {
    if (changedProperties.has('tabs')) {
      let oldVal = changedProperties.get('tabs') || []
      let [oldLen, newLen] = [oldVal.length, this.tabs.length]
      if (newLen < oldLen) {
        // closed tab
        if (!this.tabsTransitionState) {
          this.tabsTransitionState = oldVal
        }
        let closingTabIndex = this.tabsTransitionState.findIndex(t1 => !this.tabs.find(t2 => t2.id === t1.id))
        if (closingTabIndex === -1) return true
        let el = Array.from(this.shadowRoot.querySelectorAll('.tabs > .tab'))[closingTabIndex]
        let rect = el.getClientRects()[0]
        el.animate([{ width: `${rect.width}px` }, {width: '0px'}], {
          duration: 100,
          iterations: 1
        }).onfinish = () => {
          this.tabsTransitionState = undefined
          this.requestUpdate()
        }
        return false
      }
    }
  }

  doMinimizeToBgAnim () {
    var srcEl = this.shadowRoot.querySelector('.tab.current')
    var dstEl = this.shadowRoot.querySelector('.background-tray-btn')
    if (!srcEl) return console.warn('Minimize anim aborted; source element not found')
    if (!dstEl) return console.warn('Minimize anim aborted; target element not found')

    var src = srcEl.getClientRects()[0]
    var dst = dstEl.getClientRects()[0]
    var dist = Math.abs(src.left - dst.left)
    var animElem = document.createElement('div')
    animElem.classList.add('minimize-to-bg-anim-elem')
    this.shadowRoot.append(animElem)
    const px = v => `${v}px`
    animElem.animate([
      {left: px(src.left), top: px(src.top), width: px(src.width), height: px(src.height)},
      {left: px(dst.left), top: px(dst.top), width: px(dst.width), height: px(dst.height)}
    ], {iterations: 1, duration: Math.max(Math.min(dist / 6, 400), 100)}).onfinish = () => {
      animElem.remove()
      dstEl.animate([
        {background: 'var(--bg-color--background)'},
        {background: 'var(--bg-color--tab--hover)'},
        {background: 'var(--bg-color--background)'}
      ], {duration: 250, iterations: 1})
    }
  }

  // events
  // =

  async onClickBackgroundTray (e) {
    if (Date.now() - (this.lastMenuClick||0) < 100) return
    this.isBackgroundTrayOpen = true
    await bg.views.toggleMenu('background-tray')
    this.isBackgroundTrayOpen = false
    this.lastMenuClick = Date.now()
  }

  onClickNew (e) {
    bg.views.createTab(undefined, {focusLocationBar: true, setActive: true})
  }

  onClickTab (e, index) {
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

  onClickMinimize (e, index) {
    e.preventDefault()
    e.stopPropagation()
    bg.views.minimizeTab(index)
  }

  onClickClose (e, index) {
    e.preventDefault()
    e.stopPropagation()
    bg.views.closeTab(index)
  }

  onFaviconLoad (e, index) {
    var favicons = this.tabsState[index].favicons
    var url = favicons && favicons[0] ? favicons[0] : null
    var origin = (new URL(this.tabsState[index].url)).origin
    this.faviconCache[origin] = {url}
  }

  onFaviconError (e, index) {
    var origin = (new URL(this.tabsState[index].url)).origin
    this.faviconCache[origin] = {
      lastTried: this.tabsState[index].favicons ? this.tabsState[index].favicons[0] : null,
      url: null // serve null from cache always
    }
    this.tabsState[index].favicons = null
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
    
    const url = e.dataTransfer.getData("text")
    if (url && (url.startsWith("https://") || url.startsWith("dat://") || url.startsWith("hyper://"))) {
      e.preventDefault()
      bg.views.createTab(url, {focusLocationBar: true, setActive: true})
      bg.views.reorderTab(this.tabsState.length, index)
      return false;
    }
    if (this.draggedTabIndex !== null && this.canDrop(index)) {
      bg.views.reorderTab(this.draggedTabIndex, index)
    }
    this.draggedTabIndex = null
    return false
  }

  canDrop (index) {
    if (this.draggedTabIndex === null) return false
    var draggingTab = this.tabsState[this.draggedTabIndex]
    var targetTab = this.tabsState[index]
    if (draggingTab.isPinned !== targetTab.isPinned) {
      // only allow tabs to drag within their own pinned/unpinned groups
      return false
    }
    return true
  }

  onMousedownShell (e) {
    const is = v => e.target.classList.contains(v)
    if ((is('shell') || is('tabs') || is('unused-space')) && e.button === 0) {
      this.isDraggingWindow = true
      bg.beakerBrowser.setWindowDragModeEnabled(true)
    }
  }

  onDblclickShell (e) {
    const is = v => e.target.classList.contains(v)
    if (is('shell') || is('tabs') || is('unused-space')) {
      this.isDraggingWindow = false
      bg.beakerBrowser.setWindowDragModeEnabled(false)
      bg.beakerBrowser.toggleWindowMaximized()
    }
  }

  onCommand (e, cmd) {
    if (cmd === 'minimize-to-bg-anim') {
      this.doMinimizeToBgAnim()
    }
  }
}
ShellWindowTabs.styles = css`
${spinnerCSS}

.shell {
  font-family: sans-serif;
  background: var(--bg-color--background);
  position: relative;
  height: 34px;
}

.shell.win32 {
  padding-right: 140px;
}

.tabs {
  display: flex;
  padding: 0 18px 0 10px;
  border-bottom: 1px solid var(--border-color--tab);
  height: 33px;
  max-width: calc(100% - 38px);
}

.background-tray-btn {
  width: 38px;
  height: 30px;
  background: transparent;
  color: var(--text-color--bg-tabs-btn);
  border: 0;
  border-left: 1px solid var(--border-color--tab);
  margin-top: 3px;
  outline: 0;
}

.background-tray-btn:hover,
.background-tray-btn.pressed {
  background: var(--bg-color--tab--hover);
}

.background-tray-btn span {
  font-size: 14px;
  line-height: 16px;
}

.unused-space {
  flex: 1;
  position: relative;
  top: 0px;
  height: 33px;
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
  top: 3px;
  height: 30px;
  width: 235px;
  min-width: 0; /* HACK: https://stackoverflow.com/questions/38223879/white-space-nowrap-breaks-flexbox-layout */
  background: var(--bg-color--background);
  transition: background 0.3s;
  border-left: 1px solid var(--border-color--tab);
}

.tab.pinned {
  flex: 0 0 45px;
}

.tab-favicon {
  width: 16px;
  height: 23px;
  image-rendering: -webkit-optimize-contrast;
  text-align: center;
  position: absolute;
  left: 10px;
  top: 7px;
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
  color: var(--text-color--tab--title);
  font-size: 11.5px;
  letter-spacing: 0.2px;
  padding: 9px 11px 9px 30px;
  height: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab.no-favicon .tab-title {
  padding-left: 11px;
}

.fa-volume-up,
.fa-volume-mute {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 12px;
  color: rgba(0,0,0,.6);
  background: var(--bg-color--background);
  padding: 2px 0 2px 4px;
}

.tab.current .fa-volume-up,
.tab.current .fa-volume-mute {
  background: var(--bg-color--foreground);
}

.tab-nofavicon .tab-title {
  padding-left: 16px;
}

.tab-close,
.tab-minimize {
  opacity: 0;
  position: absolute;
  top: 8px;
  width: 16px;
  height: 16px;
  z-index: 4;
  border-radius: 2px;
  text-align: center;
  color: var(--text-color--tab--close);
  background: var(--bg-color--background);
  transition: background 0.3s;
}

.tab-close {
  right: 8px;
}

.tab-minimize {
  right: 25px;
}

.tab-close:before,
.tab-minimize:before {
  opacity: 0;
}

.tab-close:before {
  display: block;
  content: "\\00D7";
  font-size: 20px;
  font-weight: 200;
  line-height: .71;
}

.tab-minimize:before {
  display: block;
  content: "";
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 3px;
  border-bottom: 1.5px solid;
}

.tab-close:hover:before,
.tab-close:active:before,
.tab-minimize:hover:before,
.tab-minimize:active:before {
  opacity: 1;
}

.tab-close:hover,
.tab-close:active,
.tab-minimize:hover,
.tab-minimize:active  {
  background: var(--bg-color--tab-close--hover);
}

.tab:not(.current):hover,
.tab:not(.current):hover .fa-volume-up,
.tab:not(.current):hover .fa-volume-mute {
  background: var(--bg-color--tab--hover);
}

.tab.current:hover .tab-title {
  padding-right: 40px;
}

.tab:hover .tab-close,
.tab:hover .tab-minimize {
  opacity: 1;
  background: var(--bg-color--tab--hover);
}

.tab:hover .tab-close:hover,
.tab:hover .tab-minimize:hover {
  background: var(--bg-color--tab-close--hover);
}

.tab.current:hover .tab-close:hover,
.tab.current:hover .tab-minimize:hover {
  background: var(--bg-color--tab-close--current--hover);
}

.tab:hover .tab-close:before,
.tab:hover .tab-minimize:before {
  opacity: 1;
}

.tab.current {
  background: var(--bg-color--tab--current);
  height: 31px;
}

.tab.current:before {
  content: '';
  position: absolute;
  left: -1px;
  top: -3px;
  width: calc(100% + 2px);
  height: 3px;
  background: var(--highlight-color--tab--current);
}

.tab.current .tab-close,
.tab.current .tab-minimize {
  background: var(--bg-color--tab--current);
}

.tab.drag-hover {
  background: var(--bg-color--tab--dragover);
}

.tab.tab-add-btn {
  width: 40px;
}

.tab-add-btn .plus {
  position: absolute;
  top: 0;
  display: block;
  font-size: 22px;
  font-weight: 300;
  color: var(--text-color--tab--add);
  margin: 3px 7px;
  width: 26px;
  height: 25px;
  text-align: center;
  line-height: 100%;
}

.tab-add-btn:hover .tab-close:before {
  opacity: 1;
}

.tab-add-btn:hover .plus {
  color: var(--text-color--tab--add--hover);
}

/* make room for traffic lights */
.darwin .tabs {
  padding-left: 75px;
}
.darwin.fullscreen .tabs {
  padding-left: 10px; /* not during fullscreen */
}

.minimize-to-bg-anim-elem {
  position: fixed;
  z-index: 100;
  background: #fffc;
}
`
customElements.define('shell-window-tabs', ShellWindowTabs)
