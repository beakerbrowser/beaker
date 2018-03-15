/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class WorkspacesiteMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    const isViewingWorkspace = page && !!page.getIntendedURL().startsWith('workspace:')
    if (!isViewingWorkspace) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderDropdown(page)
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu workspace-dropdown-menu page-dropdown-menu">
        <button class="btn lime nofocus ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span>
            ${page.siteInfo && page.siteInfo.localFilesPath ? page.siteInfo.localFilesPath : ''}
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
          <div class="dropdown-item" onclick=${() => this.onClickViewSite()}>
            <i class="fa fa-external-link"></i>
            View live version
          </div>

          <div class="dropdown-item" onclick=${() => this.onClickViewFiles()}>
            <i class="fa fa-book"></i>
            Open in Library
          </div>

          <div class="dropdown-item" onclick=${() => this.onClickOpenWorkspaceDirectory()}>
            <i class="fa fa-folder-open-o"></i>
            Open workspace directory
          </div>
        </div>
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.workspace-dropdown-menu')).forEach(el => yo.update(el, this.render()))
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
    var parent = findParent(e.target, 'workspace-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onClickViewSite () {
    this.close()
    const page = pages.getActive()
    if (!page || page.protocolInfo.scheme !== 'workspace:') return
    page.loadURL(page.siteInfo.publishTargetUrl)
  }

  onClickOpenWorkspaceDirectory () {
    this.close()
    const page = pages.getActive()
    if (!page || page.protocolInfo.scheme !== 'workspace:') return
    beaker.browser.openFolder(page.siteInfo.localFilesPath)
  }

  onClickViewFiles () {
    this.close()
    const page = pages.getActive()
    if (!page || page.protocolInfo.scheme !== 'workspace:') return
    page.loadURL(`beaker://library/${page.siteInfo.publishTargetUrl}`)
  }
}
