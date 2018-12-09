/* globals beaker DatArchive */

import * as yo from 'yo-yo'
import { findParent, writeToClipboard } from '../../lib/fg/event-handlers'
import * as pages from '../pages'
import * as toast from './toast'

// globals
// =

var isDropdownOpen = false
var currentUserSession
var currentUserArchive

// exported api
// =

/*- get current user session
  - if none, get default user
  - if exists, set user session to default user
- load session's user info
- display user info
  - no user:
    - Anonymous (name, pic)
    - Controls offer to create user
    - Create user flow ...
    - newUser(name, bio, thumb)
    - setUserSession()
    - refresh visual
  - yes user:
    - Name, thumb
    - Controls offer to edit user info
- on user change:
  - get current user session
  - display user info
- future
  - controls to list other users
  - controls to new user
  - controls to delete user
  - controls to switch user*/
export async function setup () {
  // fetch user information
  await readCurrentUserSession()
  console.log({currentUserSession})
  currentUserArchive = new DatArchive(currentUserSession.url)
  currentUserArchive.watch('/dat.json', readCurrentUserSession) // reload user info any time dat.json changes

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
    let dropdownInnerEl
    dropdownEl = yo`
      <div class="dropdown">
        <div class="dropdown-items with-triangle">
          <div class="dropdown-wrapper">
            <div class="user-profile">
              <div class="title">${getUserTitle()}</div>
              <div class="description">${getUserDescription()}</div>
            </div>
            <div class="menu">
              <div class="menu-item" onclick=${onViewProfile}>
                <i class="fa fa-external-link"></i>
                <span class="label">View Your Website</span>
              </div>
              <div class="menu-item" onclick=${onCopyUrl}>
                <i class="fa fa-clipboard"></i>
                <span class="label">Copy Link</span>
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
        ${getUserTitle()}
      </button>
      ${dropdownEl}
    </div>`
}

function closeDropdown () {
  if (isDropdownOpen) {
    isDropdownOpen = false
    update()
  }
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
  closeDropdown()
}

function onViewProfile (e) {
  pages.setActive(pages.create(currentUserSession.url))
  closeDropdown()
}

function onCopyUrl (e) {
  writeToClipboard(currentUserSession.url)
  toast.create('URL copied to your clipboard')
  closeDropdown()
}

// user data
// =

async function readCurrentUserSession () {
  currentUserSession = await beaker.browser.getUserSession()
}

function getUserTitle () {
  return currentUserSession && currentUserSession.title ? currentUserSession.title : 'Anonymous'
}

function getUserDescription () {
  return currentUserSession && currentUserSession.description ? currentUserSession.description : ''
}
