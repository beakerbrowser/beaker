/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'

class BrowserMenu extends LitElement {
  static get properties () {
    return {
      submenu: {type: String}
    }
  }

  constructor () {
    super()
    this.submenu = ''
    this.accelerators = {
      newWindow: '',
      print: '',
      findInPage: '',
      history: '',
      openFile: ''
    }
    this.fetchBrowserInfo()
  }

  async fetchBrowserInfo () {
    this.browserInfo = await bg.beakerBrowser.getInfo()
    const isDarwin = this.browserInfo.platform === 'darwin'
    const cmdOrCtrlChar = isDarwin ? '⌘' : '^'
    this.accelerators = {
      newWindow: cmdOrCtrlChar + 'N',
      print: cmdOrCtrlChar + 'P',
      findInPage: cmdOrCtrlChar + 'F',
      history: cmdOrCtrlChar + (isDarwin ? 'Y' : 'H'),
      openFile: cmdOrCtrlChar + 'O'
    }

  }

  reset () {
    this.submenu = ''
  }

  async init () {
    this.bookmarks = await bg.bookmarks.list({sortBy: 'title'})
    await this.requestUpdate()
  }

  render () {
    if (this.submenu === 'applications') {
      return this.renderApplications()
    }

    if (this.submenu === 'bookmarks') {
      return this.renderBookmarks()
    }

    // auto-updater
    var autoUpdaterEl = html``
    if (this.browserInfo && this.browserInfo.updater.isBrowserUpdatesSupported && this.browserInfo.updater.state === 'downloaded') {
      autoUpdaterEl = html`
        <div class="section auto-updater">
          <div class="menu-item auto-updater" @click=${this.onClickRestart}>
            <i class="fa fa-arrow-circle-up"></i>
            <span class="label">Restart to update Beaker</span>
          </div>
        </div>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${autoUpdaterEl}

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenNewWindow()}>
            <i class="far fa-window-restore"></i>
            <span class="label">New Window</span>
            <span class="shortcut">${this.accelerators.newWindow}</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenFile()}>
            <i class="far fa-folder-open"></i>
            <span class="label">Open File...</span>
            <span class="shortcut">${this.accelerators.openFile}</span>
          </div>

          ${''/*<div class="menu-item" @click=${this.onClickSavePage}>
            <i class="fas fa-file-export"></i>
            Export page as file
          </div>*/}
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onNewHyperdrive()}>
            <i class="fas fa-plus"></i>
            <span class="label">New Hyperdrive...</span>
          </div>

          <div class="menu-item" @click=${e => this.onNewHyperdriveFromFolder(e)}>
            <i class="fas fa-file-upload"></i>
            <span class="label">New Drive From Folder...</span>
          </div>

          ${''/*<div class="menu-item" @click=${this.onClickSavePage}>
            <i class="fas fa-file-export"></i>
            Export page as file
          </div>*/}
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://library')}>
            <img class="favicon" src="asset:favicon:beaker://library">
            <span class="label">My Library</span>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('bookmarks')}>
            <i class="far fa-star"></i>
            <span class="label">Bookmarks</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item downloads" @click=${e => this.onClickDownloads(e)}>
            <img class="favicon" src="asset:favicon:beaker://downloads">
            <span class="label">Downloads</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://history')}>
            <img class="favicon" src="asset:favicon:beaker://history">
            <span class="label">History</span>
            <span class="shortcut">${this.accelerators.history}</span>
          </div>
        </div>

        <div class="section">   
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://webterm')}>
            <img class="favicon" src="asset:favicon:beaker://webterm">
            <span class="label">Webterm</span>
          </div> 
            
          <div class="menu-item" @click=${this.onOpenSystemDrive}>
            <i class="far fa-hdd"></i>
            <span class="label">My System Drive</span>
          </div>
                    
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://settings')}>
            <img class="favicon" src="asset:favicon:beaker://settings">
            <span class="label">Settings</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://beaker-browser.gitbook.io/docs/')}>
            <i class="far fa-question-circle"></i>
            <span class="label">Help</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://github.com/beakerbrowser/beaker/issues/new')}>
            <i class="far fa-flag"></i>
            <span class="label">Report an Issue</span>
          </div>
        </div>
      </div>
    `
  }

  renderApplications () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Applications</h2>
        </div>

        <div class="section">
        </div>
      </div>`
  }

  renderBookmarks () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Bookmarks</h2>
        </div>

        <div class="section scrollable">
          ${this.bookmarks.map(b => html`
            <div class="menu-item" @click=${e => this.onOpenPage(e, b.href)}>
              <img class="favicon" src="asset:favicon:${b.href}">
              <span class="label">${b.title}</span>
            </div>
          `)}
        </div>
      </div>`
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({width, height})
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  onOpenNewWindow () {
    bg.shellMenus.createWindow()
    bg.shellMenus.close()
  }

  onOpenNewTab () {
    bg.shellMenus.createTab()
    bg.shellMenus.close()
  }

  async onOpenFile () {
    bg.shellMenus.close()
    var files = await bg.beakerBrowser.showOpenDialog({
       title: 'Open file...',
       properties: ['openFile', 'createDirectory']
    })
    if (files && files[0]) {
      bg.shellMenus.createTab('file://' + files[0])
    }
  }

  async onClickSavePage () {
    var tabState = await bg.views.getTabState('active')
    bg.beakerBrowser.downloadURL(tabState.url)
    bg.shellMenus.close()
  }

  async onNewHyperdrive () {
    bg.shellMenus.close()
    const url = await bg.hyperdrive.createDrive()
    bg.beakerBrowser.openUrl(url, {setActive: true})
  }

  async onNewHyperdriveFromFolder (e) {
    bg.shellMenus.close()

    var folder = await bg.beakerBrowser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    var url = await bg.hyperdrive.createDrive({
      title: folder[0].split('/').pop(),
      prompt: false
    })
    await bg.hyperdrive.importFromFilesystem({src: folder[0], dst: url})
    
    bg.beakerBrowser.openUrl(url, {setActive: true})
  }

  onClickDownloads (e) {
    this.shouldPersistDownloadsIndicator = false
    bg.shellMenus.createTab('beaker://library/downloads')
    bg.shellMenus.close()
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }

  onOpenSystemDrive (e) {
    bg.shellMenus.createTab(`https://hyperdrive.network/${bg.beakerFs.get().url.slice('hyper://'.length)}`)
    bg.shellMenus.close()
  }

  onClickRestart () {
    bg.shellMenus.close()
    bg.beakerBrowser.restartBrowser()
  }
}
BrowserMenu.styles = [commonCSS, css`
.wrapper {
  width: 230px;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section:last-child {
  border-bottom: 0;
}

.section.auto-updater {
  padding-bottom: 0;
  border-bottom: 0;
}

.section.gray {
  padding: 2px 0;
  background: #f5f5fa;
}

.section.gray .menu-item:hover {
  background: #e5e5ee;
}

.section.scrollable {
  max-height: 400px;
  overflow-y: auto;
}

.menu-item-group {
  display: flex;
}

.menu-item-group > .menu-item:first-child {
  padding-right: 8px;
}

.menu-item-group > .menu-item:last-child {
  padding-left: 8px;
}

.menu-item-group > .menu-item .shortcut {
  padding-left: 10px;
}

.menu-item {
  height: 40px;
}

.menu-item.auto-updater {
  height: 35px;
  background: #DCEDC8;
  border-top: 1px solid #c5e1a5;
  border-bottom: 1px solid #c5e1a5;
  color: #000;
}

.menu-item.auto-updater i {
  color: #7CB342;
}

.menu-item.auto-updater:hover {
  background: #d0e7b5;
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

customElements.define('browser-menu', BrowserMenu)