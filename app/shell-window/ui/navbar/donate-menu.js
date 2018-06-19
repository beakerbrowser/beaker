/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {findParent} from '../../../lib/fg/event-handlers'
import {pluralize} from '../../../lib/strings'
import ArchiveProgressMonitor from '../../../lib/fg/archive-progress-monitor'
import ProgressPieSVG from '../../../lib/fg/progress-pie-svg'
import * as pages from '../../pages'

export class DonateMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    const page = pages.getActive()
    if (!page.siteInfo || !page.siteInfo.links.payment) {
      return ''
    }

    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = this.renderDropdown(page)
    }

    // render btn
    return yo`
      <div class="donate-navbar-menu">
        <button class="nav-donate-btn" title="Donate to this site" onclick=${e => this.onClickBtn(e)}>
          <i class="fa fa-heart-o"></i>
        </button>
        ${dropdownEl}
      </div>
    `
  }

  renderDropdown (page) {
    var paymentUrl = page.siteInfo.links.payment[0].href

    // resolve any relative links
    if (paymentUrl.indexOf('://') === -1) {
      paymentUrl = `${page.siteInfo.url}${paymentUrl.startsWith('/') ? '' : '/'}${paymentUrl}`
    }

    // render the dropdown if open
    return yo`
      <div class="dropdown datsite-menu-dropdown donate-menu-dropdown">
        <div class="dropdown-items datsite-menu-dropdown-items donate-menu-dropdown-items with-triangle">
          <div class="header">
            <div class="header-info">
              <span class="fa fa-heart-o"></span>
              <h1>
                Contribute to
                ${page.siteInfo.title && page.siteInfo.title.length
                  ? page.siteInfo.title
                  : 'this site'
                }
              </h1>
            </div>
          </div>
          <div class="body">
            <div>
              Visit their donation page to show your appreciation!
            </div>
            <div>
              <a href="#" class="link" onclick=${e => this.onOpenPage(paymentUrl)}>${paymentUrl}</a>
            </div>
          </div>
        </div>
      `
  }

  updateActives () {
    Array.from(document.querySelectorAll('.donate-navbar-menu')).forEach(el => {
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
    var parent = findParent(e.target, 'donate-navbar-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onOpenPage (href) {
    this.isDropdownOpen = false
    pages.setActive(pages.create(href))
  }
}
