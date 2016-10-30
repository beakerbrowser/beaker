import * as yo from 'yo-yo'

export class SiteInfoNavbarBtn {
  constructor() {
    this.isDropdownOpen = false
    this.protocolInfo = false
  }

  render() {
    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-site-info-dropdown">
        <div class="perms">
          <div><strong>Permissions</strong></div>
          <div><span class="icon icon-mic"></span> Access your camera & microphone <a data-value="media">Blocked</a></div>
          <div><span class="icon icon-location"></span> Access your location <a data-value="geolocation">Blocked</a></div>
          <div><span class="icon icon-comment"></span> Create desktop notifications <a data-value="notifications">Blocked</a></div>
          <div><span class="icon icon-block"></span> Hide the mouse pointer <a data-value="pointerLock">Blocked</a></div>
          <div><span class="icon icon-resize-full"></span> Go full-screen <a data-value="fullscreen">Blocked</a></div>
        </div>
      </div>`
    }

    // title
    var title = ''
    if (this.siteInfoOverride && this.siteInfoOverride.title) {
      title = yo`<span class="title">
        ${this.siteInfoOverride.title}
      </span>`
    } else if (this.siteInfo && this.siteInfo.title) {
      title = yo`<span class="title">
        ${this.siteInfo.title}
      </span>`
    }

    // icon
    var icon = ''
    if (this.protocolInfo) {
      if (['https:', 'beaker:'].includes(this.protocolInfo.scheme)) {
        icon = 'lock'
      } else if (this.protocolInfo.scheme === 'http:') {
        icon = 'info-circled'
      } else if (['dat:', 'ipfs:'].indexOf(this.protocolInfo.scheme) != -1) {
        icon = 'share'
      }
      if (icon) {
        icon = yo`<span class="icon icon-${icon}"></span>`
      }
    }

    // render
    return yo`<div class="toolbar-site-info">
      <button onclick=${this.onClickDropdown.bind(this)}>${icon} ${title}</button>
      ${dropdownEl}
    </div>`
  }

  updateActives() {
    Array.from(document.querySelectorAll('.toolbar-site-info')).forEach(el => yo.update(el, this.render()))
  }

  onClickDropdown(e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }
}