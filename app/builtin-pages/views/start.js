/* globals beaker beakerBrowser beakerSitedata DatArchive Image */

import * as yo from 'yo-yo'
import {ArchivesList} from 'builtin-pages-lib'
import ColorThief from '../../lib/fg/color-thief'
import {findParent} from '../../lib/fg/event-handlers'
import {pluralize} from '../../lib/strings'

const colorThief = new ColorThief()

const LATEST_VERSION = 7003 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const WELCOME_URL = 'https://beakerbrowser.com/docs/using-beaker/'
const RELEASE_NOTES_URL = 'https://beakerbrowser.com/releases/0-7-3/?updated=true'

// globals
// =

var isManagingBookmarks = false
var isShelfOpen = false
var userProfile
var archivesStatus
var bookmarks, pinnedBookmarks
var archivesList
var settings

setup()
async function setup () {
  await loadBookmarks()
  archivesStatus = await beaker.archives.status()
  userProfile = await beaker.profiles.get(0)
  try {
    userProfile.title = (await beaker.archives.get(userProfile.url, {timeout: 500})).title
  } catch (e) {
    userProfile.title = 'Your profile'
  }
  settings = await beakerBrowser.getSettings()
  update()

  // open update info if appropriate
  if (!settings.noWelcomeTab) {
    let latestVersion = await beakerSitedata.get('beaker://start', 'latest-version')
    if (+latestVersion < LATEST_VERSION) {
      await beakerSitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
      if (!latestVersion) {
        window.open('beaker://start')
        window.location = WELCOME_URL
      } else {
        window.open('beaker://start')
        window.location = RELEASE_NOTES_URL
      }
      return
    }
  }

  // subscribe to network changes
  beaker.archives.addEventListener('network-changed', ({details}) => {
    archivesStatus.peers = details.totalPeerCount
    yo.update(document.querySelector('a.network'), renderNetworkLink())
  })

  // load archives list after render (its not pressing)
  archivesList = new ArchivesList({listenNetwork: true})
  await archivesList.setup({isSaved: true})
  archivesList.archives.sort((a, b) => {
    if (a.url === userProfile.url) return -1
    if (b.url === userProfile.url) return 1
    return niceName(a).localeCompare(niceName(b))
  })
}

// rendering
// =

function update () {
  var theme = settings.start_page_background_image

  yo.update(document.querySelector('main'), yo`
    <main class="${theme}">
      <header>
        <div class="actions">
          <a onclick=${createSite}><i class="fa fa-pencil"></i> New site</a>
        </div>
        <div style="flex: 1"></div>
        ${renderProfileCard()}
      </header>
      ${renderShelf()}
      ${renderPinnedBookmarks()}
    </main>
  `)
}

function renderProfileCard () {
  return yo`
    <div class="profile">
      ${renderNetworkLink()}
      ${''/* DISABLED <a href=${userProfile.url}>${userProfile.title} <i class="fa fa-user-circle-o"></i></a> */}
    </div>
  `
}

function renderNetworkLink () {
  return yo`
    <a class="network" href="beaker://library">
      <i class="fa fa-share-alt"></i> ${archivesStatus.peers} ${pluralize(archivesStatus.peers, 'peer')}
    </a>
  `
}

function renderShelf () {
  if (!isShelfOpen) {
    return yo`
      <div class="shelf closed" onclick=${toggleShelf}>
        <i class="fa fa-angle-left"></i>
      </div>
    `
  }

  return yo`
    <div class="shelf open" onmouseout=${onMouseOutShelf}>
      <div class="section-header">
        <h3><a href="beaker://library">Your library</a></h3>
      </div>
      <div class="archives-list">
        ${archivesList.archives.length
    ? archivesList.archives.map(archiveInfo => {
      return yo`
              <a class="archive list-item" href=${`beaker://library/${archiveInfo.key}`}>
                <span class="title">${niceName(archiveInfo)}</span>
                <span class="peers">${archiveInfo.peers} ${pluralize(archiveInfo.peers, 'peer')}</span>
              </a>`
    })
    : yo`<p class="no-archives">No archives in your library</p>`}
      </div>

      <hr />

      <div class="section-header">
        <h3><a href="beaker://bookmarks">Your bookmarks</a></h3>
      </div>

      <div class="bookmarks-list">
        ${bookmarks.length
    ? bookmarks.map(row => {
      return yo`
              <a href=${row.url} class="bookmark list-item">
                <img class="favicon" src=${'beaker-favicon:' + row.url} />
                <span href=${row.url} class="bookmark-link" title=${row.title} />
                  <span class="title">${row.title}</span>
                </span>
              </a>`
    })
    : yo`<p class="no-bookmarks">No bookmarks</p>`}
      </div>
    </div>
  `
}

