/* globals customElements */
import { LitElement, html } from './vendor/lit-element/lit-element'
import * as bg from './modals/bg-process-rpc'
import './modals/setup'
import './modals/create-archive'
import './modals/fork-archive'
import './modals/select-archive'
import './modals/prompt'
import './modals/basic-auth'

class ModalsWrapper extends LitElement {
  static get properties () {
    return {
      currentModal: {type: String}
    }
  }

  constructor () {
    super()
    this.currentModal = null
    this.cbs = null

    // export interface
    window.runModal = this.runModal.bind(this)

    // fetch platform information
    var {platform} = bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }

    // global event listeners
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.cbs.reject(new Error('Canceled'))
      }
    })
  }

  async runModal (name, params) {
    window.isModalActive = true
    this.currentModal = name
    await this.updateComplete
    return new Promise((resolve, reject) => {
      this.cbs = {resolve, reject}
      this.shadowRoot.querySelector(`${name}-modal`).init(params, {resolve, reject})
    }).then(
      v => { window.isModalActive = false; return v },
      v => { window.isModalActive = false; throw v }
    )
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentModal) {
      case 'setup':
        return html`<setup-modal></setup-modal>`
      case 'create-archive':
        return html`<create-archive-modal></create-archive-modal>`
      case 'fork-archive':
        return html`<fork-archive-modal></fork-archive-modal>`
      case 'select-archive':
        return html`<select-archive-modal></select-archive-modal>`
      case 'prompt':
        return html`<prompt-modal></prompt-modal>`
      case 'basic-auth':
        return html`<basic-auth-modal></basic-auth-modal>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('modals-wrapper', ModalsWrapper)