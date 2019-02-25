import { LitElement, html } from './vendor/lit-element/lit-element'
import * as bg from './shell-menus/bg-process-rpc'
import './shell-menus/browser'
import './shell-menus/location'

class MenusWrapper extends LitElement {
  static get properties () {
    return {
      currentMenu: {type: String}
    }
  }

  constructor () {
    super()
    this.currentParams = null

    // export interface
    const reset = (name) => {
      try { this.shadowRoot.querySelector(name).reset() }
      catch (e) { /* ignore */ }
    }
    const init = (name) => {
      try { this.shadowRoot.querySelector(name).init(this.currentParams) }
      catch (e) { /* ignore */ }
    }
    window.openMenu = async (v, params) => {
      this.currentMenu = v
      this.currentParams = params
      reset(`${v}-menu`)
      await this.updateComplete
      init(`${v}-menu`)
    }

    // global event listeners
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        bg.shellMenus.close()
      }
    })
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentMenu) {
      case 'browser':
        return html`<browser-menu></browser-menu>`
      case 'location':
        return html`<location-menu></location-menu>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    // e.preventDefault() // disable context menu
  }
}

customElements.define('menus-wrapper', MenusWrapper)