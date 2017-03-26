/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import {niceDate} from '../../lib/time'

window.DatProfileSite = require('dat-profile-site')

const LATEST_VERSION = 6001 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001

// globals
// =

var builtinPages = [
  { href: 'beaker://history', label: 'History', icon: 'history', color: 'teal' },
  { href: 'beaker://bookmarks', label: 'Bookmarks', icon: 'star', color: 'yellow' },
  { href: 'beaker://settings', label: 'Settings', icon: 'gear', color: 'pink'},
  { href: 'beaker://editor', label: 'Editor', icon: 'pencil', color: 'blue' },
  { href: 'beaker://downloads', label: 'Downloads', icon: 'download', color: 'purple' },
  { href: 'https://beakerbrowser.com/docs', label: 'Help', icon: 'question', color: 'orange' }
]

var showReleaseNotes = false
var isAddingPin = false
var bookmarks, pinnedBookmarks, archivesList

co(function* () {
  bookmarks = (yield beaker.bookmarks.list()) || []
  pinnedBookmarks = (yield beaker.bookmarks.list({pinned: true})) || []
  archivesList = (yield beaker.archives.list({isSaved: true})) || []
  update()

  let latestVersion = yield beakerSitedata.get('beaker://start', 'latest-version')
  if (+latestVersion < LATEST_VERSION) {
    showReleaseNotes = true
    update()
    beakerSitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
  }
})

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
      ${renderHeader()}
      ${renderPinnedBookmarks()}
      ${renderReleaseNotes()}
    </main>
  `)
}

function renderHeader () {
  return yo`
    <header>
      ${renderPinned()}
    </header>
  `
}

function renderArchivesList () {
  return yo`
    <div class="sidebar-component">
      <div class="title">
        <h2>Your archives</h2>
        <a class="action">
          Create a new site
          <i class="fa fa-plus"></i>
        </a>
      </div>
      <ul class="links-list">
        ${archivesList.map(renderArchive)}
      </ul>
      ${renderEditorPrompt()}
    </div>
  `
}

function renderArchive (archive) {
  console.log(archive)
  var {url, title, key} = archive

  return yo`
    <li class="ll-row">
      <a class="link" href=${url} title=${title}>
        <i class="favicon fa fa-folder-o"></i>
        <span class="title">${title}</span>
        <span class="url">${url}</span>
      </a>
      <div class="actions">
        <a href="beaker://editor/${key}">
          <i class="fa fa-pencil"></i>
        </a>
      </div>
    </li>
  `
}

function renderPinBookmarkForm () {
  if (isAddingPin) {
    return renderBookmarks()
  }
}

function renderPinnedBookmarks () {
  var icon = isAddingPin ? 'close' : 'plus'

  return yo`
    <div class="pinned-bookmarks">
      <div class="title">
        <h2>Pinned bookmarks</h2>
        <a class="action add-pin-link" onclick=${toggleAddPin}>
          ${ isAddingPin ? 'Close bookmarks' : 'Pin a bookmark' }
          <i class="fa fa-${icon}"></i>
        </a>
      </div>

      <ul class="links-list">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
        ${renderPinBookmarkForm()}
      </ul>
    </div>
  `
}

function renderReleaseNotes () {
  if (!showReleaseNotes) {
    return ''
  }
  return yo`
    <div class="alert alert__info alert__release-notes">
      <strong>Welcome to Beaker 0.6.1!</strong>
      New start page, Dat-DNS, and an improved bkr command-line.
      <a href="https://github.com/beakerbrowser/beaker/releases/tag/0.6.1">Learn more</a>
    </div>
  `
}

function renderPinned () {
  const pinCls = isAddingPin ? ' adding' : ''

  return yo`
    <div class="builtin-pages">
      ${builtinPages.map(renderBuiltinPage)}
    </div>
  `
}

function renderBookmarks () {
  if (!isAddingPin) {
    return ''
  }

  const renderRow = (row, i) =>
    yo`
      <li class="ll-row" data-row=${i} onclick=${pinBookmark(i)}>
        <a class="link bookmark__link" href=${row.url} title=${row.title} />
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="title bookmark__title">${row.title}</span>
        </a>
      </li>`

  return yo`
    <div class="bookmarks">
      <form id="add-pinned-site" onsubmit=${pinSite}>
        <legend>Add a new site or select a bookmark</legend>
        <input name="url" type="text" placeholder="https://example.com" required autofocus="autofocus" />
        <input type="submit" value="Add" class="btn primary">
      </form>
      ${bookmarks.map(renderRow)}
    </div>
  `
}

function renderBuiltinPage (item) {
  // render items
  var { href, label, icon, color } = item

  return yo`
    <a class="pinned-item ${color} builtin" href=${href}>
      <i class="fa fa-${icon}" aria-hidden="true"></i>
      <div class="label">${label}
    </a>`
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark

  return yo`
    <li class="ll-row ll-link pinned-bookmark" href=${url}>
      <a class="link" href=${url} title=${title}>
        <img class="favicon" src=${'beaker-favicon:' + url} />
        <span class="title">${title}</span>
        <span class="url">${url}</span>
      </a>
      <div class="actions">
        <i class="fa fa-close" data-url=${url} onclick=${unpinSite}></i>
      </div>
    </li>
  `
}

function toggleAddPin (url, title) {
  isAddingPin = !isAddingPin
  update()
}

function pinBookmark (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    var b = bookmarks[i]
    beaker.bookmarks.add(b.url, b.title, 1).then(() => {
      return beaker.bookmarks.list({pinned: true})
    }).then(pinned => {
      pinnedBookmarks = pinned
      isAddingPin = false
      update()
    })
  }
}

function pinSite (e) {
  e.preventDefault()

  var form = document.getElementById('add-pinned-site')
  var { url } = form.elements

  if (!url) return

  // attempt to make a nice title
  // TODO: temporary solution, this will clutter the bookmarks database
  // with duplicates -tbv
  var title = url.value
  try {
    title = title.split('://')[1] || url.value
  } catch (e) {}

  // add https:// to sites entered without a protocol
  url = url.value
  if (!(url.startsWith('http') || url.startsWith('dat://'))) {
    url = 'https://' + url
  }

  beaker.bookmarks.add(url, title, 1).then(() => {
    beaker.bookmarks.list({pinned: true}).then(pinned => {
      pinnedBookmarks = pinned
      toggleAddPin()
      update()
    })
  })
}

function unpinSite (e) {
  e.preventDefault()
  beaker.bookmarks.togglePinned(e.target.dataset.url, true)

  beaker.bookmarks.list({pinned: true}).then(pinned => {
    pinnedBookmarks = pinned
    update()
  })
}
