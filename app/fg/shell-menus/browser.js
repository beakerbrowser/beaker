/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { fromEventStream } from '../../bg/web-apis/fg/event-target'
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

    this.browserInfo = bg.beakerBrowser.getInfo()
    const isDarwin = this.browserInfo.platform === 'darwin'
    const cmdOrCtrlChar = isDarwin ? '⌘' : '^'
    this.accelerators = {
      newWindow: cmdOrCtrlChar + 'N',
      newTab: cmdOrCtrlChar + 'T',
      findInPage: cmdOrCtrlChar + 'F',
      history: cmdOrCtrlChar + (isDarwin ? 'Y' : 'H'),
      openFile: cmdOrCtrlChar + 'O'
    }

    this.submenu = ''
    this.sumProgress = null // null means no active downloads
    this.shouldPersistDownloadsIndicator = false

    // wire up events
    var dlEvents = fromEventStream(bg.downloads.createEventsStream())
    dlEvents.addEventListener('sum-progress', this.onDownloadsSumProgress.bind(this))
  }

  reset () {
    this.submenu = ''
  }

  async init () {
    this.profile = await bg.beakerBrowser.getUserSession().catch(err => undefined)
    this.bookmarks = [] // TODO await bg.bookmarks.list({isOwner: true, sortBy: 'title'})
    await this.requestUpdate()
  }

  render () {
    if (!this.profile) {
      return html`<div></div>`
    }

    if (this.submenu === 'applications') {
      return this.renderApplications()
    }

    if (this.submenu === 'bookmarks') {
      return this.renderBookmarks()
    }

    if (this.submenu === 'system') {
      return this.renderSystem()
    }

    if (this.submenu === 'this-page') {
      return this.renderThisPage()
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

        <div class="section gray">
          <div class="menu-item-group">
            <div class="menu-item" @click=${e => this.onOpenNewWindow()}>
              <span class="label">New Window</span>
              <span class="shortcut">${this.accelerators.newWindow}</span>
            </div>

            <div class="menu-item" @click=${e => this.onOpenNewTab()}>
              <span class="label">New Tab</span>
              <span class="shortcut">${this.accelerators.newTab}</span>
            </div>
          </div>
        </div>

        ${''/*<div class="section">
          <div class="menu-item" @click=${this.onCreateNew}>
            <i class="fas fa-plus"></i>
            <span class="label">New Dat</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenFile()}>
            <i class="far fa-folder-open"></i>
            <span class="label">Open File...</span>
            <span class="shortcut">${this.accelerators.openFile}</span>
          </div>

  </div>

        <div class="section">
        </div>*/}

        <div class="section">
          <div class="menu-item" @click=${e => this.onShowSubmenu('applications')}>
            <span class="label">Applications</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('bookmarks')}>
            <span class="label">Bookmarks</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('this-page')}>
            <span class="label">This Page</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('system')}>
            <span class="label">System</span>
            <i class="more fa fa-angle-right"></i>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://beakerbrowser.com/docs/')}>
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
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://library')}>
            <img class="favicon" src="asset:favicon:beaker://library">
            <span class="label">Library</span>
          </div>
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

  renderSystem () {
    // render the progress bar if downloading anything
    var progressEl = ''
    if (this.shouldPersistDownloadsIndicator && this.sumProgress && this.sumProgress.receivedBytes <= this.sumProgress.totalBytes) {
      progressEl = html`<progress value=${this.sumProgress.receivedBytes} max=${this.sumProgress.totalBytes}></progress>`
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>System</h2>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://bookmarks')}>
            <img class="favicon" src="asset:favicon:beaker://bookmarks">
            <span class="label">Bookmarks</span>
          </div>

          <div class="menu-item downloads" @click=${e => this.onClickDownloads(e)}>
            <img class="favicon" src="asset:favicon:beaker://downloads">
              <span class="label">Downloads</span>
              ${progressEl}
            </div>

            <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://history')}>
            <img class="favicon" src="asset:favicon:beaker://history">
              <span class="label">History</span>
              <span class="shortcut">${this.accelerators.history}</span>
            </div>

            <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://explorer')}>
              <img class="favicon" src="asset:favicon:beaker://explorer">
              <span class="label">My Hyperdrive</span>
            </div>
            
            <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://settings')}>
              <img class="favicon" src="asset:favicon:beaker://settings">
              <span class="label">Settings</span>
            </div>
        </div>
      </div>`
  }

  renderThisPage () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>This Page</h2>
        </div>

        <div class="section">
          <div class="menu-item" @click=${this.onClickSavePage}>
            <i class="fas fa-download"></i>
            Download page as file
          </div>

          <div class="menu-item" @click=${this.onClickPrint}>
            <i class="fas fa-print"></i>
            Print page
          </div>
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

  onClickPrint () {
    bg.views.print('active')
    bg.shellMenus.close()
  }

  onClickDownloads (e) {
    this.shouldPersistDownloadsIndicator = false
    bg.shellMenus.createTab('beaker://downloads')
    bg.shellMenus.close()
  }

  onDownloadsSumProgress (sumProgress) {
    this.shouldPersistDownloadsIndicator = true
    this.sumProgress = sumProgress
    this.requestUpdate()
  }

  async onCreateNew (e) {
    bg.shellMenus.close()

    // create a new archive
    const url = await bg.datArchive.createArchive()
    bg.beakerBrowser.openUrl(url, {setActive: true, isSidebarActive: true, sidebarPanel: 'site'})
  }

  /*async onCreateSiteFromFolder (e) {
    bg.shellMenus.close()

    // ask user for folder
    const folder = await bg.beakerBrowser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    // create a new archive
    const url = await bg.datArchive.createArchive({prompt: false})
    await bg.archives.setLocalSyncPath(url, folder[0], {previewMode: true})
    bg.shellMenus.createTab('beaker://editor/' + url)
    bg.shellMenus.close()
  }*/

  /*async onShareFiles (e) {
    bg.shellMenus.close()

    // ask user for files
    const filesOnly = this.browserInfo.platform === 'linux' || this.browserInfo.platform === 'win32'
    const files = await bg.beakerBrowser.showOpenDialog({
      title: 'Select files to share',
      buttonLabel: 'Share files',
      properties: ['openFile', filesOnly ? false : 'openDirectory', 'multiSelections'].filter(Boolean)
    })
    if (!files || !files.length) return

    // create the dat and import the files
    const url = await bg.datArchive.createArchive({
      title: `Shared files (${moment().format('M/DD/YYYY h:mm:ssa')})`,
      description: `Files shared with Beaker`,
      prompt: false
    })
    await Promise.all(files.map(src => bg.datArchive.importFromFilesystem({src, dst: url, inplaceImport: false})))

    // open the new archive in the editor
    bg.shellMenus.createTab('beaker://editor/' + url)
    bg.shellMenus.close()
  }*/

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
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

.menu-item.downloads progress {
  margin-left: 20px;
  width: 100px;
}
`]

customElements.define('browser-menu', BrowserMenu)