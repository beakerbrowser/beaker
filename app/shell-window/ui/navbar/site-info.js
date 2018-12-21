/* globals beaker */

import * as yo from 'yo-yo'
import * as pages from '../../pages'
import renderPadlockIcon from '../icon/padlock'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'
import { ucfirst, getPermId, getPermParam, shortenHash } from '../../../lib/strings'
import SiteInfoClasses from './site-infos/index'
import {DefaultSiteInfo} from './site-infos/default'

export class SiteInfoNavbarBtn {
  constructor (page) {
    this.isDropdownOpen = false
    this.page = page
    this.dropdownUI = false
    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  // rendering
  // =

  render () {
    // pull details
    var titleEl = ''
    var trustCls = 'not-trusted'
    const isLoading = this.page.isLoading()
    const {siteInfo, siteTrust, protocolInfo} = this.page
    const scheme = (isLoading) ? (this.page.getIntendedURL().split(':').shift() + ':') : protocolInfo.scheme
    var trustCls = siteTrust ? siteTrust.getRating() : 'not-trusted'

    if (siteInfo && siteInfo.isOwner) {
      titleEl = yo`<div class="title">${siteInfo.title}<i class="fa fa-check-circle"></i></div>`      
    } else if (siteTrust && siteTrust.isTitleVerified) {
        titleEl = yo`<div class="title">${siteInfo.title}<i class="fa fa-check"></i></div>`
    } else if (siteTrust && siteTrust.hasTrustedFollower) {
      titleEl = yo`<div class="title">${siteInfo.title}</div>`
    } else if (siteTrust && siteTrust.isDomainVerified && protocolInfo && protocolInfo.hostname) {
      titleEl = yo`<span class="title">${protocolInfo.hostname}</span>`
    }

    return yo`
      <div class="toolbar-site-info ${trustCls} ${!!titleEl ? 'has-title' : ''}" id="${this.elId}">
        <button onclick=${isLoading ? undefined : e => this.onToggleDropdown(e)}>${this.renderIcon()}${titleEl}</button>
        ${this.renderDropdown()}
      </div>
    `
  }

  renderDropdown () {
    if (!this.isDropdownOpen) {
      return ''
    }

    // site permissions
    var permsEls = []
    if (this.page.sitePerms) {
      for (var k in this.page.sitePerms) {
        permsEls.push(this.renderPerm(k, this.page.sitePerms[k]))
      }
    }
    if (this.page.siteInfo && this.page.siteInfo.requiresRefresh) {
      permsEls.push(
        yo`
          <div class="perm"><a>
            <label class="checked" onclick=${this.onClickRefresh.bind(this)}>
              <i class="fa fa-undo fa-flip-horizontal"></i>
              Refresh to apply changes.
            </label>
          </a></div>
        `
      )
    }

    // dropdown
    return yo`
      <div class="dropdown toolbar-dropdown toolbar-site-info-dropdown">
        <div class="dropdown-items with-triangle left">
          ${this.dropdownUI ? this.dropdownUI.render() : ''}
          ${permsEls.length ? yo`<h2 class="perms-heading">Permissions</h2>` : ''}
          <div class="perms">${permsEls}</div>
        </div>
      </div>`
  }

  renderPerm (perm, value) {
    const permId = getPermId(perm)
    const permParam = getPermParam(perm)
    var icon = PERMS[permId] ? PERMS[permId].icon : ''
    var desc = PERMS[permId] ? PERMS[permId].desc : ''
    if (typeof desc === 'function') desc = desc(permParam, pages, { capitalize: true })
    if (typeof desc === 'string') desc = ucfirst(desc)
    if (!desc) return ''
    return yo`
      <div class="perm">
        <label class=${value ? 'checked' : ''} onclick=${e => this.onTogglePerm(perm)}>
          <i class="fa fa-${icon}"></i>
          ${desc}
          <input type="checkbox" value="${perm}" ${value ? 'checked' : ''} />
        </label>
      </div>`
  }

  renderIcon () {
    var iconEl = ''
    const isLoading = this.page.isLoading()
    const {siteInfo, siteTrust, protocolInfo} = this.page    
    const scheme = (isLoading) ? (this.page.getIntendedURL().split(':').shift() + ':') : protocolInfo.scheme
    const type = siteInfo && siteInfo.type ? siteInfo.type : null
    const trustRating = siteTrust ? siteTrust.getRating() : 'not-trusted'
    if (scheme) {
      if (scheme === 'beaker:') {
        return '' // TODO
      } else if (scheme === 'https:' && trustRating !== 'distrusted') {
        return renderPadlockIcon()
      } else if (scheme === 'http:' || trustRating === 'distrusted') {
        return yo`<i class="fa fa-exclamation-circle"></i>`
      } else if (scheme === 'dat:') {
        if (type && type.includes('unwalled.garden/user')) {
          return yo`<i class="fa fa-user"></i>`
        } else {
          return yo`<i class="fa fa-share-alt"></i>`
        }
      }
    }
    return ''
  }

  get elId () {
    return 'toolbar-site-info-' + this.page.id
  }

  updateActives () {
    yo.update(document.getElementById(this.elId), this.render())
  }

  openDropdown () {
    if (!this.isDropdownOpen) {
      this.isDropdownOpen = true
      this.dropdownUI = this.spawnDropdownUI()
      this.dropdownUI.on('rerender', () => this.updateActives())
      this.updateActives()
    }    
  }

  closeDropdown () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.dropdownUI = false
      this.updateActives()
    }
  }

  spawnDropdownUI () {
    // find a site-info ui
    var SiteInfoClass
    for (let SIC of Object.values(SiteInfoClasses)) {
      if (SIC.shouldRender(this.page)) {
        SiteInfoClass = SIC
        break
      }
    }

    // instantiate
    return SiteInfoClass ? new SiteInfoClass(this.page) : new DefaultSiteInfo(this.page)
  }

  // event handlers
  // ==

  onClickAnywhere (e) {
    if (!this.isDropdownOpen) return
    // close the dropdown if not a click within the dropdown
    if (findParent(e.target, 'toolbar-site-info-dropdown')) return
    this.closeDropdown()
  }

  onClickRefresh () {
    this.page.reload()
    this.closeDropdown()
  }

  onToggleDropdown (e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (this.isDropdownOpen) this.closeDropdown()
    else this.openDropdown()
  }

  onTogglePerm (perm) {
    // update perm
    var newValue = (this.page.sitePerms[perm] === 1) ? 0 : 1
    beaker.sitedata.setPermission(this.page.protocolInfo.url, perm, newValue).then(() => {
      this.page.sitePerms[perm] = newValue

      // requires refresh?
      const permId = getPermId(perm)
      this.page.siteInfo.requiresRefresh = (PERMS[permId] && PERMS[permId].requiresRefresh)

      // rerender
      this.updateActives()
    })
  }

  onLearnMore () {
    pages.setActive(pages.create('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22'))
  }
}
