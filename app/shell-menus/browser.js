import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import moment from 'moment'
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

    this.platform = bg.beakerBrowser.getInfo().platform
    const isDarwin = this.platform === 'darwin'
    const cmdOrCtrlChar = isDarwin ? '⌘' : '^'
    this.accelerators = {
      newWindow: cmdOrCtrlChar + 'N',
      newTab: cmdOrCtrlChar + 'T',
      findInPage: cmdOrCtrlChar + 'F',
      history: cmdOrCtrlChar + (isDarwin ? 'Y' : 'H'),
      openFile: cmdOrCtrlChar + 'O'
    }

    this.submenu = ''
    this.downloads = []
    this.sumProgress = null // null means no active downloads
    this.shouldPersistDownloadsIndicator = false

    // fetch current downloads // TODO
    // beaker.downloads.getDownloads().then(ds => {
    //   this.downloads = ds
    //   this.updateActives()
    // })

    // wire up events TODO
    // var dlEvents = beaker.downloads.createEventsStream()
    // dlEvents.addEventListener('new-download', this.onNewDownload.bind(this))
    // dlEvents.addEventListener('sum-progress', this.onSumProgress.bind(this))
    // dlEvents.addEventListener('updated', this.onUpdate.bind(this))
    // dlEvents.addEventListener('done', this.onDone.bind(this))
    // window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  reset () {
    this.submenu = ''
  }

  async init () {
    await this.requestUpdate()
  }

  render () {
    if (this.submenu === 'create-new') {
      return this.renderCreateNew()
    }
    var progressEl = '' // TODO
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${''/*TODOautoUpdaterEl*/}

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenNewWindow()}>
            <i class="far fa-window-maximize"></i>
            <span class="label">New Window</span>
            <span class="shortcut">${this.accelerators.newWindow}</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenNewTab()}>
            <i class="far fa-file"></i>
            <span class="label">New Tab</span>
            <span class="shortcut">${this.accelerators.newTab}</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onFindInPage(e)}>
            <i class="fa fa-search"></i>
            <span class="label">Find in Page</span>
            <span class="shortcut">${this.accelerators.findInPage}</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://library')}>
            <i class="fa fa-book"></i>
            <span class="label">Library</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://watchlist')}>
            <i class="fa fa-eye"></i>
            <span class="label">Watchlist</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://bookmarks')}>
            <i class="far fa-star"></i>
            <span class="label">Bookmarks</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://history')}>
            <i class="fa fa-history"></i>
            <span class="label">History</span>
            <span class="shortcut">${this.accelerators.history}</span>
          </div>

          <div class="menu-item downloads" style=${progressEl ? 'height: 41px' : ''} @click=${e => this.onClickDownloads(e)}>
            <i class="fa fa-download"></i>
            <span class="label">Downloads</span>
            ${this.shouldPersistDownloadsIndicator ? html`<i class="fa fa-circle"></i>` : ''}
            ${progressEl}
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onShowSubmenu('create-new')}>
            <i class="far fa-plus-square"></i>
            <span class="label">Create New</span>
            <i class="more fa fa-angle-right"></i>
          </div>

          <div class="menu-item" @click=${e => this.onShareFiles(e)}>
            <i class="fa fa-upload"></i>
            <span class="label">Share Files</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'beaker://settings')}>
            <i class="fas fa-cog"></i>
            <span class="label">Settings</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenFile()}>
            <i></i>
            <span class="label">Open File...</span>
            <span class="shortcut">${this.accelerators.openFile}</span>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'dat://beakerbrowser.com/docs/')}>
            <i class="far fa-question-circle"></i>
            <span class="label">Help</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://github.com/beakerbrowser/beaker/issues/new?labels=0.8-beta-feedback&template=ISSUE_TEMPLATE_0.8_BETA.md')}>
            <i class="far fa-flag"></i>
            <span class="label">Report an Issue</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://opencollective.com/beaker')}>
            <i class="far fa-heart"></i>
            <span class="label">Support Beaker</span>
          </div>
        </div>
      </div>
    `
  }

  renderCreateNew () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Create New</h2>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onCreateSite(e)}>
            <i class="far fa-clone"></i>
            <span class="label">Empty project</span>
          </div>

          <div class="menu-item" @click=${e => this.onCreateSite(e, 'website')}>
            <i class="fa fa-sitemap"></i>
            <span class="label">Website</span>
          </div>

          <div class="menu-item" @click=${e => this.onCreateSiteFromFolder(e)}>
            <i class="far fa-folder"></i>
            <span class="label">From folder</span>
          </div>
        </div>
      </div>`
  }

  // events
  // =

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

  onClickDownloads (e) {
    this.shouldPersistDownloadsIndicator = false
    bg.shellMenus.createTab('beaker://downloads')
    bg.shellMenus.close()
  }

  onUpdate (download) {
    // patch data each time we get an update
    var target = this.downloads.find(d => d.id == download.id)
    if (target) {
      // patch item
      for (var k in download) { target[k] = download[k] }
    } else { this.downloads.push(download) }
  }

  onDone (download) {
    this.shouldPersistDownloadsIndicator = true
    this.onUpdate(download)
  }

  onFindInPage (e) {
    bg.shellMenus.close()
    bg.shellMenus.showInpageFind()
  }

  onClearDownloads (e) {
    e.preventDefault()
    e.stopPropagation()
    this.downloads = []
  }

  async onCreateSite (e, template) {
    bg.shellMenus.close()

    // create a new archive
    const url = await bg.datArchive.createArchive({template, prompt: false})
    bg.shellMenus.createTab('beaker://library/' + url + '#setup')
    bg.shellMenus.close()
  }

  async onCreateSiteFromFolder (e) {
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
    bg.shellMenus.createTab('beaker://library/' + url + '#setup')
    bg.shellMenus.close()
  }

  async onShareFiles (e) {
    bg.shellMenus.close()

    // ask user for files
    const filesOnly = this.platform === 'linux' || this.platform === 'win32'
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

    // open the new archive in the library
    bg.shellMenus.createTab('beaker://library/' + url + '#setup')
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
  height: 100vh;
  overflow-y: scroll;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section.auto-updater {
  padding-bottom: 0;
  border-bottom: 0;
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

.menu-item i.fa-circle {
  width: auto;
  margin-left: auto;
  margin-bottom: -2px;
  color: #295fcb;
  font-size: 11px;
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
  margin-left: 21px;
  width: 100%;
}
`]

customElements.define('browser-menu', BrowserMenu)