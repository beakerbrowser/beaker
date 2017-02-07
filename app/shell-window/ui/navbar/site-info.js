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
    var title = '', url = '', hostname = '', icon = ''
    var protocolCls = 'insecure', protocolLabel = '', protocolDesc = ''
    if (this.siteInfoOverride && this.siteInfoOverride.title) {
      title = this.siteInfoOverride.title
    } else if (this.siteInfo && this.siteInfo.title) {
      title = this.siteInfo.title
    } else if (this.protocolInfo && this.protocolInfo.scheme === 'dat:') {
      title = 'Untitled'
    }
    if (this.protocolInfo) {
      url = this.protocolInfo.url
      hostname = this.protocolInfo.hostname
      if (['https:'].includes(this.protocolInfo.scheme)) {
        icon = 'lock'
        protocolLabel = 'Secure'
        protocolDesc = 'Your connection to this site is private.'
        protocolCls = 'secure'
      } else if (this.protocolInfo.scheme === 'http:') {
        icon = 'info-circled'
        protocolDesc = 'Your connection to this site is not private.'
      } else if (['dat:', 'fs:'].indexOf(this.protocolInfo.scheme) != -1) {
        icon = 'share'
        protocolLabel = 'Secure P2P'
        protocolDesc = yo`<span>
          This site was downloaded from a secure peer-to-peer network.
          <a onclick=${e => this.learnMore()}>Learn More</a>
        </span>`
        protocolCls = 'p2p'
      }
    }

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      // site controls
      let siteCtrlsEl = ''
      if (this.protocolInfo) {
        if (this.protocolInfo.scheme === 'dat:') {
          siteCtrlsEl = yo`<div><hr /><span>
            <a onclick=${e => this.viewSiteFiles('files')}>View site files</a> |
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
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-site-info-dropdown">
        <div class="details">
          <div class="details-title">
            <img src="beaker-favicon:${url}" />
            <strong>${title || hostname || url}</strong>
          </div>
          <div><small>${protocolDesc}</small></div>
          ${siteCtrlsEl}
        </div>
        <div class="perms">${permsEls}</div>
      </div>`
    }

    // render
    var iconEl = (icon) ? yo`<span class="icon icon-${icon}"></span>` : ''
    var titleEl = (protocolLabel) ? yo`<span class="title">${protocolLabel}</span>`: ''
    return yo`<div class="toolbar-site-info ${protocolCls}">
      <button onclick=${e => this.toggleDropdown(e)}>${iconEl} ${titleEl}</button>
      ${dropdownEl}
    </div>`
  }

  updateActives() {
    Array.from(document.querySelectorAll('.toolbar-site-info')).forEach(el => yo.update(el, this.render()))
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