import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'
import PERMS from '../../../lib/perms'

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
      if (['https:', 'beaker:'].includes(this.protocolInfo.scheme)) {
        icon = 'lock'
      } else if (this.protocolInfo.scheme === 'http:') {
        icon = 'info-circled'
      } else if (['dat:', 'ipfs:'].indexOf(this.protocolInfo.scheme) != -1) {
        icon = 'share'
      }
    }

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      // site controls
      let siteCtrlsEl = ''
      if (this.protocolInfo) {
        if (this.protocolInfo.scheme === 'dat:') {
          siteCtrlsEl = yo`<div><small>
            <a onclick=${e => this.viewSiteFiles()}>View Site Files</a>
          </small></div>`
        }
      }

      // site permissions
      var permsEls = []
      if (this.sitePerms) {
        for (var k in this.sitePerms) {
          permsEls.push(this.renderPerm(k, this.sitePerms[k]))
        }
      }

      // dropdown
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-site-info-dropdown">
        <div class="details">
          <div class="details-title">
            <img src="beaker-favicon:${url}" />
            <strong>${title || hostname || url}</strong>
          </div>
          ${siteCtrlsEl}
        </div>
        <div class="perms">${permsEls}</div>
      </div>`
    }

    // render
    var iconEl = (icon) ? yo`<span class="icon icon-${icon}"></span>` : ''
    var titleEl = (title) ? yo`<span class="title">${shorten(title)}</span>`: ''
    return yo`<div class="toolbar-site-info">
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

  renderPerm (id, value) {
    const checked = !!value
    const icon = PERMS[id] ? PERMS[id].icon : ''
    const desc = PERMS[id] ? PERMS[id].desc : ''
    return yo`<div>
      <label class=${value ? 'checked' : ''} onclick=${e=>this.togglePerm(id)}><input type="checkbox" value="${id}" ${value ? 'checked' : ''} /> <span class="icon icon-${icon}"></span> ${desc}</label>
    </div>`
  }

  togglePerm (id) {
    // update perm
    var newValue = (this.sitePerms[id] === 1) ? 0 : 1
    beakerSitedata.setPermission(this.protocolInfo.url, id, newValue).then(() => {
      this.sitePerms[id] = newValue

      // rerender
      this.updateActives()
    })
  }

  viewSiteFiles() {
    const { hostname } = this.protocolInfo
    pages.setActive(pages.create('beaker:archive/' + hostname))
    this.closeDropdown()
  }
}


function shorten (str) {
  if (str.length > 40) return (str.slice(0, 37) + '...')
  return str
}