import * as yo from 'yo-yo'

export class SitePermsNavbarBtn {
  constructor() {
    this.isDropdownOpen = false
    this.protocolDescription = false
  }

  render() {
    if (!this.protocolDescription)
      return

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-site-perms-dropdown">
        <div class="perms">
          <div><strong>Site Permissions</strong></div>
          <div><span class="icon icon-mic"></span> Access your camera & microphone <a href="#" data-value="media">Blocked</a></div>
          <div><span class="icon icon-location"></span> Access your location <a href="#" data-value="geolocation">Blocked</a></div>
          <div><span class="icon icon-comment"></span> Create desktop notifications <a href="#" data-value="notifications">Blocked</a></div>
          <div><span class="icon icon-block"></span> Hide the mouse pointer <a href="#" data-value="pointerLock">Blocked</a></div>
          <div><span class="icon icon-resize-full"></span> Go full-screen <a href="#" data-value="fullscreen">Blocked</a></div>
        </div>
      </div>`
    }

    // render btn
    var icon = 'window'
    var label = ''
    if (this.protocolDescription.label == 'HTTPS')
      icon = 'lock'
    if (['dat', 'view-dat', 'ipfs'].indexOf(this.protocolDescription.scheme) != -1) {
      icon = 'share'
    }
    return yo`<div class="toolbar-site-perms">
      <button class="green">
        <span class="icon icon-${icon}"></span> <small>${label}</small>
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives() {
    Array.from(document.querySelectorAll('.toolbar-site-perms')).forEach(el => yo.update(el, this.render()))
  }

  onClickUpdates(e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }
}