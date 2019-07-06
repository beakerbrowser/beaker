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
    this.appInfo = null
    this.submenu = ''
  }

  get datInfo () {
    if (!this.tabState) return null
    return this.tabState.datInfo
  }

  get isDat () {
    return !!this.datInfo
  }

  get isSaved () {
    return this.datInfo && this.datInfo.userSettings && this.datInfo.userSettings.isSaved
  }

  get isApplication () {
    return this.isDat && Array.isArray(this.datInfo.type) && this.datInfo.type.includes('unwalled.garden/application')
  }

  async init (params) {
    this.tabState = await bg.views.getTabState('active', {datInfo: true})
    if (this.isApplication) {
      this.appInfo = await bg.applications.getInfo(this.datInfo.url)
    }
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
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
          <hr>
          <div class="menu-item" @click=${this.onClickViewSource}>
            <i class="far fa-edit"></i>
            Site editor
          </div>
          <div class="menu-item" @click=${this.onToggleLiveReloading}>
            <i class="fa fa-bolt"></i>
            Toggle live reloading
          </div>
          <hr>
          <div class="menu-item" @click=${this.onClickFork}>
            <i class="fas fa-code-branch"></i>
            Fork this site
          </div>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${this.isDat ? html`
          ${this.isApplication ? html`
            ${this.appInfo.installed ? html`
              <div class="menu-item" @click=${this.onClickUninstall}>
                <i class="fas fa-ban"></i>
                Uninstall <span class="appname">${this.datInfo.title || 'this application'}</span>
              </div>
            ` : html`
              <div class="menu-item" @click=${this.onClickInstall}>
                <i class="fas fa-download"></i>
                Install <span class="appname">${this.datInfo.title || 'this application'}</span>
              </div>
            `}
          ` : ''}
          ${this.isSaved ? html`
            <div class="menu-item" @click=${this.onToggleSaved}>
              <i class="fas fa-trash"></i>
              Remove from my websites
            </div>
          ` : html`
            <div class="menu-item" @click=${this.onToggleSaved}>
              <i class="fas fa-save"></i>
              Save to my websites
            </div>
          `}
          <hr>
          <div class="menu-item" @click=${e => this.onShowSubmenu('devtools')}>
            <i class="fas fa-code"></i>
            Developer tools
            <i class="more fa fa-angle-right"></i>
          </div>
          <hr>
          <div class="menu-item" @click=${this.onClickDownloadZip}>
            <i class="far fa-file-archive"></i>
            Download site as .zip
          </div>
        ` : ''}
        <div class="menu-item" @click=${this.onClickSavePage}>
          <i class="far fa-file-image"></i>
          Download page as file
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

  updated () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({height})
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  async onClickInstall () {
    var url = this.datInfo.url
    bg.shellMenus.close()
    if (await bg.applications.requestInstall(url)) {
      bg.shellMenus.loadURL(url) // refresh page
    }
  }

  async onClickUninstall () {
    bg.applications.uninstall(this.datInfo.url)
    bg.shellMenus.loadURL(this.datInfo.url) // refresh page
    bg.shellMenus.close()
  }

  async onToggleSaved () {
    if (this.isSaved) {
      await bg.archives.remove(this.datInfo.url)
    } else {
      await bg.archives.add(this.datInfo.url)
    }
    bg.shellMenus.close()
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

.menu-item .appname {
  margin-left: 4px;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`]

customElements.define('site-tools-menu', SiteToolsMenu)
