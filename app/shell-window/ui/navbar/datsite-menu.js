import * as yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import {pluralize} from '../../../lib/strings'
import {RehostSlider} from '../../../lib/fg/rehost-slider'
import * as pages from '../../pages'

export class DatsiteMenuNavbarBtn {
  constructor (page) {
    this.page = page
    this.isDropdownOpen = false
    this.rehostSlider = null
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = this.page
    const isViewingDat = page && !!page.getViewedDatOrigin()
    if (!isViewingDat || !page.siteInfo) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderRehostDropdown(page)
    }

    // render btn
    return yo`
      <div id=${this.elId} class="rehost-navbar-menu">
        <button class="nav-peers-btn" onclick=${e => this.onClickDropdownBtn(e)}>
          <i class="fa fa-share-alt"></i>
          ${page.siteInfo.peers || 0}
        </button>
        ${dropdownEl}
      </div>
    `
  }

  renderRehostDropdown (page) {
    const isOwner = page.siteInfo.isOwner
    return yo`
      <div class="dropdown datsite-menu-dropdown rehost-menu-dropdown">
        <div class="dropdown-items datsite-menu-dropdown-items rehost-menu-dropdown-items with-triangle">
          <div class="header">
            <div class="header-info">
              <img class="favicon" src="beaker-favicon: ${page.getURL()}"/>
              <h1 class="page-title">
                ${page.siteInfo.title && page.siteInfo.title.length
                  ? page.siteInfo.title
                  : yo`<em>Untitled</em>`
                }
              </h1>
            </div>

            <div class="peer-count">
              ${page.siteInfo.peers || '0'} ${pluralize(page.siteInfo.peers, 'peer')} seeding these files
            </div>
          </div>

          ${this.rehostSlider.render()}

          <div class="network-url">
            <a onclick=${e => this.onOpenPage('beaker://settings#dat-network-activity')}>
              <i class="fa fa-gear"></i>
              Manage all network activity
            </a>
          </div>
        </div>
      `
  }

  get elId () {
    return 'toolbar-datsite-menu-' + this.page.id
  }

  updateActives () {
    yo.update(document.getElementById(this.elId), this.render())
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.rehostSlider.teardown()
      this.rehostSlider = null
      this.updateActives()
    }
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'rehost-navbar-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  async onClickDropdownBtn () {
    // toggle the dropdown
    if (this.isDropdownOpen) {
      this.close()
    } else {
      // create progress monitor
      const page = this.page
      if (!page || !page.siteInfo) {
        return
      }

      // render dropdown
      this.rehostSlider = new RehostSlider(page.siteInfo)
      await this.rehostSlider.setup()
      this.isDropdownOpen = true
      this.updateActives()
    }
  }

  onOpenPage (href) {
    this.isDropdownOpen = false
    pages.setActive(pages.create(href))
  }
}