function renderPinnedBookmarks () {
  var icon = isManagingBookmarks ? 'caret-down' : 'wrench'

  return yo`
    <div class="bookmarks-container">
      <p>
        <a class="add-pin-toggle" onclick=${toggleAddPin}>
          <i class="fa fa-${icon}"></i>
          ${isManagingBookmarks ? 'Close' : 'Manage bookmarks'}
        </a>
      </p>
      <div class="pinned-bookmarks">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
      </div>
      ${renderBookmarks()}
    </div>
  `
}

function renderBookmarks () {
  if (!isManagingBookmarks) {
    return ''
  }

  const isNotPinned = row => !row.pinned

  const renderRow = row =>
    yo`
      <li class="bookmark ll-row">
        <a class="btn pin" onclick=${e => pinBookmark(e, row)}>
          <i class="fa fa-thumb-tack"></i> Pin
        </a>
        <a href=${row.url} class="link" title=${row.title} />
          <img class="favicon" src=${'beaker-favicon:' + row.url} />
          <span class="title">${row.title}</span>
          <span class="url">${row.url}</span>
        </a>
      </li>`

  const unpinnedBookmarks = bookmarks.filter(isNotPinned)
  return yo`
    <div class="bookmarks">
      ${unpinnedBookmarks.length ? unpinnedBookmarks.map(renderRow) : 'All bookmarks are pinned'}
    </div>
  `
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark
  var [r, g, b] = bookmark.dominantColor || [255, 255, 255]
  return yo`
    <a class="pinned-bookmark ${isManagingBookmarks ? 'nolink' : ''}" href=${isManagingBookmarks ? '' : url}>
      <div class="favicon-container" style="background: rgb(${r}, ${g}, ${b})">
        ${isManagingBookmarks ? yo`<a class="unpin" onclick=${e => unpinBookmark(e, bookmark)}><i class="fa fa-times"></i></a>` : ''}
        <img src=${'beaker-favicon:' + url} class="favicon"/>
      </div>
      <div class="title">${title}</div>
    </a>
  `
}

// event handlers
// =

function toggleShelf () {
  isShelfOpen = !isShelfOpen
  update()
}

async function createSite () {
  var archive = await DatArchive.create()
  window.location = 'beaker://library/' + archive.url.slice('dat://'.length)
}

function onMouseOutShelf (e) {
  if (!findParent(e.relatedTarget, 'shelf')) {
    isShelfOpen = false
    update()
  }
}

function toggleAddPin (url, title) {
  isManagingBookmarks = !isManagingBookmarks
  update()
}

async function pinBookmark (e, {url}) {
  e.preventDefault()
  e.stopPropagation()

  await beaker.bookmarks.togglePinned(url, true)
  await loadBookmarks()
  update()
}

async function unpinBookmark (e, {url}) {
  e.preventDefault()
  e.stopPropagation()

  await beaker.bookmarks.togglePinned(url, false)
  await loadBookmarks()
  update()
}

// helpers
// =

async function loadBookmarks () {
  bookmarks = (await beaker.bookmarks.list()) || []
  pinnedBookmarks = (await beaker.bookmarks.list({pinned: true})) || []

  // load dominant colors of each pinned bookmark
  await Promise.all(pinnedBookmarks.map(attachDominantColor))
}

function attachDominantColor (bookmark) {
  return new Promise(resolve => {
    var img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = e => {
      var c = colorThief.getColor(img, 10)
      c[0] = (c[0] / 4) | 0 + 192
      c[1] = (c[1] / 4) | 0 + 192
      c[2] = (c[2] / 4) | 0 + 192
      bookmark.dominantColor = c
      resolve()
    }
    img.onerror = resolve
    img.src = 'beaker-favicon:' + bookmark.url
  })
}

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}
