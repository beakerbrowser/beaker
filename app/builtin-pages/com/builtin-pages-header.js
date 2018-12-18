/* globals beaker DatArchive */

import yo from 'yo-yo'
import toggleable, {closeAllToggleables} from './toggleable'
import * as toast from './toast'
import {writeToClipboard} from '../../lib/fg/event-handlers'

// exported api
// =

export default function render (currentPage, currentUserSession) {
  const navItem = (url, icon, label) => yo`<a href="${url}" class="${label === currentPage ? 'active': ''}"><span class="fa ${icon}"></span> ${label}</a>`
  return yo`
    <div class="builtin-header fixed">
      <div class="nav">
        ${navItem('beaker://start', 'fa-home', 'Home')}
        ${navItem('beaker://bookmarks', 'fa-star-o', 'Bookmarks')}
        ${navItem('beaker://feed', 'fa-list-ul', 'Feed')}
        ${navItem('beaker://search', 'fa-search', 'Search')}
      </div>
      <div class="flex-spacer"></div>
      <div class="nav">
        ${renderNewButton()}
        ${navItem('beaker://library', 'fa-hdd-o', 'Library')}
        ${renderDropdownNav(currentUserSession)}
      </div>
      ${''/* TODO <div class="notifications" data-count="0">
        <span class="fa fa-bell-o"></span>
      </div>*/}
    </div>`
}

// internal methods
// =

function renderHelpButton () {
  return yo`
    <button class="btn plain help" onclick=${onClickHelpButton}>
      <i class="fa fa-question-circle-o"></i>
    </button>`
}

function renderDropdownNav (currentUserSession) {
  if (!currentUserSession) return ''
  return toggleable(yo`
    <div
      class="dropdown toggleable-container builtin-pages-nav"
      data-toggle-id="builtin-pages-nav-menu"
    >
      <a class="toggleable">
        <img src="${currentUserSession.url}/thumb.jpg">
        <i class="fa fa-caret-down"></i>
      </a>

      <div class="dropdown-items dropdown-items-split subtle-shadow right">
        <div class="dropdown-items-left">
          <a href=${currentUserSession.url}><img src="${currentUserSession.url}/thumb.jpg"></a>
          <div class="title">${currentUserSession.title}</div>
          <div class="links">
            [ <a class="link" href=${currentUserSession.url}>View site</a> | <a class="link" onclick=${() => onCopyLink(currentUserSession.url)}>Copy link</a> ]
          </div>
        </div>
        <div class="dropdown-items-right">
          <a href="beaker://history" class="dropdown-item">
            <i class="fa fa-history"></i>
            <span>History</span>
          </a>

          <a href="beaker://downloads" class="dropdown-item">
            <i class="fa fa-download"></i>
            <span>Downloads</span>
          </a>

          <a href="beaker://watchlist" class="dropdown-item">
            <i class="fa fa-eye"></i>
            <span>Watchlist</span>
          </a>

          <a href="beaker://settings" class="dropdown-item">
            <i class="fa fa-gear"></i>
            <span>Settings</span>
          </a>

          <a class="dropdown-item" onclick=${onClickTourButton}>
            <i class="fa fa-life-ring"></i>
            <span>Tour</span>
          </a>
        </div>
      </div>
    </div>
  `)
}

function renderNewButton () {
  return toggleable(yo`
    <div class="dropdown toggleable-container create-new-dropdown">
      <a class="toggleable">
        <span>+ New</span>
      </a>
      <div class="dropdown-items create-new filters subtle-shadow right">
        <div class="dropdown-item" onclick=${() => onCreateSite()}>
          <div class="label">
            <i class="fa fa-clone"></i>
            Empty project
          </div>
          <p class="description">
            Create a new project
          </p>
        </div>
        <div class="dropdown-item" onclick=${() => onCreateSite('website')}>
          <div class="label">
            <i class="fa fa-code"></i>
            Website
          </div>
          <p class="description">
            Create a new website from a basic template
          </p>
        </div>
        <div class="dropdown-item" onclick=${onCreateSiteFromFolder}>
          <div class="label">
            <i class="fa fa-folder-o"></i>
            From folder
          </div>
          <p class="description">
            Create a new project from a folder on your computer
          </p>
        </div>
      </div>
    </div>
  `)
}

async function onClickTourButton () {
  closeAllToggleables()
  beakerStartTutorial()
}

function onCopyLink (url) {
  writeToClipboard(url)
  toast.create('Link copied to clipboard')
}

async function onCreateSiteFromFolder () {
  // ask user for folder
  const folder = await beaker.browser.showOpenDialog({
    title: 'Select folder',
    buttonLabel: 'Use folder',
    properties: ['openDirectory']
  })
  if (!folder || !folder.length) return

  // create a new archive
  const archive = await DatArchive.create({prompt: false})
  await beaker.archives.setLocalSyncPath(archive.url, folder[0], {previewMode: true})
  window.location = 'beaker://library/' + archive.url + '#setup'
}

async function onCreateSite (template) {
  // create a new archive
  const archive = await DatArchive.create({template, prompt: false})
  window.location = 'beaker://library/' + archive.url + '#setup'
}
