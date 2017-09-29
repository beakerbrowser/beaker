/* globals beaker DatArchive beaker.browser */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

// there can be many drop menu btns rendered at once, but they are all showing the same information
// the PageMenuNavbarBtn manages all instances, and you should only create one

export class PageMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.isOpenwithOpen = false
    this.openwithMouseLeaveTimer = null
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    if (!page || !page.protocolInfo || ['dat:','app:'].includes(page.protocolInfo.scheme) === false) {
      return ''
    }
    const isInstalledApp = page.isInstalledApp()

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      var openwithSublist
      if (this.isOpenwithOpen) {
        openwithSublist = yo`
          <div class="dropdown-items sublist">
            <div class="list">
              <div class="list-item" onclick=${() => this.onClickOpenwithLibrary()}>
                Library
              </div>
            </div>
          </div>
        `
      }
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items with-triangle">
            <div class="list">
              ${'' /* TODO restore if/when needed
              <div
                class="list-item"
                onmouseenter=${() => this.onMouseEnterOpenwith()}
                onmouseleave=${() => this.onMouseLeaveOpenwith()}
              >
                <i class="fa fa-share"></i>
                Open with...
                <i class="fa fa-caret-right"></i>
                ${openwithSublist}
              </div>
              <hr />*/}
              <div class="list-item" onclick=${() => this.onClickInstall()}>
                <i class=${!isInstalledApp ? 'fa fa-download' : 'fa fa-wrench'}></i>
                ${!isInstalledApp ? 'Install as an app' : 'Configure this app'}
              </div>
              ${isInstalledApp ?
                yo`
                  <div class="list-item" onclick=${() => this.onClickUninstall()}>
                    <i class="fa fa-trash-o"></i>
                    Uninstall this app
                  </div>
                `
                : ''}
              <hr />
              <div class="list-item" onclick=${() => this.onClickOpenwithLibrary()}>
                <i class="fa fa-files-o"></i>
                View files
              </div>
              <div class="list-item" onclick=${() => this.onClickFork()}>
                <i class="fa fa-code-fork"></i>
                Fork this site
              </div>
              <div class="list-item" onclick=${() => this.onClickDownloadZip()}>
                <i class="fa fa-file-archive-o"></i>
                Download as .zip
              </div>
            </div>
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu page-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span class="fa fa-ellipsis-h"></span>
        </button>
        ${dropdownEl}
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.page-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.isOpenwithOpen = false
      this.updateActives()
    }
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    if (!this.isDropdownOpen) {
      this.isOpenwithOpen = false
    }
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'page-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onMouseEnterOpenwith () {
    if (this.openwithMouseLeaveTimer) {
      clearTimeout(this.openwithMouseLeaveTimer)
      this.openwithMouseLeaveTimer = null
    }
    this.isOpenwithOpen = true
    this.updateActives()
  }

  onMouseLeaveOpenwith () {
    this.openwithMouseLeaveTimer = setTimeout(() => {
      this.isOpenwithOpen = false
      this.updateActives()
    }, 300)
  }

  async onClickInstall () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    const res = await beaker.apps.runInstaller(0, datUrl)
    if (res && res.name) {
      page.loadURL(`app://${res.name}`)
    }
  }

  async onClickUninstall () {
    this.close()
    const page = pages.getActive()
    if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'app:') {
      return
    }
    if (!confirm('Are you sure you want to uninstall this app?')) {
      return
    }
    const name = page.protocolInfo.hostname
    const res = await beaker.apps.unbind(0, name)
    const datUrl = page.getViewedDatOrigin()
    page.loadURL(datUrl || 'beaker://start/')
  }

  onClickOpenwithLibrary () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    page.loadURL(`beaker://library/${datUrl.slice('dat://'.length)}`)
  }

  async onClickFork () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    const fork = await DatArchive.fork(datUrl, {prompt: true}).catch(() => {})
    if (fork) {
      page.loadURL(fork.url)
    }
  }

  onClickDownloadZip () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    beaker.browser.downloadURL(`${datUrl}?download_as=zip`)
  }
}
