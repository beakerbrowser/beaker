/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
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
    this.isDarwin = false
    this.windowMenuItems = undefined
    this.bookmarks = []
  }

  reset () {
    this.submenu = ''
    this.daemonStatus = undefined
  }

  async init () {
    await this.requestUpdate()
    let [browserInfo, menuItems, bookmarks] = await Promise.all([
      bg.beakerBrowser.getInfo(),
      bg.shellMenus.getWindowMenu(),
      bg.bookmarks.list({sortBy: 'title'})
    ])
    bookmarks.sort((a, b) => (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase()))
    this.browserInfo = browserInfo
    this.isDarwin = browserInfo.platform === 'darwin'
    this.windowMenuItems = menuItems
    this.bookmarks = bookmarks 
    await this.requestUpdate()
    this.daemonStatus = await bg.beakerBrowser.getDaemonStatus()
    this.requestUpdate()
  }

  render () {
    if (this.submenu === 'bookmarks') {
      return this.renderBookmarks()
    } else if (this.submenu === 'library') {
      return this.renderLibrary()
    } else if (this.submenu) {
      return this.renderWindowMenu(this.submenu)
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
            <div class="menu-item" @click=${e => this.onNewHyperdrive()}>
              <i class="fas fa-sitemap"></i>
              <span class="label">New Site...</span>
            </div>

            <div class="menu-item" @click=${e => this.onNewHyperdriveFromFolder(e)}>
              <i class="fas fa-file-upload"></i>
              <span class="label">New Site From Folder...</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://library')}>
            <img class="favicon" src="asset:favicon:beaker://library/">
            <span class="label">My Library</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://settings')}>
            <img class="favicon" src="asset:favicon:beaker://settings/">
            <span class="label">Settings</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onShowSubmenu('File')}>
            <span class="label">File</span>
            <span class="more"><span class="fas fa-caret-right"></span></span>
          </div>
          <div class="menu-item" @click=${e => this.onShowSubmenu('bookmarks')}>
            <span class="label">Bookmarks</span>
            <span class="more"><span class="fas fa-caret-right"></span></span>
          </div>
          <div class="menu-item" @click=${e => this.onShowSubmenu('Developer')}>
            <span class="label">Developer</span>
            <span class="more"><span class="fas fa-caret-right"></span></span>
          </div>
          <div class="menu-item" @click=${e => this.onShowSubmenu('Window')}>
            <span class="label">Window</span>
            <span class="more"><span class="fas fa-caret-right"></span></span>
          </div>
          <div class="menu-item" @click=${e => this.onShowSubmenu('Help')}>
            <span class="label">Help</span>
            <span class="more"><span class="fas fa-caret-right"></span></span>
          </div>
        </div>

        ${this.daemonStatus ? html`
          <div class="network-status">
            <div class="network-status-title">Network Status</div>
            <table>
              <tr>
                <td>Hole-punchable:</td>
                <td>
                  ${this.daemonStatus.holepunchable
                    ? html`<span class="fa-fw fas fa-check"></span> Yes`
                    : html`<span class="fa-fw fas fa-exclamation-triangle"></span> No`
                  }
                </td>
              </tr>
              <tr><td>Remote Address:</td> <td>${this.daemonStatus.remoteAddress || 'Unknown'}</td></tr>
            </table>
            ${!this.daemonStatus.holepunchable ? html`
              <div class="help">
                <a @click=${e => this.onOpenPage(e, 'https://docs.beakerbrowser.com/help/hole-punchability')}>
                  <span class="far fa-fw fa-question-circle"></span> What does this mean?
                </a>
            </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `
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
          ${repeat(this.bookmarks, b => b.href, b => html`
            <div class="menu-item" @click=${e => this.onOpenPage(e, b.href)}>
              <img class="favicon" src="asset:favicon:${b.href}">
              <span class="label">${b.title}</span>
            </div>
          `)}
        </div>
      </div>`
  }

  renderWindowMenu (menu) {
    var items = this.windowMenuItems[menu]
    if (!items) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>${menu}</h2>
        </div>
        <div class="section">
          ${repeat(items, (item, i) => item.id || i, item => item.separator
            ? html`<hr>`
            : html`
              <div class="menu-item" @click=${this.onClickMenuItem(menu, item.id)} ?disabled=${!item.enabled}>
                <span class="label">${item.label}</span>
                ${item.accelerator ? html`<span class="shortcut">${this.renderAccelerator(item.accelerator)}</span>` : ''}
              </div>
            `
          )}
        </div>
      </div>`
  }

  renderAccelerator (accel) {
    if (!accel) return
    const command = '⌘'
    const control = '^'
    const commandOrControl = this.isDarwin ? command : control
    return accel
      .replace(/\+/g, '')
      .replace('CmdOrCtrl', commandOrControl)
      .replace('Alt', '⌥')
      .replace('Cmd', command)
      .replace('Ctrl', control)
      .replace('Shift', '⇧')
      .replace('Plus', '+')
      .replace('Left', '←')
      .replace('Right', '→')
      .replace('`', '~')
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  onOpenNewTab () {
    bg.shellMenus.createTab()
    bg.shellMenus.close()
  }

  onClickMenuItem (menu, id) {
    return async (e) => {
      bg.shellMenus.triggerWindowMenuItemById(menu, id)
      bg.shellMenus.close()
    }
  }

  async onNewHyperdrive () {
    bg.shellMenus.close()
    const url = await bg.hyperdrive.createDrive()
    bg.beakerBrowser.openUrl(url, {setActive: true, addedPaneUrls: ['beaker://editor/']})
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

  onClickRestart () {
    bg.shellMenus.close()
    bg.beakerBrowser.restartBrowser()
  }
}
BrowserMenu.styles = [commonCSS, css`
.wrapper {
  width: 300px;
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
  padding: 0 2px;
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
  height: 32px;
}

.menu-item[disabled] {
  color: #99a;
}

.menu-item[disabled]:hover {
  background: none;
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
  color: var(--text-color--menu-item-icon--light);
  margin-left: auto;
}

.menu-item .shortcut {
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
}

.network-status {
  padding: 8px;
  background: #fafafd;
}

.network-status-title {
 font-size: 11px;
 font-weight: bold;
 padding: 0 3px 3px;
}

.network-status table {
  font-size: 12px;
  white-space: nowrap;
  color: inherit;
}

.network-status table tr td:first-child {
  font-weight: 500;
  padding-right: 5px;
}

.network-status table tr td:last-child {
  font-family: monospace;
  letter-spacing: 0.5px;
}

.network-status .fa-exclamation-triangle {
  color: #FF8F00;
}

.network-status .help {
  padding: 2px 3px 0;
}

.network-status .help a {
  text-decoration: none;
  color: gray;
}

.network-status .help a:hover {
  text-decoration: underline;
}
`]

customElements.define('browser-menu', BrowserMenu)