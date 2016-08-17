import * as yo from 'yo-yo'

export class UpdatesNavbarBtn {
  constructor() {
    this.isUpdateAvailable = false
    this.isDropdownOpen = false
  }

  render() {
    // render nothing if no update is availabe
    if (!this.isUpdateAvailable)
      return ''

    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`<div class="toolbar-dropdown toolbar-updates-dropdown">
        <div class="toolbar-updates-dropdown-inner">
          A new version of beaker is ready to install. <a href="#">Restart now.</a>
        </div>
      </div>`
    }

    // render btn
    return yo`<div class="toolbar-updates">
      <button class="toolbar-btn toolbar-updates-btn ${this.isDropdownOpen?'pressed':''}" onclick=${e => this.onClickUpdates(e)} title="Update available">
        <span class="icon icon-record"></span>
      </button>
      ${dropdownEl}
    </div>`
  }

  updateActives() {
    Array.from(document.querySelectorAll('.toolbar-updates')).forEach(el => yo.update(el, this.render()))
  }

  onClickUpdates(e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }
}