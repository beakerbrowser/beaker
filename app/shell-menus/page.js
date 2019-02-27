import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import moment from 'moment'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class PageMenu extends LitElement {
  static get properties () {
    return {
      url: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.url = null
  }

  async init (params) {
    this.url = params.url
    await this.requestUpdate()
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="menu-item" @click=${this.onClickViewFiles}>
          <i class="fas fa-code"></i>
          View Source
        </div>
        
        <div class="menu-item" @click=${this.onClickFork}>
          <i class="far fa-clone"></i>
          Make editable copy
        </div>

        <div class="menu-item" @click=${this.onToggleLiveReloading}>
          <i class="fa fa-bolt"></i>
          Toggle live reloading
        </div>

        <div class="menu-item" @click=${this.onClickDownloadZip}>
          <i class="far fa-file-archive"></i>
          Download as .zip
        </div>
      </div>
    `
  }

  // events
  // =

  onClickViewFiles () {
    bg.shellMenus.close()
    bg.shellMenus.createTab(`beaker://library/${this.url}`)
  }

  async onClickFork () {
    bg.shellMenus.close()
    const forkUrl = await bg.datArchive.forkArchive(this.url, {prompt: true}).catch(() => false)
    if (forkUrl) {
      bg.shellMenus.loadURL(`beaker://library/${forkUrl}#setup`)
    }
  }

  async onToggleLiveReloading () {
    bg.shellMenus.close()
    bg.views.toggleLiveReloading('active')
  }

  onClickDownloadZip () {
    bg.shellMenus.close()
    bg.beakerBrowser.downloadURL(`${this.url}?download_as=zip`)
  }
}
PageMenu.styles = [commonCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 5px 0;
  height: 110px;
  overflow: hidden;
}
`]

customElements.define('page-menu', PageMenu)