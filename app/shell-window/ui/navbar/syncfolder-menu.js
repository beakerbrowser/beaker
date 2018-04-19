/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import _get from 'lodash.get'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class SyncfolderMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    const isViewingDat = page && !!page.getIntendedURL().startsWith('dat:')
    const localSyncPath = _get(page, 'siteInfo.userSettings.localSyncPath')
    if (!isViewingDat || !localSyncPath) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderDropdown(page)
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu syncfolder-dropdown-menu">
        <button class="btn nofocus ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span>
            ${localSyncPath}
          </span>

          <span class="fa fa-caret-down"></span>
        </button>
        ${dropdownEl}
      </div>
    `
  }

  renderDropdown (page) {
    // render the dropdown
    return yo`
      <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
        <div class="dropdown-items compact with-triangle">
          <div class="dropdown-item" onclick=${() => this.onClickOpenFolder()}>
            <i class="fa fa-folder-open-o"></i>
            Open folder
          </div>
        </div>
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.syncfolder-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.updateActives()
    }
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'syncfolder-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onClickOpenFolder () {
    this.close()
    const page = pages.getActive()
    const localSyncPath = _get(page, 'siteInfo.userSettings.localSyncPath')
    if (!localSyncPath) return
    beaker.browser.openFolder(localSyncPath)
  }
}
