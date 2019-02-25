import { LitElement, html } from './vendor/lit-element/lit-element'
import './shell-menus/browser'

class MenusWrapper extends LitElement {
  static get properties () {
    return {
      currentMenu: {type: String}
    }
  }

  constructor () {
    super()

    // export interface
    window.openMenu = v => {
      this.currentMenu = v
      try {
        this.shadowRoot.querySelector('browser-menu').reset()
      } catch (e) {
        console.log('failed to reset')
      }
    }
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentMenu) {
      case 'browser':
        return html`<browser-menu></browser-menu>`
    }
    return html`
      <div>Unsupported menu: ${this.currentMenu}</div>
    `
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('menus-wrapper', MenusWrapper)