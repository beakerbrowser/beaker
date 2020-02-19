/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import { writeToClipboard } from '../lib/event-handlers'

class SiteMenu extends LitElement {
  static get properties () {
    return {
      submenu: {type: String}
    }
  }

  constructor () {
    super()
    this.accelerators = {
      print: ''
    }
    this.fetchBrowserInfo()
  }

  async fetchBrowserInfo () {
    var browserInfo = await bg.beakerBrowser.getInfo()
    const isDarwin = browserInfo.platform === 'darwin'
    const cmdOrCtrlChar = isDarwin ? '⌘' : '^'
    this.accelerators = {
      print: cmdOrCtrlChar + 'P'
    }
    this.requestUpdate()
  }

  reset () {
    this.submenu = ''
    this.url = undefined
    this.driveInfo = undefined
    this.driveConfig = undefined
  }

  async init (params) {
    this.url = params.url
    this.requestUpdate()
    console.log(this.url)

    if (this.url.startsWith('hyper://')) {
      try {
        this.driveInfo = await bg.hyperdrive.getInfo(this.url)
        this.driveConfig = await bg.drives.get(this.url)
      } catch (e) {
        console.debug(e)
      }
      this.requestUpdate()
    }
  }

  render () {
    if (this.submenu === 'open-with') {
      return this.renderOpenWith()
    }
    if (this.submenu === 'hyperdrive') {
      return this.renderHyperdrive()
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="section">
          <div class="menu-item" @click=${this.onClickPrint}>
            <i class="fas fa-print"></i>
            <span class="label">Print This Page</span>
            <span class="shortcut">${this.accelerators.print}</span>
          </div>
          <div class="menu-item" @click=${this.onCopyURL}>
            <i class="fas fa-link"></i>
            <span class="label">Copy URL</span>
          </div>
        </div>

        ${this.driveInfo ? html`
          <div class="section">
            <div class="menu-item" @click=${e => this.onShowSubmenu('open-with')}>
              <span class="label">Open With</span>
              <i class="more fa fa-angle-right"></i>
            </div>
            <div class="menu-item" @click=${e => this.onShowSubmenu('hyperdrive')}>
              <span class="label">Hyperdrive</span>
              <i class="more fa fa-angle-right"></i>
            </div>
          </div>
          ` : ''}
      </div>
    `
  }

  renderOpenWith () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Open With</h2>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, `https://hyperdrive.network/${this.url.slice('hyper://'.length)}`)}>
            <i class="far fa-folder-open"></i>
            <span class="label">Open with Files Explorer</span>
          </div>
        </div>
      </div>
    `
  }

  renderHyperdrive () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Hyperdrive</h2>
        </div>
        <div class="section">
          <div class="menu-item" @click=${this.onToggleSeeding} ?disabled=${this.driveConfig.ident.system}>
            <i class="far fa${this.driveConfig.ident.user || this.driveConfig.seeding ? '-check' : ''}-square"></i>
            <span class="label">Host This Drive</span>
          </div>
          <div class="menu-item" @click=${this.onToggleSaved} ?disabled=${this.driveConfig.ident.system}>
            <i class="far fa${this.driveConfig.ident.system || this.driveConfig.saved ? '-check' : ''}-square"></i>
            <span class="label">Save to My Library</span>
          </div>
        </div>
        <div class="section">
          <div class="menu-item" @click=${this.onForkDrive}>
            <i class="fas fa-code-branch"></i>
            <span class="label">Fork This Drive</span>
          </div>
          <div class="menu-item" @click=${this.onDiffMergeDrive}>
            <i style="padding-left: 4px; font-size: 19px; box-sizing: border-box; margin-top: -3px; margin-right: 5px">◨</i>
            <span class="label">Diff / Merge</span>
          </div>
        </div>
        <div class="section">
          <div class="menu-item" @click=${this.onDriveProperties}>
            <i class="far fa-fw fa-list-alt"></i>
            <span class="label">Drive Properties</span>
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({width, height})
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }

  onClickPrint () {
    bg.views.print('active')
    bg.shellMenus.close()
  }

  onCopyURL () {
    writeToClipboard(this.url)
    bg.shellMenus.close()
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  onToggleSeeding (e) {
    if (this.driveConfig.ident.system) return
    if (!this.driveConfig || !this.driveConfig.seeding) {
      bg.drives.configure(this.url, {seeding: true})
    } else {
      bg.drives.configure(this.url, {seeding: false})
    }
    bg.shellMenus.close()
  }

  onToggleSaved (e) {
    if (this.driveConfig.ident.system) return
    if (!this.driveConfig || !this.driveConfig.saved) {
      bg.drives.configure(this.url, {seeding: false})
    } else {
      bg.drives.remove(this.url)
    }
    bg.shellMenus.close()
  }

  async onForkDrive (e) {
    bg.shellMenus.close()
    var url = await bg.hyperdrive.forkDrive(this.url)
    bg.shellMenus.createTab(url)
  }

  async onDiffMergeDrive (e) {
    bg.shellMenus.close()    
    bg.shellMenus.createTab(`beaker://diff/?base=${this.url}`)
  }

  onDriveProperties (e) {
    bg.shellMenus.close()
    bg.navigator.drivePropertiesDialog(this.url)
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

.menu-item[disabled] {
  color: #99a;
}

.menu-item[disabled]:hover {
  background: none;
}

.menu-item i.more {
  margin-left: auto;
  padding-right: 0;
  text-align: right;
}

.menu-item .more,
.menu-item .shortcut {
  color: #777;
  margin-left: auto;
}

.menu-item .shortcut {
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
}
`]

customElements.define('site-menu', SiteMenu)