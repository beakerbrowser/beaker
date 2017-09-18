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
    var page = pages.getActive()
    if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'dat:') {
      return yo`<span />`
    }

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

  onClickOpenwithLibrary () {
    this.close()
    var page = pages.getActive()
    if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'dat:') {
      return
    }
    page.loadURL(`beaker://library/${page.siteInfo.key}`)
  }

  onClickFork () {
    this.close()
    var page = pages.getActive()
    if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'dat:') {
      return
    }
    DatArchive.fork(page.siteInfo.key, {prompt: true}).catch(() => {})
  }

  onClickDownloadZip () {
    this.close()
    var page = pages.getActive()
    if (!page || !page.protocolInfo || page.protocolInfo.scheme !== 'dat:') {
      return
    }
    beaker.browser.downloadURL(`dat://${page.siteInfo.key}/?download_as=zip`)
  }
}
