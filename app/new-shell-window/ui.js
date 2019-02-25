import { LitElement, html } from './lit-element/lit-element'
import * as bg from './bg-process-rpc'
import './tabs'
import './navbar'

class ShellWindowUI extends LitElement {
  static get properties () {
    return {
      tabs: {type: Array}
    }
  }

  constructor () {
    super()
    this.tabs = []
    this.activeTabIndex = -1

    var {platform} = bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }

    bg.views.createEventStream().on('data', evt => {
      switch (evt[0]) {
        case 'replace-state':
          console.log('replace-state', evt[1])
          this.tabs = evt[1]
          this.stateHasChanged()
          break
        case 'update-state':
          console.log('update-state', evt[1])
          var {index, state} = evt[1]
          if (this.tabs[index]) {
            Object.assign(this.tabs[index], state)
          }
          this.stateHasChanged()
          break
      }
    })

    bg.views.getState().then(state => {
      console.log('got state', state)
      this.tabs = state
      this.stateHasChanged()
    })
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

  render () {
    return html`
      <shell-window-tabs .tabs=${this.tabs}></shell-window-tabs>
      <shell-window-navbar .activeTabIndex=${this.activeTabIndex} .activeTab=${this.activeTab}></shell-window-navbar>
    `
  }
}
customElements.define('shell-window', ShellWindowUI);

