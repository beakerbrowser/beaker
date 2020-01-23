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
      print: cmdOrCtrlChar + 'P',
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
    this.user = await bg.users.getCurrent().catch(err => undefined)
    this.users = await bg.users.list()
    this.bookmarks = await bg.bookmarks.list({sortBy: 'title'})
    await this.requestUpdate()
  }

  render () {
    if (!this.user) {
      return html`<div></div>`
    }

    if (this.submenu === 'applications') {
      return this.renderApplications()
    }

    if (this.submenu === 'bookmarks') {
      return this.renderBookmarks()
    }

    if (this.submenu === 'switch-user') {
      return this.renderSwitchUser()
    }

    if (this.submenu === 'tools') {
      return this.renderTools()
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

        <div class="menu-item user current-user" @click=${e => this.onOpenPage(e, this.user.url)}>
          <img src="asset:thumb:${this.user.url}?cache_buster=${Date.now()}">
          <div class="user-details">
            <div class="user-title">${this.user.title}</div>
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
          ${''/* TODO <div class="menu-item" @click=${e => this.onShowSubmenu('applications')}>
            <span class="label">Applications</span>
            <i class="more fa fa-angle-right"></i>
          </div>*/}

          <div class="menu-item" @click=${e => this.onShowSubmenu('bookmarks')}>
            <i class="far fa-star"></i>
            <span class="label">Bookmarks</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('switch-user')}>
            <i class="far fa-user"></i>
            <span class="label">Switch user</span>
            <i class="more fas fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShowSubmenu('tools')}>
            <i class="fas fa-tools"></i>
            <span class="label">Tools</span>
            <i class="more fa fa-angle-right"></i>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenNewWindow()}>
            <i class="far fa-window-restore"></i>
            <span class="label">New Window</span>
            <span class="shortcut">${this.accelerators.newWindow}</span>
          </div>

          ${''/*<div class="menu-item" @click=${this.onClickSavePage}>
            <i class="fas fa-file-export"></i>
            Export page as file
          </div>*/}
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


  renderSwitchUser () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Switch user</h2>
        </div>

        <hr>

        ${this.users.map(user => html`
          <div class="menu-item user" @click=${e => this.onOpenUser(e, user)}>
            <img src="asset:thumb:${user.url}?cache_buster=${Date.now()}">
            <div class="user-details">
              <div class="user-title">${user.title}</div>
            </div>
          </div>
        `)}

        <hr>

        <div class="menu-item" @click=${this.onCreateNewUser}>
          <i class="fas fa-plus"></i>
          <span>New user</span>
        </div>
        <div class="menu-item" @click=${this.onCreateTemporaryUser}>
          <i class="far fa-user"></i>
          <span>Temporary user</span>
        </div>
      </div>`
  }

  renderTools () {
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
          <h2>Tools</h2>
        </div>

        <div class="section">
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
            
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://drives')}>
            <img class="favicon" src="asset:favicon:beaker://drives">
            <span class="label">My Drives</span>
          </div>
            
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://settings')}>
            <img class="favicon" src="asset:favicon:beaker://settings">
            <span class="label">Settings</span>
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

    // create a new drive
    const url = await bg.hyperdrive.createDrive()
    bg.beakerBrowser.openUrl(url, {setActive: true, sidebarPanels: ['editor-app']})
  }

  onOpenUser (e, user) {
    bg.shellMenus.createWindow({userSession: user})
    bg.shellMenus.close()
  }

  async onCreateNewUser () {
    bg.shellMenus.close()
    var user = await bg.shellMenus.createModal('user', {})
    bg.shellMenus.createWindow({userSession: {url: user.url}})
  }

  async onCreateTemporaryUser () {
    bg.shellMenus.close()
    var user = await bg.users.createTemporary()
    bg.shellMenus.createWindow({userSession: {url: user.url, isTemporary: true}})
  }

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

.menu-item.user {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 400;
  height: 60px;
}

.menu-item.user img {
  margin-right: 14px;
  height: 40px;
  width: 40px;
  border-radius: 50%;
}

.menu-item.current-user {
  height: 76px;
  border-bottom: 1px solid #ccc;
  cursor: default;
  font-size: 18px;
}

.menu-item.current-user img {
  height: 48px;
  width: 48px;
}
`]

customElements.define('browser-menu', BrowserMenu)