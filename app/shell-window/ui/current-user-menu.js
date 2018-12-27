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

export async function setup () {
  // fetch user information
  await readCurrentUserSession()
  currentUserArchive = new DatArchive(currentUserSession.url)
  currentUserArchive.watch('/dat.json', async () => {
    // reload user info any time dat.json changes
    await readCurrentUserSession()
    update()
  })

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
              <div class="title">
                ${getUserTitle()}
                <a onclick=${onEditProfile}>
                  <i class="fa fa-pencil"></i>
                </a>
              </div>
            </div>
            <div class="menu">
              <div class="menu-item" onclick=${onCopyUrl}>
                <i class="fas fa-clipboard"></i>
                <span class="label">Copy link</span>
              </div>
              <div class="menu-item" onclick=${onViewProfile}>
                <i class="fas fa-external-link-alt"></i>
                <span class="label">View profile</span>
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

function onEditProfile (e) {
  beaker.browser.showEditProfileModal()
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
  if (!currentUserSession) {
    currentUserSession = await beaker.browser.getUserSession()
  } else {
    var dat = new DatArchive(currentUserSession.url)
    var info = JSON.parse(await dat.readFile('/dat.json'))
    currentUserSession.title = info.title
    currentUserSession.description = info.description
  }
}

function getUserTitle () {
  return currentUserSession && currentUserSession.title ? currentUserSession.title : 'Anonymous'
}
