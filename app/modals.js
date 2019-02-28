import { LitElement, html } from './vendor/lit-element/lit-element'
import './modals/create-archive'
import './modals/fork-archive'
import './modals/select-archive'

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

    // global event listeners
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        this.cbs.reject(new Error('Canceled'))
      }
    })
  }

  async runModal (name, params) {
    this.currentModal = name
    await this.updateComplete
    return new Promise((resolve, reject) => {
      this.cbs = {resolve, reject}
      this.shadowRoot.querySelector(`${name}-modal`).init(params, {resolve, reject})
    })
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentModal) {
      case 'create-archive':
        return html`<create-archive-modal></create-archive-modal>`
      case 'fork-archive':
        return html`<fork-archive-modal></fork-archive-modal>`
      case 'select-archive':
        return html`<select-archive-modal></select-archive-modal>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('modals-wrapper', ModalsWrapper)