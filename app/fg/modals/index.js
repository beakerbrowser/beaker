/* globals customElements */
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import './setup'
import './create-drive'
import './clone-drive'
import './drive-properties'
import './select-drive'
import './select-file'
import './prompt'
import './basic-auth'
import './user'

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
    this.fetchBrowserInfo()

    // export interface
    window.runModal = this.runModal.bind(this)

    // global event listeners
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.cbs.reject(new Error('Canceled'))
      }
    })
  }

  async fetchBrowserInfo () {
    var {platform} = await bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }
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
      case 'create-drive':
        return html`<create-drive-modal></create-drive-modal>`
      case 'clone-drive':
        return html`<clone-drive-modal></clone-drive-modal>`
      case 'drive-properties':
        return html`<drive-properties-modal></drive-properties-modal>`
      case 'select-drive':
        return html`<select-drive-modal></select-drive-modal>`
      case 'select-file':
        return html`<select-file-modal></select-file-modal>`
      case 'prompt':
        return html`<prompt-modal></prompt-modal>`
      case 'basic-auth':
        return html`<basic-auth-modal></basic-auth-modal>`
      case 'user':
        return html`<user-modal></user-modal>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    // e.preventDefault() // disable context menu RESTOREME
  }
}

customElements.define('modals-wrapper', ModalsWrapper)