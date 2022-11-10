/* globals customElements */

import { ipcRenderer } from 'electron'
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import { fromEventStream } from '../../bg/web-apis/fg/event-target'
import './tabs'
import './navbar'
import './panes'
import './resize-hackfix'

// setup
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('shell-window:ready')
})

class ShellWindowUI extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array},
      isWindows: {type: Boolean},
      isUpdateAvailable: {type: Boolean},
      numWatchlistNotifications: {type: Number},
      isHolepunchable: {type: Boolean},
      isDaemonActive: {type: Boolean},
      isShellInterfaceHidden: {type: Boolean},
      isFullscreen: {type: Boolean},
      hasBgTabs: {type: Boolean},
      hasLocationExpanded: {type: Boolean},
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.isUpdateAvailable = false
    this.numWatchlistNotifications = 0
    this.isHolepunchable = true
    this.isDaemonActive = true
    this.isShellInterfaceHidden = false
    this.isFullscreen = false
    this.hasBgTabs = false
    this.hasLocationExpanded = false
    this.activeTabIndex = -1
    this.setup()
  }

  async setup () {
    // fetch platform information
    var browserInfo = await bg.beakerBrowser.getInfo()
    window.platform = browserInfo.platform
    if (browserInfo.platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (browserInfo.platform === 'win32') {
      document.body.classList.add('win32')
      this.isWindows = true
    }

    // handle drag/drop of files
    window.addEventListener('drop', onDragDrop, false)
    function onDragDrop (event) {
      var files = Array.from(event.dataTransfer.files).slice(0, 10)
      var setActive = true
      for (let file of files) {
        bg.views.createTab(`file://${file.path}`, {setActive})
        setActive = false
      }
    }

    // listen to state updates to the window's tabs states
    var viewEvents = fromEventStream(bg.views.createEventStream())
    viewEvents.addEventListener('replace-state', state => {
      this.tabs = state.tabs
      this.isFullscreen = state.isFullscreen
      this.isShellInterfaceHidden = state.isShellInterfaceHidden
      this.isSidebarHidden = state.isSidebarHidden
      this.isDaemonActive = state.isDaemonActive
      this.hasBgTabs = state.hasBgTabs
      this.stateHasChanged()
    })
    viewEvents.addEventListener('update-state', ({index, state}) => {
      if (this.tabs[index]) {
        Object.assign(this.tabs[index], state)
      }
      this.stateHasChanged()
    })
    viewEvents.addEventListener('update-panes-state', ({index, paneLayout}) => {
      if (this.tabs[index]) {
        this.tabs[index].paneLayout = paneLayout
      }
      this.shadowRoot.querySelector('shell-window-panes').requestUpdate()
    })

    // listen to state updates on the auto-updater
    var browserEvents = fromEventStream(bg.beakerBrowser.createEventsStream())
    browserEvents.addEventListener('updater-state-changed', this.onUpdaterStateChange.bind(this))

    // listen to state updates on the watchlist
    var wlEvents = fromEventStream(bg.watchlist.createEventsStream())
    wlEvents.addEventListener('resolved', () => {
      this.numWatchlistNotifications++
    })

    const getDaemonStatus = async () => {
      var status = await bg.beakerBrowser.getDaemonStatus()
      // HACK: don't indicate 'not holepunchable' if the daemon isnt active to tell us
      var isHolepunchable = status.holepunchable || !status.active
      if (this.isHolepunchable !== isHolepunchable) {
        this.isHolepunchable = isHolepunchable
        this.stateHasChanged()
      }
    }

    // fetch initial tab state
    this.isUpdateAvailable = browserInfo.updater.state === 'downloaded'
    this.tabs = await bg.views.getState()
    this.stateHasChanged()
    getDaemonStatus()
  }

  get activeTab () {
    return this.tabs[this.activeTabIndex]
  }

  async stateHasChanged () {
    // update active index
    this.activeTabIndex = this.tabs.findIndex(tab => tab.isActive)

    await this.requestUpdate()
    if (!this.isShellInterfaceHidden) {
      this.shadowRoot.querySelector('shell-window-tabs').requestUpdate()
      if (this.activeTab) {
        this.shadowRoot.querySelector('shell-window-navbar').requestUpdate()
      }
    }
    this.shadowRoot.querySelector('shell-window-panes').requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      ${this.isWindows ? html`<shell-window-win32></shell-window-win32>` : ''}
      ${this.isShellInterfaceHidden ? '' : html`
        <shell-window-tabs .tabs=${this.tabs} ?is-fullscreen=${this.isFullscreen} ?has-bg-tabs=${this.hasBgTabs}></shell-window-tabs>
        <shell-window-navbar
          .activeTabIndex=${this.activeTabIndex}
          .activeTab=${this.activeTab}
          ?is-sidebar-hidden=${this.isSidebarHidden}
          ?is-update-available=${this.isUpdateAvailable}
          ?is-holepunchable=${this.isHolepunchable}
          ?is-daemon-active=${this.isDaemonActive}
          num-watchlist-notifications="${this.numWatchlistNotifications}"
        ></shell-window-navbar>
      `}
      <shell-window-panes .activeTab=${this.activeTab}></shell-window-panes>
    `
  }

  // event handlers
  // =

  onUpdaterStateChange (e) {
    this.isUpdateAvailable = (e && e.state === 'downloaded')
  }
}

customElements.define('shell-window', ShellWindowUI)