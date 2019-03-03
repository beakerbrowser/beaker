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
      isUpdateAvailable: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.isUpdateAvailable = false
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
    
    var browserEvents = fromEventStream(bg.beakerBrowser.createEventsStream())
    browserEvents.addEventListener('updater-state-changed', this.onUpdaterStateChange.bind(this))

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

  onUpdaterStateChange (e) {
    this.isUpdateAvailable = (e && e.state === 'downloaded')
  }

  render () {
    return html`
      <shell-window-tabs .tabs=${this.tabs}></shell-window-tabs>
      <shell-window-navbar
        .activeTabIndex=${this.activeTabIndex}
        .activeTab=${this.activeTab}
        ?is-update-available=${this.isUpdateAvailable}
      ></shell-window-navbar>
    `
  }
}

customElements.define('shell-window', ShellWindowUI)