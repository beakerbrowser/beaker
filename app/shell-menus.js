/* globals customElements */
import { LitElement, html } from './vendor/lit-element/lit-element'
import * as bg from './shell-menus/bg-process-rpc'
import './shell-menus/browser'
import './shell-menus/page'
import './shell-menus/location'
import './shell-menus/bookmark'
import './shell-menus/peers'
import './shell-menus/donate'
import './shell-menus/local-path'
import './shell-menus/site-info'

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

    // global event listeners
    window.addEventListener('blur', e => {
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
      case 'page':
        return html`<page-menu></page-menu>`
      case 'location':
        return html`<location-menu></location-menu>`
      case 'bookmark':
        return html`<bookmark-menu></bookmark-menu>`
      case 'peers':
        return html`<peers-menu></peers-menu>`
      case 'donate':
        return html`<donate-menu></donate-menu>`
      case 'local-path':
        return html`<local-path-menu></local-path-menu>`
      case 'site-info':
        return html`<site-info-menu></site-info-menu>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('menus-wrapper', MenusWrapper)