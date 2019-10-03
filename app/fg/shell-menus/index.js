/* globals customElements */
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import './browser'
import './users'
import './bookmark'
import './donate'

class MenusWrapper extends LitElement {
  static get properties () {
    return {
      currentMenu: {type: String}
    }
  }

  constructor () {
    super()
    this.currentParams = null

    // fetch platform information
    var {platform} = bg.beakerBrowser.getInfo()
    window.platform = platform
    if (platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (platform === 'win32') {
      document.body.classList.add('win32')
    }

    // export interface
    const reset = (name) => {
      if (!name.endsWith('-menu')) name += '-menu'
      try { this.shadowRoot.querySelector(name).reset() }
      catch (e) { /* ignore */ }
    }
    const init = (name) => {
      try { return this.shadowRoot.querySelector(name).init(this.currentParams) }
      catch (e) { console.log(e) /* ignore */ }
    }
    window.openMenu = async (v, params) => {
      this.currentMenu = v
      this.currentParams = params
      reset(`${v}-menu`)
      await this.updateComplete
      await init(`${v}-menu`)
    }
    window.reset = reset

    // global event listeners
    window.addEventListener('blur', e => {
      bg.shellMenus.close()

      // reset any active state
      reset(`${this.currentMenu}-menu`)

      // unset the menu so that we can unrender the current
      // (this stops a FOUC issue)
      this.currentMenu = null
    })
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
      case 'users':
        return html`<users-menu></users-menu>`
      case 'location':
        return html`<location-menu></location-menu>`
      case 'bookmark':
        return html`<bookmark-menu></bookmark-menu>`
      case 'donate':
        return html`<donate-menu></donate-menu>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('menus-wrapper', MenusWrapper)