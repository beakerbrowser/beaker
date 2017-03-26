/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

window.DatProfileSite = require('dat-profile-site')

const LATEST_VERSION = 6001 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001

// globals
// =

var builtinPages = [
  { href: 'beaker://history', label: 'History', icon: 'back-in-time' },
  { href: 'beaker://bookmarks', label: 'Bookmarks', icon: 'bookmarks' },
  { href: 'beaker://editor', label: 'Editor', icon: 'pencil' },
  { href: 'beaker://downloads', label: 'Downloads', icon: 'down' }
]

var showReleaseNotes = false
var isAddingPin = false
var bookmarks, pinnedBookmarks

co(function* () {
  bookmarks = (yield beaker.bookmarks.list()) || []
  pinnedBookmarks = (yield beaker.bookmarks.list({pinned: true})) || []
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
  yo.update(document.querySelector('.start-wrapper'), yo`
    <div class="start-wrapper">
      ${renderPinned()}
      ${renderBookmarks()}
      ${renderReleaseNotes()}
    </div>
  `)
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
    <div class="pinned">
      ${builtinPages.map(renderBuiltinPage)}
      ${pinnedBookmarks.map(renderPinnedBookmark)}
      <div class="pinned__item" onclick="addPinnedSite">
        <button label="Pin a site" class="pinned__item-square add pin-site ${pinCls}" onclick=${toggleAddPin}>
          <i class='icon icon-plus' aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `
}

function renderBookmarks () {
  if (!isAddingPin) {
    return ''
  }

  const renderRow = (row, i) =>
    yo`
      <li class="bookmark" data-row=${i} onclick=${pinBookmark(i)}>
        <a class="bookmark__link" href=${row.url} title=${row.title} />
          <img class="bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="bookmark__title">${row.title}</span>
        </a>
      </li>`

  return yo`
    <div class="bookmarks">
      <form id="add-pinned-site" onsubmit=${pinSite}>
        <legend>Add a new site or select a bookmark</legend>
        <input name="url" type="text" placeholder="https://example.com" required autofocus="autofocus" />
        <input type="submit">
      </form>
      <ul class="bookmarks-list">
        ${bookmarks.map(renderRow)}
      </ul>
    </div>
  `
}

function renderBuiltinPage (item) {
  // render items
  var { href, label, icon } = item

  return yo`
    <a class="pinned__item" href=${href}>
      <div class="pinned__item-square builtin">
        <i class="icon icon-${icon}" aria-hidden="true"></i>
      </div>
      <div class="pinned__item-label">${label}</div>
    </a>`
}

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark

  return yo`
    <a class="pinned__item" href=${url}>
      <div class="pinned__item-square">
        <img class="icon" src=${'beaker-favicon:' + url} />
      </div>
    <button label="Unpin ${url}" data-url=${url} onclick=${unpinSite} class="remove-pin icon icon-cancel"></button>
    <div class="pinned__item-label ellipsis">${title}</div>
    </a>`
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

  beaker.bookmarks.add(url.value, title, 1).then(() => {
    return beaker.bookmarks.list({pinned: true})
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
