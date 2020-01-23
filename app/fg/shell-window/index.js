/* globals customElements */

import { ipcRenderer } from 'electron'
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import { fromEventStream } from '../../bg/web-apis/fg/event-target'
import './win32'
import './tabs'
import './navbar'
import './sidebar-resizer'
import './footer-menu'
import './resize-hackfix'

// setup
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('shell-window:ready')
})

class ShellWindowUI extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array},
      isUpdateAvailable: {type: Boolean},
      numWatchlistNotifications: {type: Number},
      isShellInterfaceHidden: {type: Boolean},
      isFullscreen: {type: Boolean},
      hasLocationExpanded: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.isUpdateAvailable = false
    this.numWatchlistNotifications = 0
    this.isShellInterfaceHidden = false
    this.isFullscreen = false
    this.hasLocationExpanded = false
    this.activeTabIndex = -1

    // fetch platform information
    var {platform} = bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
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
    viewEvents.addEventListener('replace-state', ({tabs, isFullscreen, isShellInterfaceHidden}) => {
      this.tabs = tabs
      this.isFullscreen = isFullscreen
      this.isShellInterfaceHidden = isShellInterfaceHidden
      this.stateHasChanged()
    })
    viewEvents.addEventListener('update-state', ({index, state}) => {
      if (this.tabs[index]) {
        Object.assign(this.tabs[index], state)
      }
      this.stateHasChanged()
    })

    // listen to state updates on the auto-updater
    var browserEvents = fromEventStream(bg.beakerBrowser.createEventsStream())
    browserEvents.addEventListener('updater-state-changed', this.onUpdaterStateChange.bind(this))

    // listen to state updates on the watchlist
    var wlEvents = fromEventStream(bg.watchlist.createEventsStream())
    wlEvents.addEventListener('resolved', () => {
      this.numWatchlistNotifications++
    })

    // fetch initial tab state
    bg.views.getState().then(state => {
      this.tabs = state
      this.stateHasChanged()
    })
    this.isUpdateAvailable = bg.beakerBrowser.getInfo().updater.state === 'downloaded'
  }

  get activeTab () {
    return this.tabs[this.activeTabIndex]
  }

  stateHasChanged () {
    // update active index
    this.activeTabIndex = this.tabs.findIndex(tab => tab.isActive)

    this.requestUpdate()
    this.shadowRoot.querySelector('shell-window-tabs').requestUpdate()
    if (this.activeTab) {
      this.shadowRoot.querySelector('shell-window-navbar').requestUpdate()
      this.shadowRoot.querySelector('shell-window-sidebar-resizer').requestUpdate()
      this.shadowRoot.querySelector('shell-window-footer-menu').requestUpdate()
    }
  }

  // rendering
  // =

  render () {
    return html`
      <shell-window-win32></shell-window-win32>
      ${this.isShellInterfaceHidden ? '' : html`
        <shell-window-tabs .tabs=${this.tabs} ?is-fullscreen=${this.isFullscreen}></shell-window-tabs>
        <shell-window-navbar
          .activeTabIndex=${this.activeTabIndex}
          .activeTab=${this.activeTab}
          ?is-update-available=${this.isUpdateAvailable}
          num-watchlist-notifications="${this.numWatchlistNotifications}"
        ></shell-window-navbar>
      `}
      <shell-window-sidebar-resizer
        .activeTabIndex=${this.activeTabIndex}
        .activeTab=${this.activeTab}
      ></shell-window-sidebar-resizer>
      <shell-window-footer-menu
        .activeTabIndex=${this.activeTabIndex}
        .activeTab=${this.activeTab}
      ></shell-window-footer-menu>
    `
  }

  // event handlers
  // =

  onUpdaterStateChange (e) {
    this.isUpdateAvailable = (e && e.state === 'downloaded')
  }
}

customElements.define('shell-window', ShellWindowUI)