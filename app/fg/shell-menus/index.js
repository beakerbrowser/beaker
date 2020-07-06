/* globals customElements */
import _debounce from 'lodash.debounce'
import { ipcRenderer } from 'electron'
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import './background-tray'
import './browser'
import './toolbar'
import './bookmark'
import './donate'
import './network'
import './peers'
import './share'
import './site'

class MenusWrapper extends LitElement {
  static get properties () {
    return {
      currentMenu: {type: String}
    }
  }

  constructor () {
    super()
    this.currentParams = null
    this.setup()
  }

  async setup () {
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
    window.updateMenu = async (params) => {
      this.currentParams = Object.assign(this.currentParams || {}, params)
      try { return this.shadowRoot.querySelector(`${this.currentMenu}-menu`).updateMenu(this.currentParams) }
      catch (e) { /* ignore */ }
    }
    window.reset = reset

    // global event listeners
    window.addEventListener('blur', e => {
      try {
        // check if any menu needs to stay open
        if (this.shadowRoot.querySelector('[active-menu]').hasAttribute('stay-open')) {
          return
        }
      } catch (e) {
        // ignore
      }

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

    // fetch platform information
    var browserInfo = await bg.beakerBrowser.getInfo()
    window.platform = browserInfo.platform
    if (browserInfo.platform === 'darwin') {
      document.body.classList.add('darwin')
    }
    if (browserInfo.platform === 'win32') {
      document.body.classList.add('win32')
    }
  }

  render () {
    return html`<div @contextmenu=${this.onContextMenu}>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentMenu) {
      case 'background-tray':
        return html`<background-tray-menu active-menu></background-tray-menu>`
      case 'browser':
        return html`<browser-menu active-menu></browser-menu>`
      case 'toolbar':
        return html`<toolbar-menu active-menu></toolbar-menu>`
      case 'bookmark':
        return html`<bookmark-menu active-menu></bookmark-menu>`
      case 'bookmark-edit':
        return html`<bookmark-edit-menu active-menu></bookmark-edit-menu>`
      case 'donate':
        return html`<donate-menu active-menu></donate-menu>`
      case 'network':
        return html`<network-menu active-menu></network-menu>`
      case 'peers':
        return html`<peers-menu active-menu></peers-menu>`
      case 'share':
        return html`<share-menu active-menu></share-menu>`
      case 'site':
        return html`<site-menu active-menu></site-menu>`
    }
    return html`<div></div>`
  }

  onContextMenu (e) {
    e.preventDefault() // disable context menu
  }
}

customElements.define('menus-wrapper', MenusWrapper)

// HACK
// Electron has an issue where browserviews fail to calculate click regions after a resize
// https://github.com/electron/electron/issues/14038
// we can solve this by forcing a recalculation after every resize
// -prf

const forceUpdateDragRegions = _debounce(() => ipcRenderer.send('resize-hackfix'), 100, {leading: true})
window.addEventListener('resize', forceUpdateDragRegions)
document.addEventListener('DOMContentLoaded', forceUpdateDragRegions)
