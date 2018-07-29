/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import _get from 'lodash.get'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'
import * as toast from '../toast'

export class SyncfolderMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    const isViewingDat = page && !!page.getIntendedURL().startsWith('dat:')
    var isTemporary = _get(page, 'siteInfo.isTemporary')
    var isSaved = _get(page, 'siteInfo.userSettings.isSaved')
    var localSyncPath = _get(page, 'siteInfo.userSettings.localSyncPath')
    if (!isViewingDat || !localSyncPath || !(isTemporary || isSaved)) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderDropdown(page)
    }

    // truncate long sync paths
    if (localSyncPath.length > 40) {
      localSyncPath = localSyncPath.slice(0, 17) + '...' + localSyncPath.slice(-20)
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu syncfolder-dropdown-menu">
        <button class="btn nofocus ${this.isDropdownOpen ? 'pressed' : ''} ${isTemporary ? 'preview' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <strong>${isTemporary ? 'Preview' : 'Published'}:</strong>
          <span>${localSyncPath}</span>
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
          <div class="dropdown-item" onclick=${() => this.onClickCopyPath()}>
            <i class="fa fa-clipboard"></i>
            Copy path
          </div>
          <hr />
          <div class="dropdown-item" onclick=${() => this.onClickConfigure()}>
            <i class="fa fa-wrench"></i>
            Configure
          </div>
        </div>
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.syncfolder-dropdown-menu')).forEach(el => {
      var newEl = this.render()
      if (newEl) yo.update(el, newEl)
    })
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

  onClickCopyPath () {
    this.close()
    const page = pages.getActive()
    const localSyncPath = _get(page, 'siteInfo.userSettings.localSyncPath')
    if (!localSyncPath) return
    writeToClipboard(localSyncPath)
    toast.create('Copied to clipboard', 1e3)
  }

  onClickConfigure () {
    this.close()
    const page = pages.getActive()
    if (!page || !page.getViewedDatOrigin()) return
    pages.setActive(pages.create(`beaker://library/dat://${page.siteInfo.key}#settings`))
  }
}
