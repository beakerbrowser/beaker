import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'
import { ucfirst, getPermId, getPermParam } from '../../../lib/strings'

export class SiteInfoNavbarBtn {
  constructor() {
    this.isDropdownOpen = false
    this.siteInfo = false
    this.sitePerms = false
    this.siteInfoOverride = false
    this.protocolInfo = false
    window.addEventListener('click', e => this.onClickAnywhere(e)) // close dropdown on click outside
    pages.on('set-active', e => this.closeDropdown()) // close dropdown on tab change
  }

  render() {
    // pull details
    var icon = '', protocolCls = 'insecure', protocolLabel = ''
    if (this.protocolInfo) {
      if (['https:'].includes(this.protocolInfo.scheme)) {
        icon = 'lock'
        protocolLabel = 'Secure'
        protocolCls = 'secure'
      } else if (this.protocolInfo.scheme === 'http:') {
        icon = 'info-circled'
      } else if (['dat:', 'fs:'].indexOf(this.protocolInfo.scheme) != -1) {
        icon = 'share'
        protocolLabel = 'Secure P2P'
        protocolCls = 'p2p'
      }
    }

    // render btn
    var iconEl = (icon) ? yo`<span class="icon icon-${icon}"></span>` : ''
    var titleEl = (protocolLabel) ? yo`<span class="title">${protocolLabel}</span>`: ''
    return yo`<div class="toolbar-site-info ${protocolCls}">
      <button onclick=${e => this.toggleDropdown(e)}>${iconEl} ${titleEl}</button>
    </div>`
  }

  renderDropdown() {
    if (!this.isDropdownOpen) {
      return yo`<div></div>`
    }

    // pull details
    var protocolDesc = ''
    if (this.protocolInfo) {
      if (['https:'].includes(this.protocolInfo.scheme)) {
        protocolDesc = 'Your connection to this site is private.'
      } else if (this.protocolInfo.scheme === 'http:') {
        protocolDesc = 'Your connection to this site is not private.'
      } else if (['dat:', 'fs:'].indexOf(this.protocolInfo.scheme) != -1) {
        protocolDesc = yo`<span>
          This site was downloaded from a secure peer-to-peer network.
          <a onclick=${e => this.learnMore()}>Learn More</a>
        </span>`
      }
    }

    // site controls
    let siteCtrlsEl = ''
    if (this.protocolInfo) {
      if (this.protocolInfo.scheme === 'dat:') {
        siteCtrlsEl = yo`<div><hr /><span>
          <a onclick=${e => this.viewSiteFiles('files')}>View site files</a>|
          <a onclick=${e => this.viewSiteFiles('fork')}>Fork site</a>
        </span></div>`
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
    return yo`<div class="toolbar-dropdown toolbar-site-info-dropdown">
      <div class="details">
        <div class="details-title">
          <img src="beaker-favicon:${this.getUrl()}" />
          <strong>${this.getTitle() || this.getHostname() || this.getUrl()}</strong>
        </div>
        <div><small>${protocolDesc}</small></div>
        ${siteCtrlsEl}
      </div>
      <div class="perms">${permsEls}</div>
    </div>`
  }

  getTitle() {
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

  getUrl() {
    return (this.protocolInfo) ? this.protocolInfo.url : ''
  }

  getHostname() {
    return (this.protocolInfo) ? this.protocolInfo.hostname : ''
  }

  updateActives() {
    // FIXME
    // calling `this.render` for all active site-infos is definitely wrong
    // there is state captured in `this` that is specific to each instance
    // ...this entire thing is kind of bad
    // -prf
    Array.from(document.querySelectorAll('.toolbar-site-info')).forEach(el => yo.update(el, this.render()))
    Array.from(document.querySelectorAll('.toolbar-site-info-dropdown')).forEach(el => {
      if (this.isDropdownOpen) {
        yo.update(el, this.renderDropdown())
      } else {
        el.parentNode.removeChild(el)
      }
    })
  }

  onClickAnywhere(e) {
    if (!this.isDropdownOpen) return
    // close the dropdown if not a click within the dropdown
    if (findParent(e.target, 'toolbar-site-info-dropdown')) return
    this.closeDropdown()
  }

  onClickRefresh() {
    pages.getActive().reload()
    this.closeDropdown()
  }

  closeDropdown() {
    this.isDropdownOpen = false
    this.updateActives()    
  }

  toggleDropdown(e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    this.isDropdownOpen = !this.isDropdownOpen
    if (this.isDropdownOpen) {
      // create a new dropdown el on the page
      document.body.appendChild(this.renderDropdown())
    }
    this.updateActives()
  }

  renderPerm (perm, value) {
    const permId = getPermId(perm)
    const permParam = getPermParam(perm)
    const checked = !!value
    var icon = PERMS[permId] ? PERMS[permId].icon : ''
    var desc = PERMS[permId] ? PERMS[permId].desc : ''
    if (typeof desc === 'function') desc = desc(permParam, pages, { capitalize: true })
    if (typeof desc === 'string') desc = ucfirst(desc)
    return yo`<div>
      <label class=${value ? 'checked' : ''} onclick=${e=>this.togglePerm(perm)}><input type="checkbox" value="${perm}" ${value ? 'checked' : ''} /> <span class="icon icon-${icon}"></span> ${desc}</label>
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

  viewSiteFiles(subpage) {
    const { hostname } = this.protocolInfo
    pages.setActive(pages.create('beaker:library/' + hostname + '#' + subpage))
    this.closeDropdown()
  }

  learnMore() {
    pages.setActive(pages.create('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22'))
  }
}

function shorten (str) {
  if (str.length > 40) return (str.slice(0, 37) + '...')
  return str
}