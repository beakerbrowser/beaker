/* globals beakerSitedata */

import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'
import { ucfirst, getPermId, getPermParam } from '../../../lib/strings'

export class SiteInfoNavbarBtn {
  constructor (page) {
    this.isDropdownOpen = false
    this.page = page
    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  render () {
    // pull details
    var protocolInfo = this.page.protocolInfo
    var siteLoadError = this.page.siteLoadError
    var icon = ''
    var protocolLabel = ''
    var protocolCls = 'insecure'
    var gotInsecureResponse = siteLoadError && siteLoadError.isInsecureResponse

    if (siteLoadError) {
      icon = 'exclamation-circle'
      protocolLabel = ''
    }

    if (protocolInfo) {
      var isHttps = ['https:'].includes(protocolInfo.scheme)

      if (isHttps && !gotInsecureResponse && !siteLoadError) {
        icon = 'lock'
        protocolLabel = 'Secure'
        protocolCls = 'secure'
      } else if (protocolInfo.scheme === 'http:' || (isHttps && gotInsecureResponse)) {
        icon = 'exclamation-circle https-error'
        protocolLabel = 'Not secure'
      } else if (protocolInfo.scheme === 'dat:') {
        icon = 'share-alt'
        protocolLabel = 'Secure P2P'
        protocolCls = 'p2p'
      } else if (protocolInfo.scheme === 'beaker:') {
        protocolCls = 'beaker'
        icon = ''
      }
    }

    // render btn
    var iconEl = (icon) ? yo`<i class="fa fa-${icon}"></i>` : ''
    var titleEl = (protocolLabel) ? yo`<span class="title">${protocolLabel}</span>` : ''
    return yo`<div class="toolbar-site-info ${protocolCls}">
      <button onclick=${e => this.toggleDropdown(e)}>${iconEl} ${titleEl}</button>
      ${this.renderDropdown()}
    </div>`
  }

  renderDropdown () {
    if (!this.isDropdownOpen) {
      return ''
    }
    var protocolInfo = this.page.protocolInfo
    var siteInfo = this.page.siteInfo
    var sitePerms = this.page.sitePerms

    // pull details
    var protocolDesc = ''
    if (protocolInfo) {
      if (['https:'].includes(protocolInfo.scheme)) {
        protocolDesc = 'Your connection to this site is secure.'
      } else if (protocolInfo.scheme === 'http:') {
        protocolDesc = yo`
          <div>
            <p>
              Your connection to this site is not secure.
            </p>

            <small>
              You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.
            </small>
          </div>
        `
      } else if (['dat:'].indexOf(protocolInfo.scheme) != -1) {
        protocolDesc = yo`<span>
          This site was downloaded from a secure peer-to-peer network.
          <a onclick=${e => this.learnMore()}>Learn More</a>
        </span>`
      }
    }

    // site permissions
    var permsEls = []
    if (sitePerms) {
      for (var k in sitePerms) {
        permsEls.push(this.renderPerm(k, sitePerms[k]))
      }
    }
    if (siteInfo && siteInfo.requiresRefresh) {
      permsEls.push(yo`<div>
        <a><label class="checked" onclick=${this.onClickRefresh.bind(this)}><span class="icon icon-ccw"></span> Refresh to apply changes.</label></a>
      </div>`)
    }

    // dropdown
    return yo`
      <div class="dropdown toolbar-dropdown toolbar-site-info-dropdown">
        <div class="dropdown-items visible with-triangle left">
          <div class="details">
            <div class="details-title">
              ${this.getTitle() || this.getHostname() || this.getUrl()}
            </div>
            <p class="details-desc">
              ${protocolDesc}
            </p>
          </div>
          <div class="perms">${permsEls}</div>
        </div>
      </div>`
  }

  getTitle () {
    var title = ''
    if (this.page.siteInfoOverride && this.page.siteInfoOverride.title) {
      title = this.page.siteInfoOverride.title
    } else if (this.page.siteInfo && this.page.siteInfo.title) {
      title = this.page.siteInfo.title
    } else if (this.page.protocolInfo && this.page.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    return title
  }

  getUrl () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.url : ''
  }

  getHostname () {
    return (this.page.protocolInfo) ? this.page.protocolInfo.hostname : ''
  }

  updateActives () {
    // FIXME
    // calling `this.render` for all active site-infos is definitely wrong
    // there is state captured in `this` that is specific to each instance
    // ...this entire thing is kind of bad
    // -prf
    Array.from(document.querySelectorAll('.toolbar-site-info')).forEach(el => yo.update(el, this.render()))
  }

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

  closeDropdown () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
      this.updateActives()
    }
  }

  toggleDropdown (e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  renderPerm (perm, value) {
    const permId = getPermId(perm)
    const permParam = getPermParam(perm)
    var icon = PERMS[permId] ? PERMS[permId].icon : ''
    var desc = PERMS[permId] ? PERMS[permId].desc : ''
    if (typeof desc === 'function') desc = desc(permParam, pages, { capitalize: true })
    if (typeof desc === 'string') desc = ucfirst(desc)
    return yo`<div>
      <label class=${value ? 'checked' : ''} onclick=${e => this.togglePerm(perm)}><input type="checkbox" value="${perm}" ${value ? 'checked' : ''} /> <span class="icon icon-${icon}"></span> ${desc}</label>
    </div>`
  }

  togglePerm (perm) {
    // update perm
    var newValue = (this.page.sitePerms[perm] === 1) ? 0 : 1
    beakerSitedata.setPermission(this.page.protocolInfo.url, perm, newValue).then(() => {
      this.page.sitePerms[perm] = newValue

      // requires refresh?
      const permId = getPermId(perm)
      this.page.siteInfo.requiresRefresh = (PERMS[permId] && PERMS[permId].requiresRefresh)

      // rerender
      this.updateActives()
    })
  }

  viewSiteFiles (subpage) {
    const { hostname } = this.page.protocolInfo
    pages.setActive(pages.create('beaker://library/' + hostname + '#' + subpage))
    this.closeDropdown()
  }

  learnMore () {
    pages.setActive(pages.create('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22'))
  }
}
