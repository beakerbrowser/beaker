/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import { findParent } from '../../../lib/fg/event-handlers'
import { SITE_TEMPLATES, createSiteFromTemplate } from '../../../lib/templates'
import * as pages from '../../pages'

// there can be many drop menu btns rendered at once, but they are all showing the same information
// the CreateMenuNavbarBtn manages all instances, and you should only create one

export class CreateMenuNavbarBtn {
  constructor () {
    this.isDropdownOpen = false

    // wire up events
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items submenu with-triangle">
            <div class="header">
              <h2>Create New</h2>
            </div>

            <div class="section">
              ${SITE_TEMPLATES.filter(t => !t.disabled).map(t => yo`
                <div class="menu-item" onclick=${e => this.onCreateSite(e, t.id)}>
                  <img src="beaker://assets/img/templates/${t.id}.png" />
                  <span class="label">${t.title}</span>
                </div>
              `)}
            </div>
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu create-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Menu">
          <span class="fa fa-plus"></span>
        </button>
        ${dropdownEl}
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.create-dropdown-menu')).forEach(el => yo.update(el, this.render()))
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
    var parent = findParent(e.target, 'create-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  async onCreateSite (e, template) {
    // close dropdown
    this.isDropdownOpen = false
    this.updateActives()

    // create site
    var url = await createSiteFromTemplate(template)
    pages.setActive(pages.create(url))
  }
}
