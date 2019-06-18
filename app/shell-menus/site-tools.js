/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import {writeToClipboard} from '../lib/fg/event-handlers'
import commonCSS from './common.css'

class SiteToolsMenu extends LitElement {
  static get properties () {
    return {
      submenu: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.tabState = null
    this.submenu = ''
  }

  get datInfo () {
    if (!this.tabState) return null
    return this.tabState.datInfo
  }

  get isDat () {
    return !!this.datInfo
  }

  async init (params) {
    this.tabState = await bg.views.getTabState('active', {datInfo: true})
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (this.submenu === 'open-with') {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper">
          <div class="header">
            <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
              <i class="fa fa-angle-left"></i>
            </button>
            <h2>Open with</h2>
          </div>
          <div class="menu-item" @click=${this.onClickViewSource}>
            <i class="far fa-edit"></i>
            Editor
          </div>
          <div class="menu-item" @click=${this.onClickViewFiles}>
            <i class="far fa-folder-open"></i>
            Files Explorer
          </div>
        </div>
      `
    }
    if (this.submenu === 'devtools') {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="wrapper">
          <div class="header">
            <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
              <i class="fa fa-angle-left"></i>
            </button>
            <h2>Developer tools</h2>
          </div>
          ${this.isDat ? html`
            <div class="menu-item" @click=${this.onToggleLiveReloading}>
              <i class="fa fa-bolt"></i>
              Toggle live reloading
            </div>
          ` : ''}
          ${this.isDat ? html`
            <div class="menu-item" @click=${this.onClickFork}>
              <i class="fas fa-code-branch"></i>
              Fork this site
            </div>
          ` :''}
          <div class="menu-item" @click=${this.onToggleDevtools}>
            <i class="fas fa-terminal"></i>
            Toggle JS console
          </div>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${this.isDat ? html`
          <div class="menu-item" @click=${e => this.onShowSubmenu('open-with')}>
            Open with
            <i class="more fa fa-angle-right"></i>
          </div>
        ` : ''}
        <div class="menu-item" @click=${e => this.onShowSubmenu('devtools')}>
          Developer tools
          <i class="more fa fa-angle-right"></i>
        </div>
        <hr>
        ${this.isDat ? html`
          <div class="menu-item" @click=${this.onClickDownloadZip}>
            <i class="far fa-file-archive"></i>
            Download site as .zip
          </div>
        ` : ''}
        <div class="menu-item" @click=${this.onClickSavePage}>
          <i class="far fa-file-image"></i>
          Save page as file
        </div>
        <div class="menu-item" @click=${this.onClickPrint}>
          <i class="fas fa-print"></i>
          Print page
        </div>
      </div>
    `
  }

  // events
  // =

  onShowSubmenu (v) {
    this.submenu = v
  }

  async onClickViewFiles () {
    await bg.shellMenus.createTab(`beaker://library/?view=files&dat=${encodeURIComponent(`dat://${this.datInfo.key}`)}`)
    bg.shellMenus.close()
  }

  async onClickViewSource () {
    await bg.shellMenus.createTab(`beaker://editor/dat://${this.datInfo.key}`)
    bg.shellMenus.close()
  }

  async onClickFork () {
    const forkUrl = await bg.datArchive.forkArchive(this.datInfo.key, {prompt: true}).catch(() => false)
    if (forkUrl) {
      bg.shellMenus.loadURL(`beaker://editor/${forkUrl}`)
    }
    bg.shellMenus.close()
  }

  async onToggleLiveReloading () {
    await bg.views.toggleLiveReloading('active')
    bg.shellMenus.close()
  }

  async onClickDownloadZip () {
    bg.beakerBrowser.downloadURL(`dat://${this.datInfo.key}?download_as=zip`)
    bg.shellMenus.close()
  }

  async onToggleDevtools () {
    await bg.views.toggleDevTools('active')
    bg.shellMenus.close()
  }

  async onClickSavePage () {
    bg.beakerBrowser.downloadURL(this.tabState.url)
    bg.shellMenus.close()
  }

  async onClickPrint () {
    bg.views.print('active')
    bg.shellMenus.close()
  }
}
SiteToolsMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}
`]

customElements.define('site-tools-menu', SiteToolsMenu)
