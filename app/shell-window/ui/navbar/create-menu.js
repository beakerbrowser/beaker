/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import { findParent } from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

const SITE_TEMPLATES = [
  {id: 'web-page', title: 'Web page'},
  {id: 'file-share', title: 'File share'},
  {id: 'image-collection', title: 'Image collection'},
  {id: 'music-album', title: 'Album', disabled: true},
  {id: 'video', title: 'Video', disabled: true},
  {id: 'podcast', title: 'Podcast', disabled: true},
  {id: 'module', title: 'Code Module', disabled: true},
  {id: 'blank', title: 'Empty project'}
]

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
    template = template === 'blank' ? false : template
    var archive = await DatArchive.create({template, prompt: false})
    
    if (!template) {
      // for the blank template, go to the source view
      // TODO should go to the editor
      pages.setActive(pages.create(`beaker://library/${archive.url}#setup`))
    } else {
      // go to the site
      pages.setActive(pages.create(archive.url))
    }
  }
}
