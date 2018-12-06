/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import { findParent } from '../../lib/fg/event-handlers'
import * as pages from '../pages'

// globals
// =

var isDropdownOpen = false

// exported methods
// ==

export async function setup () {
  // fetch user information
  // TODO

  // render
  document.getElementById('toolbar-tabs').appendChild(yo`<div class="current-user-dropdown-menu"></div>`)
  update()

  // wire up listeners
  window.addEventListener('mousedown', onClickAnywhere, true)
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.current-user-dropdown-menu'), render())
}

function render () {
  // render the dropdown if open
  var dropdownEl = ''
  if (isDropdownOpen) {
    dropdownEl = yo`
      <div class="dropdown">
        <div class="dropdown-items with-triangle">
          <div class="dropdown-wrapper">
            <div class="section">
              <div class="menu-item" onclick=${/* TODO */undefined}>
                <i class="fa fa-window-maximize"></i>
                <span class="label">New Window</span>
              </div>
              <div class="menu-item" onclick=${/* TODO */undefined}>
                <i class="fa fa-file-o"></i>
                <span class="label">New Tab</span>
              </div>
            </div>
          </div>
        </div>
      </div>`
  }

  // render btn
  return yo`
    <div class="current-user-dropdown-menu">
      <button class="current-user-dropdown-menu-btn ${isDropdownOpen ? 'pressed' : ''}" onclick=${onClickBtn}>
        <span class="fa fa-user"></span>
        Anonymous
      </button>
      ${dropdownEl}
    </div>`
}

// ui events
// =

function onClickBtn (e) {
  isDropdownOpen = !isDropdownOpen
  update()
}

function onClickAnywhere (e) {
  var parent = findParent(e.target, 'current-user-dropdown-menu')
  if (parent) return // abort - this was a click on us!
  if (isDropdownOpen) {
    isDropdownOpen = false
    update()
  }
}

