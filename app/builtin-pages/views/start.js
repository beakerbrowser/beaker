/* globals beaker */

import * as yo from 'yo-yo'
import renderSidebar from '../com/sidebar'
import * as addPinnedBookmarkPopup from '../com/add-pinned-bookmark-popup'
import renderCloseIcon from '../icon/close'

const LATEST_VERSION = 7005 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const WELCOME_URL = 'https://beakerbrowser.com/docs/using-beaker/'
const RELEASE_NOTES_URL = 'https://beakerbrowser.com/releases/0-7-5/?updated=true'

// globals
// =

var pinnedBookmarks = []
var settings

update()
setup()
async function setup () {
  await loadBookmarks()
  settings = await beaker.browser.getSettings()
  update()

  // open update info if appropriate
  if (!settings.noWelcomeTab) {
    let latestVersion = await beaker.sitedata.get('beaker://start', 'latest-version')
    if (+latestVersion < LATEST_VERSION) {
      await beaker.sitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
      if (!latestVersion) {
        window.open(WELCOME_URL)
      } else {
        window.open(RELEASE_NOTES_URL)
      }
    }
  }
}

// events
// =

async function onUnpinBookmark (e) {
  e.preventDefault()
  await beaker.bookmarks.setBookmarkPinned(e.currentTarget.dataset.href, false)
  await loadBookmarks()
  update()
}

async function onClickAddBookmark (e) {
  try {
    var b = await addPinnedBookmarkPopup.create()
    if (!(await beaker.bookmarks.isBookmarked(b.url))) {
      await beaker.bookmarks.bookmarkPrivate(b.url, {title: b.title})
    }
    await beaker.bookmarks.setBookmarkPinned(b.url, true)
    await loadBookmarks()
    update()
  } catch (e) {
    // ignore
    console.log(e)
  }
}

// rendering
// =

function update () {
  // TODO(bgimg) restore when background images are restored -prf
  // var theme = settings.start_page_background_image

  yo.update(document.querySelector('.window-content.start'), yo`
    <div class="window-content builtin start ${''/*TODO(bgimg) theme*/}">
      ${renderSidebar('start')}
      <div class="builtin-wrapper start-wrapper">
        <div class="builtin-main center">
          ${renderPinnedBookmarks()}
        </div>
      </div>
    </div>
  `)
}

function renderPinnedBookmarks () {
  return yo`
    <div class="pinned-bookmarks">
      ${pinnedBookmarks.map(renderPinnedBookmark)}
      <a class="add-bookmark-btn" onclick=${onClickAddBookmark}>+</a>
    </div>
  `
}

function renderPinnedBookmark (bookmark) {
  var { href, title } = bookmark
  return yo`
    <a class="pinned-bookmark" href=${href}>
      <div class="favicon-container">
        <img src=${'beaker-favicon:' + href} class="favicon"/>
      </div>
      <div class="info">
        <div class="title">${title}</div>
      </div>
      <button class="close-btn nofocus" data-href=${href} title="Unpin this bookmark" onclick=${onUnpinBookmark}>
        ${renderCloseIcon()}
      </button>
    </a>
  `
}

// helpers
// =

async function loadBookmarks () {
  pinnedBookmarks = (await beaker.bookmarks.listPinnedBookmarks()) || []
}
