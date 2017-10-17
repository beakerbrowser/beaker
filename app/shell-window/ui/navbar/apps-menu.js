/* globals beaker DatArchive */

import os from 'os'
import * as yo from 'yo-yo'
import {ipcRenderer} from 'electron'
import { findParent } from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class AppsMenuNavbarBtn {
  constructor () {
    this.apps = []
    this.isDropdownOpen = false

    beaker.apps.list(0).then(apps => {
      this.apps = apps
      console.log(this.apps)
      this.updateActives()
    })

    // wire up events
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
  }

  render () {
    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items with-triangle">
            apps!
          </div>
        </div>`
    }

    // render btn
    return yo`
      <div class="toolbar-dropdown-menu apps-dropdown-menu">
        <button class="toolbar-btn toolbar-dropdown-menu-btn ${this.isDropdownOpen ? 'pressed' : ''}" onclick=${e => this.onClickBtn(e)} title="Apps launcher">
          <span class="fa fa-rocket"></span>
        </button>
        ${dropdownEl}
      </div>`
  }

  updateActives () {
    Array.from(document.querySelectorAll('.apps-dropdown-menu')).forEach(el => yo.update(el, this.render()))
  }

  close () {
    if (this.isDropdownOpen) {
      this.isDropdownOpen = false
    }
    this.updateActives()
  }

  onClickBtn (e) {
    this.isDropdownOpen = !this.isDropdownOpen
    this.updateActives()
  }

  onClickAnywhere (e) {
    var parent = findParent(e.target, 'apps-dropdown-menu')
    if (parent) return // abort - this was a click on us!
    this.close()
  }

  onOpenPage (e, url) {
    pages.setActive(pages.create(url))
    this.isDropdownOpen = false
    this.updateActives()
  }
}
