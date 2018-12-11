/* globals beaker DatArchive */

import yo from 'yo-yo'
import * as onboardingPopup from '../com/onboarding-popup'
import toggleable from '../com/toggleable'

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
        ${navItem('beaker://library', 'fa-hdd-o', 'Library')}
      </div>
      ${renderHelpButton()}
      ${''/* TODO <div class="notifications" data-count="0">
        <span class="fa fa-bell-o"></span>
      </div>*/}
      ${currentUserSession ? yo`
        <div class="profile">
          <a href="${currentUserSession.url}"><img src="${currentUserSession.url}/thumb.jpg"></a>
        </div>`
        : ''}
      ${renderNewButton()}
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

function renderNewButton () {
  return toggleable(yo`
    <div class="dropdown toggleable-container create-new-dropdown">
      <button class="btn primary toggleable">
        <span>New</span>
        <i class="fa fa-plus"></i>
      </button>
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

async function onClickHelpButton () {
  await onboardingPopup.create({showHelpOnly: true})
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

