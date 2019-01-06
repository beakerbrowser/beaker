/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import {findParent, writeToClipboard} from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'
import * as toast from '../toast'

// there can be many drop menu btns rendered at once, but they are all showing the same information
// the CurrentUserMenuNavbarBtn manages all instances, and you should only create one

export class CurrentUserMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false
    this.currentUserSession = null
    this.setup()

    // wire up events
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  async setup () {
    this.currentUserSession = await beaker.browser.getUserSession()
    this.updateActives()

    // watch for updates
    var currentUserArchive = new DatArchive(this.currentUserSession.url)
    currentUserArchive.watch('/dat.json', async () => {
      // update user info any time dat.json changes
      var info = JSON.parse(await dat.readFile('/dat.json'))
      this.currentUserSession.title = info.title
      this.currentUserSession.description = info.description
      this.updateActives()
    })
  }

  render () {
    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items submenu with-triangle">
            <div class="dropdown-wrapper">
              <div class="user-profile">
                <div class="title">
                  ${this.userTitle}
                  <a onclick=${e => this.onEditProfile(e)}>
                    <i class="fas fa-pencil-alt"></i>
                  </a>
                </div>
              </div>
              <div class="section">
                <div class="menu-item" onclick=${e => this.onViewProfile(e)}>
                  <i class="fas fa-external-link-alt"></i>
                  <span class="label">View profile</span>
                </div>
                <div class="menu-item" onclick=${e => this.onCopyUrl(e)}>
                  <i class="fas fa-clipboard"></i>
                  <span class="label">Copy link</span>
                </div>
              </div>
            </div>
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu current-user-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <img src="${this.userThumbUrl}">
        </button>
        ${dropdownEl}
      </div>`
  }

  get userTitle () {
    return this.currentUserSession && this.currentUserSession.title ? this.currentUserSession.title : 'Anonymous'
  }

  get userThumbUrl () {
    if (this.currentUserSession) {
      return `${this.currentUserSession.url}/thumb.jpg`
    }
    return ''
  }

  updateActives () {
    Array.from(document.querySelectorAll('.current-user-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  close () {
    this.isDropdownOpen = false
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'current-user-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onViewProfile (e) {
    pages.setActive(pages.create(this.currentUserSession.url))
    this.close()
  }

  onEditProfile (e) {
    beaker.browser.showEditProfileModal()
    this.close()
  }

  onCopyUrl (e) {
    writeToClipboard(this.currentUserSession.url)
    toast.create('URL copied to your clipboard')
    this.close()
  }
}
