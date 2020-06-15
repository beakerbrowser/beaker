/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import { writeToClipboard } from '../lib/event-handlers'

class SiteMenu extends LitElement {
  static get properties () {
    return {
    }
  }

  constructor () {
    super()
  }

  reset () {
    this.submenu = ''
    this.url = undefined
    this.driveInfo = undefined
  }

  async init (params) {
    this.url = params.url
    this.requestUpdate()

    if (this.url.startsWith('hyper://')) {
      try {
        this.driveInfo = await bg.hyperdrive.getInfo(this.url)
      } catch (e) {
        console.debug(e)
      }
      this.requestUpdate()
    }
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="section">
          <div class="menu-item" @click=${this.onCopyURL}>
            <i class="fas fa-link"></i>
            <span class="label">Copy URL</span>
          </div>
          ${this.driveInfo ? html`
            <div class="menu-item" @click=${this.onCopyDriveKey}>
              <i class="fas fa-fingerprint"></i>
              <span class="label">Copy Drive Key</span>
            </div>
          ` : ''}
        </div>
        ${this.driveInfo && this.driveInfo.writable ? html`
          <div class="section">
            <div class="menu-item" @click=${this.onSync}>
              <i class="far fa-folder-open"></i>
              <span class="label">Sync with Local Folder</span>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }

  onCopyURL () {
    writeToClipboard(this.url)
    bg.shellMenus.close()
  }

  onCopyDriveKey () {
    writeToClipboard(this.driveInfo.key)
    bg.shellMenus.close()
  }

  async onSync () {
    await bg.folderSync.syncDialog(this.driveInfo.url)
    await bg.beakerBrowser.refreshTabState()
  }
}
SiteMenu.styles = [commonCSS, css`
.wrapper {
  width: 230px;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section:last-child {
  border-bottom: 0;
}

.menu-item {
  height: 40px;
}
`]

customElements.define('site-menu', SiteMenu)