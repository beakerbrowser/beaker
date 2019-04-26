/* globals beaker DatArchive */

import os from 'os'
import * as yo from 'yo-yo'
import moment from 'moment'
import {ipcRenderer} from 'electron'
import { showInpageFind } from '../navbar'
import { findParent } from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

// there can be many drop menu btns rendered at once, but they are all showing the same information
// the BrowserMenuNavbarBtn manages all instances, and you should only create one

export class BrowserMenuNavbarBtn {
  constructor () {
    const isDarwin = beaker.browser.getInfo().platform === 'darwin'
    const cmdOrCtrlChar = isDarwin ? '⌘' : '^'
    this.accelerators = {
      newWindow: cmdOrCtrlChar + 'N',
      newTab: cmdOrCtrlChar + 'T',
      findInPage: cmdOrCtrlChar + 'F',
      history: cmdOrCtrlChar + (isDarwin ? 'Y' : 'H'),
      openFile: cmdOrCtrlChar + 'O'
    }

    this.downloads = []
    this.sumProgress = null // null means no active downloads
    this.isDropdownOpen = false
    this.shouldPersistDownloadsIndicator = false
    this.browserInfo = beaker.browser.getInfo()

    // fetch current downloads
    beaker.downloads.getDownloads().then(ds => {
      this.downloads = ds
      this.updateActives()
    })

    // wire up events
    var dlEvents = beaker.downloads.createEventsStream()
    dlEvents.addEventListener('new-download', this.onNewDownload.bind(this))
    dlEvents.addEventListener('sum-progress', this.onSumProgress.bind(this))
    dlEvents.addEventListener('updated', this.onUpdate.bind(this))
    dlEvents.addEventListener('done', this.onDone.bind(this))
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    // show active, then inactive, with a limit of 5 items
    var progressingDownloads = this.downloads.filter(d => d.state == 'progressing').reverse()

    // render the progress bar if downloading anything
    var progressEl = ''
    if (progressingDownloads.length > 0 && this.sumProgress && this.sumProgress.receivedBytes <= this.sumProgress.totalBytes) {
      progressEl = yo`<progress value=${this.sumProgress.receivedBytes} max=${this.sumProgress.totalBytes}></progress>`
    }

    // auto-updater
    var autoUpdaterEl = ''
    if (this.browserInfo && this.browserInfo.updater.isBrowserUpdatesSupported && this.browserInfo.updater.state === 'downloaded') {
      autoUpdaterEl = yo`
        <div class="section auto-updater">
          <div class="menu-item auto-updater" onclick=${e => this.onClickRestart()}>
            <i class="fa fa-arrow-circle-up"></i>
            <span class="label">Restart to update Beaker</span>
          </div>
        </div>
      `
    }

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items with-triangle">
            <div class="dropdown-wrapper">
              ${autoUpdaterEl}

              <div class="section">
                <div class="menu-item" onclick=${e => this.onOpenNewWindow()}>
                  <i class="far fa-window-maximize"></i>
                  <span class="label">New Window</span>
                  <span class="shortcut">${this.accelerators.newWindow}</span>
                </div>

                <div class="menu-item" onclick=${e => this.onOpenNewTab()}>
                  <i class="far fa-file"></i>
                  <span class="label">New Tab</span>
                  <span class="shortcut">${this.accelerators.newTab}</span>
                </div>
              </div>

              <div class="section">
                <div class="menu-item" onclick=${e => this.onFindInPage(e)}>
                  <i class="fa fa-search"></i>
                  <span class="label">Find in Page</span>
                  <span class="shortcut">${this.accelerators.findInPage}</span>
                </div>
              </div>

              <div class="section">
                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'beaker://library')}>
                  <i class="fa fa-hdd"></i>
                  <span class="label">Library</span>
                </div>
                
                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'beaker://bookmarks')}>
                  <i class="far fa-star"></i>
                  <span class="label">Bookmarks</span>
                </div>

                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'beaker://watchlist')}>
                  <i class="fa fa-eye"></i>
                  <span class="label">Watchlist</span>
                </div>

                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'beaker://history')}>
                  <i class="fa fa-history"></i>
                  <span class="label">History</span>
                  <span class="shortcut">${this.accelerators.history}</span>
                </div>

                <div class="menu-item downloads" style=${progressEl ? 'height: 41px' : ''} onclick=${e => this.onClickDownloads(e)}>
                  <i class="fa fa-download"></i>
                  <span class="label">Downloads</span>
                  ${this.shouldPersistDownloadsIndicator ? yo`<i class="fa fa-circle"></i>` : ''}
                  ${progressEl}
                </div>

                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'beaker://settings')}>
                  <i class="fas fa-cog"></i>
                  <span class="label">Settings</span>
                </div>
              </div>

              <div class="section">
                <div class="menu-item" onclick=${e => this.onOpenFile()}>
                  <i></i>
                  <span class="label">Open File...</span>
                  <span class="shortcut">${this.accelerators.openFile}</span>
                </div>
              </div>

              <div class="section">
                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'dat://beakerbrowser.com/docs/')}>
                  <i class="far fa-question-circle"></i>
                  <span class="label">Help</span>
                </div>

                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'https://github.com/beakerbrowser/beaker/issues/new')}>
                  <i class="far fa-flag"></i>
                  <span class="label">Report an Issue</span>
                </div>

                <div class="menu-item" onclick=${e => this.onOpenPage(e, 'https://opencollective.com/beaker')}>
                  <i class="fa fa-donate"></i>
                  <span class="label">Support Beaker</span>
                </div>
              </div>
            </div>
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu browser-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span class="fa fa-bars"></span>
        </button>
        ${dropdownEl}
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.browser-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  doAnimation () {
    Array.from(document.querySelectorAll('.browser-dropdown-menu .toolbar-btn')).forEach(el =>
      el.animate([
        {transform: 'scale(1.0)', color: 'inherit'},
        {transform: 'scale(1.5)', color: '#06c'},
        {transform: 'scale(1.0)', color: 'inherit'}
      ], { duration: 300 })
    )
  }

  onOpenNewWindow () {
    ipcRenderer.send('new-window')
  }

  onOpenNewTab () {
    pages.setActive(pages.create('beaker://start'))
  }

  async onOpenFile () {
    var files = await beaker.browser.showOpenDialog({
       title: 'Open file...',
       properties: ['openFile', 'createDirectory']
    })
    if (files && files[0]) {
      pages.setActive(pages.create('file://' + files[0]))
    }
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'browser-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.updateActives()
    }
  }

  onClickDownloads (e) {
    this.shouldPersistDownloadsIndicator = false
    this.onOpenPage(e, 'beaker://downloads')
  }

  onNewDownload () {
    this.doAnimation()

    // open the dropdown
    this.isDropdownOpen = true
    this.updateActives()
  }

  onSumProgress (sumProgress) {
    this.sumProgress = sumProgress
    this.updateActives()
  }

  onUpdate (download) {
    // patch data each time we get an update
    var target = this.downloads.find(d => d.id == download.id)
    if (target) {
      // patch item
      for (var k in download) { target[k] = download[k] }
    } else { this.downloads.push(download) }
    this.updateActives()
  }

  onDone (download) {
    this.shouldPersistDownloadsIndicator = true
    this.doAnimation()
    this.onUpdate(download)
  }

  onFindInPage (e) {
    e.preventDefault()
    e.stopPropagation()

    // close dropdown
    this.isDropdownOpen = false

    showInpageFind(pages.getActive())
  }

  onClearDownloads (e) {
    e.preventDefault()
    e.stopPropagation()
    this.downloads = []
    this.updateActives()
  }

  async onCreateSite (e, template) {
    // close dropdown
    this.isDropdownOpen = false
    this.updateActives()

    // create a new archive
    const archive = await DatArchive.create({template, prompt: false})
    pages.setActive(pages.create('beaker://editor/' + archive.url + '#setup'))
  }

  async onCreateSiteFromFolder (e) {
    // close dropdown
    this.isDropdownOpen = false
    this.updateActives()

    // ask user for folder
    const folder = await beaker.browser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    // create a new archive
    const archive = await DatArchive.create({prompt: false})
    await beaker.archives.setLocalSyncPath(archive.url, folder[0], {previewMode: true})
    pages.setActive(pages.create('beaker://editor/' + archive.url + '#setup'))
  }

  async onShareFiles (e) {
    // close dropdown
    this.isDropdownOpen = false
    this.updateActives()

    // ask user for files
    const filesOnly = this.browserInfo.platform === 'linux' || this.browserInfo.platform === 'win32'
    const files = await beaker.browser.showOpenDialog({
      title: 'Select files to share',
      buttonLabel: 'Share files',
      properties: ['openFile', filesOnly ? false : 'openDirectory', 'multiSelections'].filter(Boolean)
    })
    if (!files || !files.length) return

    // create the dat and import the files
    const archive = await DatArchive.create({
      title: `Shared files (${moment().format('M/DD/YYYY h:mm:ssa')})`,
      description: `Files shared with Beaker`,
      prompt: false
    })
    await Promise.all(files.map(src => DatArchive.importFromFilesystem({src, dst: archive.url, inplaceImport: false})))

    // open the new archive in the editor
    pages.setActive(pages.create('beaker://editor/' + archive.url.slice('dat://'.length) + '#setup'))
  }

  onOpenPage (e, url) {
    pages.setActive(pages.create(url))
    this.isDropdownOpen = false
    this.updateActives()
  }

  onClickRestart () {
    beaker.browser.restartBrowser()
  }
}
