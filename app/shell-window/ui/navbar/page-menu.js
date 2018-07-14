/* globals beaker DatArchive confirm */

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
    if (!page || !page.protocolInfo || ['dat:'].includes(page.protocolInfo.scheme) === false) {
      return ''
    }
    const isInstalledApp = page.isInstalledApp()
    const isDat = !!page.getViewedDatOrigin()

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      /*var openwithSublist TODO restore if/when needed
      if (this.isOpenwithOpen) {
        openwithSublist = yo`
          <div class="dropdown-items sublist">
            <div class="list">
              <div class="list-item" onclick=${() => this.onClickViewFiles()}>
                Library
              </div>
            </div>
          </div>
        `
      } */
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
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
              <hr /> */}
              ${'' // TODO(apps) restore when we bring back apps -prf
              /*isAppScheme ? yo`<div>
                <div class="list-item" onclick=${() => isDat ? this.onClickInstall() : this.onClickEditSettings()}>
                  <i class="fa fa-wrench"></i>
                  Configure this app
                </div>
                ${isInstalledApp ?
                  yo`
                    <div class="list-item" onclick=${() => this.onClickUninstall()}>
                      <i class="fa fa-trash-o"></i>
                      Uninstall this app
                    </div>
                  `
                  : ''}
              </div>` : ''}
              ${isAppScheme && isDat ? yo`<hr />` : ''*/}

            ${isDat
              ? yo`
                <div class="dropdown-items compact with-triangle">
                  <div class="dropdown-item" onclick=${() => this.onClickViewFiles()}>
                    <i class="fa fa-files-o"></i>
                    View Source
                  </div>

                  <div class="dropdown-item" onclick=${() => this.onClickCompare()}>
                    <i class="fa fa-code-fork"></i>
                    Compare and Merge
                  </div>

                  <hr />

                  <div class="dropdown-item" onclick=${() => this.onToggleLiveReloading()}>
                    <i class="fa fa-bolt"></i>
                    Toggle live reloading
                  </div>

                  <div class="dropdown-item" onclick=${() => this.onClickNetworkDebugger()}>
                    <i class="fa fa-bug"></i>
                    Network debugger
                  </div>

                  <div class="dropdown-item" onclick=${() => this.onClickDownloadZip()}>
                    <i class="fa fa-file-archive-o"></i>
                    Download as .zip
                  </div>

                  <hr />

                  <div class="dropdown-item" onclick=${() => this.onClickFork()}>
                    <i class="fa fa-clone"></i>
                    Make editable copy
                  </div>
                </div>`
              : ''
            }

            ${'' // TODO(apps) restore when we bring back apps -prf
            /*isDat && !isInstalledApp ? yo`<div>
              <hr />
              <div class="list-item" onclick=${() => this.onClickInstall()}>
                <i class="fa fa-download"></i>
                Install as an app
              </div>
            </div>` : ''*/}
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
    Array.from(document.querySelectorAll('.page-dropdown-menu')).forEach(el => {
      var newEl = this.render()
      if (newEl) yo.update(el, newEl)
    })
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

  // TODO(apps) restore when we bring back apps -prf
  // async onClickInstall () {
  //   this.close()
  //   const page = pages.getActive()
  //   const datUrl = page && page.getViewedDatOrigin()
  //   if (!datUrl) return
  //   const res = await beaker.apps.runInstaller(0, datUrl)
  //   if (res && res.name) {
  //     page.loadURL(`app://${res.name}`)
  //   }
  // }

  async onClickEditSettings () {
    this.close()
    pages.setActive(pages.create('beaker://settings'))
  }

  // TODO(apps) restore when we bring back apps -prf
  // async onClickUninstall () {
  //   this.close()
  //   const page = pages.getActive()
  //   if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'app:') {
  //     return
  //   }
  //   if (!confirm('Are you sure you want to uninstall this app?')) {
  //     return
  //   }
  //   const name = page.protocolInfo.hostname
  //   await beaker.apps.unbind(0, name)
  //   const datUrl = page.getViewedDatOrigin()
  //   page.loadURL(datUrl || 'beaker://start/')
  // }

  onClickViewFiles () {
    this.close()
    const page = pages.getActive()
    if (!page || !page.getViewedDatOrigin()) return
    pages.setActive(pages.create(`beaker://library/dat://${page.siteInfo.key}`))
  }

  onClickNetworkDebugger () {
    this.close()
    const page = pages.getActive()
    if (!page || !page.getViewedDatOrigin()) return
    pages.setActive(pages.create(`beaker://swarm-debugger/dat://${page.siteInfo.key}`))
  }

  async onClickFork () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    const fork = await DatArchive.fork(datUrl, {prompt: true}).catch(() => {})
    if (fork) {
      page.loadURL(`beaker://library/${fork.url}#setup`)
    }
  }

  async onClickCompare () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!page || !page.getViewedDatOrigin()) return
    pages.setActive(pages.create(`beaker://compare?base=${encodeURIComponent('dat://' + page.siteInfo.key)}`))
  }

  async onToggleLiveReloading () {
    this.close()
    const page = pages.getActive()
    page.toggleLiveReloading()
  }

  onClickDownloadZip () {
    this.close()
    const page = pages.getActive()
    const datUrl = page && page.getViewedDatOrigin()
    if (!datUrl) return
    beaker.browser.downloadURL(`${datUrl}?download_as=zip`)
  }
}
