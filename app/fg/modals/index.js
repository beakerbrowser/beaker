/* globals customElements */
import { LitElement, html } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import _debounce from 'lodash.debounce'
import { ipcRenderer } from 'electron'
import './setup'
import './create-drive'
import './fork-drive'
import './folder-sync'
import './drive-properties'
import './select-drive'
import './select-file'
import './prompt'
import './basic-auth'
import './user-editor'
import './user-select'
import './add-contact'
import './select-contact'

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
    return html`<div>${this.renderMenu()}</div>`
  }

  renderMenu () {
    switch (this.currentModal) {
      case 'setup':
        return html`<setup-modal></setup-modal>`
      case 'create-drive':
        return html`<create-drive-modal></create-drive-modal>`
      case 'fork-drive':
        return html`<fork-drive-modal></fork-drive-modal>`
      case 'folder-sync':
        return html`<folder-sync-modal></folder-sync-modal>`
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
      case 'user-editor':
        return html`<user-editor-modal></user-editor-modal>`
      case 'user-select':
        return html`<user-select-modal></user-select-modal>`
      case 'add-contact':
        return html`<add-contact-modal></add-contact-modal>`
      case 'select-contact':
        return html`<select-contact-modal></select-contact-modal>`
    }
    return html`<div></div>`
  }
}

customElements.define('modals-wrapper', ModalsWrapper)

// HACK
// Electron has an issue where browserviews fail to calculate click regions after a resize
// https://github.com/electron/electron/issues/14038
// we can solve this by forcing a recalculation after every resize
// -prf

const forceUpdateDragRegions = _debounce(() => ipcRenderer.send('resize-hackfix'), 100, {leading: true})
window.addEventListener('resize', forceUpdateDragRegions)
document.addEventListener('DOMContentLoaded', forceUpdateDragRegions)