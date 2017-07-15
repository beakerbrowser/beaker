/* globals beakerSitedata */

import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'
import { ucfirst, getPermId, getPermParam } from '../../../lib/strings'

export class SiteInfoNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.siteInfo = false
    this.sitePerms = false
    this.siteInfoOverride = false
    this.protocolInfo = false
    this.siteLoadError = false
    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  render () {
    // pull details
    var icon = ''
    var protocolLabel = ''
    var protocolCls = 'insecure'
    var gotInsecureResponse = this.siteLoadError && this.siteLoadError.isInsecureResponse

    if (this.siteLoadError) {
      icon = 'exclamation-circle'
      protocolLabel = ''
    }

    if (this.protocolInfo) {
      var isHttps = ['https:'].includes(this.protocolInfo.scheme)

      if (isHttps && !gotInsecureResponse && !this.siteLoadError) {
        icon = 'lock'
        protocolLabel = 'Secure'
        protocolCls = 'secure'
      } else if (this.protocolInfo.scheme === 'http:' || (isHttps && gotInsecureResponse)) {
        icon = 'exclamation-circle https-error'
        protocolLabel = 'Not secure'
      } else if (['dat:'].indexOf(this.protocolInfo.scheme) != -1) {
        icon = 'share-alt'
        protocolLabel = 'Secure P2P'
        protocolCls = 'p2p'
      } else if (this.protocolInfo.scheme === 'beaker:') {
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

    // pull details
    var protocolDesc = ''
    if (this.protocolInfo) {
      if (['https:'].includes(this.protocolInfo.scheme)) {
        protocolDesc = 'Your connection to this site is secure.'
      } else if (this.protocolInfo.scheme === 'http:') {
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
      } else if (['dat:'].indexOf(this.protocolInfo.scheme) != -1) {
        protocolDesc = yo`<span>
          This site was downloaded from a secure peer-to-peer network.
          <a onclick=${e => this.learnMore()}>Learn More</a>
        </span>`
      }
    }

    // site permissions
    var permsEls = []
    if (this.sitePerms) {
      for (var k in this.sitePerms) {
        permsEls.push(this.renderPerm(k, this.sitePerms[k]))
      }
    }
    if (this.siteInfo && this.siteInfo.requiresRefresh) {
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
    if (this.siteInfoOverride && this.siteInfoOverride.title) {
      title = this.siteInfoOverride.title
    } else if (this.siteInfo && this.siteInfo.title) {
      title = this.siteInfo.title
    } else if (this.protocolInfo && this.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    return title
  }

  getUrl () {
    return (this.protocolInfo) ? this.protocolInfo.url : ''
  }

  getHostname () {
    return (this.protocolInfo) ? this.protocolInfo.hostname : ''
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
    pages.getActive().reload()
    this.closeDropdown()
  }

  closeDropdown () {
    this.isDropdownOpen = false
    this.updateActives()
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
    var newValue = (this.sitePerms[perm] === 1) ? 0 : 1
    beakerSitedata.setPermission(this.protocolInfo.url, perm, newValue).then(() => {
      this.sitePerms[perm] = newValue

      // requires refresh?
      const permId = getPermId(perm)
      this.siteInfo.requiresRefresh = (PERMS[permId] && PERMS[permId].requiresRefresh)

      // rerender
      this.updateActives()
    })
  }

  viewSiteFiles (subpage) {
    const { hostname } = this.protocolInfo
    pages.setActive(pages.create('beaker://library/' + hostname + '#' + subpage))
    this.closeDropdown()
  }

  learnMore () {
    pages.setActive(pages.create('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22'))
  }
}
