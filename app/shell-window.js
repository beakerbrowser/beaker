import { ipcRenderer } from 'electron'
import { LitElement, html } from './vendor/lit-element/lit-element'
import * as bg from './new-shell-window/bg-process-rpc'
import { fromEventStream } from '@beaker/core/web-apis/fg/event-target'
import './new-shell-window/tabs'
import './new-shell-window/navbar'

// setup
document.addEventListener('DOMContentLoaded', () => {
  ipcRenderer.send('shell-window:ready')
})

class ShellWindowUI extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array},
      isUpdateAvailable: {type: Boolean},
      numWatchlistNotifications: {type: Number}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.isUpdateAvailable = false
    this.numWatchlistNotifications = 0
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

    // listen to state updates to the window's tabs states
    var viewEvents = fromEventStream(bg.views.createEventStream())
    viewEvents.addEventListener('replace-state', (tabs) => {
      this.tabs = tabs
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
    }
  }

  // rendering
  // =

  render () {
    return html`
      <shell-window-tabs .tabs=${this.tabs}></shell-window-tabs>
      <shell-window-navbar
        .activeTabIndex=${this.activeTabIndex}
        .activeTab=${this.activeTab}
        ?is-update-available=${this.isUpdateAvailable}
        num-watchlist-notifications="${this.numWatchlistNotifications}"
      ></shell-window-navbar>
    `
  }

  // event handlers
  // =

  onUpdaterStateChange (e) {
    this.isUpdateAvailable = (e && e.state === 'downloaded')
  }
}

customElements.define('shell-window', ShellWindowUI)