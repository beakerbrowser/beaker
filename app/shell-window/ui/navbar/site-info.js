import * as yo from 'yo-yo'
import * as pages from '../../pages'
import { findParent } from '../../../lib/fg/event-handlers'

export class SiteInfoNavbarBtn {
  constructor() {
    this.isDropdownOpen = false
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

      // dropdown
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-site-info-dropdown">
        <div class="details">
          <div class="details-title">
            <img src="beaker-favicon:${url}" />
            <strong>${title || hostname || url}</strong>
          </div>
          ${siteCtrlsEl}
        </div>
        ${''/* TODO <div class="perms">
          <div><label class="checked"><input type="checkbox" value="js" checked /> <span class="icon icon-code"></span> Run Javascript</label></div>
          <div><label><input type="checkbox" value="media" /> <span class="icon icon-mic"></span> Access your camera & microphone</label></div>
          <div><label><input type="checkbox" value="notifications" /> <span class="icon icon-comment"></span> Create desktop notifications</label></div>
        </div>*/}
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