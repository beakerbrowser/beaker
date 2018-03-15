/* globals beaker DatArchive */

import os from 'os'
import * as yo from 'yo-yo'
import {ipcRenderer} from 'electron'
import { findParent } from '../../../lib/fg/event-handlers'
import * as pages from '../../pages'

export class AppsMenuNavbarBtn {
  constructor () {
    this.apps = []
    this.currentView = 'grid'
    this.isDropdownOpen = false

    beaker.browser.getSetting('apps_launcher_view').then(view => {
      this.currentView = view || this.currentView
      this.updateActives()
    })

    beaker.apps.list(0).then(apps => {
      this.apps = apps
      this.updateActives()
    })

    // wire up events
    window.addEventListener('mousedown', this.onClickAnywhere.bind(this), true)
    var appsEvents = beaker.apps.createEventsStream()
    appsEvents.addEventListener('apps-binding-changed', this.onAppBindingChanged.bind(this))
  }

  render () {
    // render the dropdown if open
    var dropdownEl = ''
    if (this.isDropdownOpen) {
      dropdownEl = yo`
        <div class="toolbar-dropdown dropdown toolbar-dropdown-menu-dropdown">
          <div class="dropdown-items with-triangle">
            ${!this.apps.length ? yo`<em>No apps installed</em>` : ''}

            ${this.currentView === 'grid' && this.apps.length ? yo`
              <div class="apps-grid">
                ${this.apps.map(app => yo`
                  <div class="app-container" title="app://${app.name}" onclick=${e => this.onOpenPage(e, `app://${app.name}`)}>
                    <img class="favicon" src="beaker-favicon:${app.url}"/>
                  </div>
                `)}
              </div>
            ` : ''}

            ${this.currentView === 'list' && this.apps.length ? yo`
              <ul class="apps-list">
                ${this.apps.map(app => yo`
                  <li onclick=${e => this.onOpenPage(e, `app://${app.name}`)} class="app-container">
                    <img class="favicon" src="beaker-favicon:${app.url}"/>
                    <span class="title">app://${app.name}</span>
                  </li>
                `)}
              </ul>
            ` : ''}

            <div class="view-settings">
              <i title="List view" data-view="list" class="fa fa-list ${this.currentView === 'list' ? 'selected' : ''}" onclick=${e => this.onChangeView(e)}></i>
              <i title="Grid view"data-view="grid" class="fa fa-th ${this.currentView === 'grid' ? 'selected' : ''}" onclick=${e => this.onChangeView(e)}></i>
            </div>
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

  onChangeView (e) {
    const view = e.target.dataset.view
    beaker.browser.setSetting('apps_launcher_view', view)
    this.currentView = view
    this.updateActives()
  }

  onAppBindingChanged () {
    console.log('apps binding changed')

    beaker.apps.list(0).then(apps => {
      this.apps = apps
      this.updateActives()
    })
  }
}
