/* globals beaker */

import * as yo from 'yo-yo'
import * as addPinnedBookmarkPopup from '../com/add-pinned-bookmark-popup'

const LATEST_VERSION = 7009 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const WELCOME_URL = 'https://beakerbrowser.com/docs/using-beaker/'
const RELEASE_NOTES_URL = 'https://beakerbrowser.com/releases/0-7-9/?updated=true'

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
      <div class="builtin-wrapper start-wrapper">
        <div class="search-container">
          <input type="text" autofocus class="search" placeholder="Search the Web, your Library, bookmarks, and more"/>
          <i class="fa fa-search"></i>
          <button class="btn primary search-btn" title="Submit search query">
            <i class="fa fa-arrow-right"></i>
          </button>
        </div>

        ${renderPinnedBookmarks()}

        ${renderDock()}
      </div>
    </div>
  `)
}

function renderDock () {
  return yo`
    <div class="dock-wrapper">
      <div class="dock">
        <h2 class="dock-item"><a href="beaker://network">Network Settings</a></h2>
        <h2 class="dock-item"><a href="beaker://history">History</a></h2>
        <h2 class="dock-item"><a href="beaker://bookmarks" >Bookmarks</a></h2>
        <h2 class="dock-item"><a href="beaker://library">Library</a></h2>
      </div>
    </div>
  `
}

function renderPinnedBookmarks () {
  return yo`
    <div class="pinned-bookmarks-container">
      ${pinnedBookmarks.length ? yo`
        <h2>
          <span>Pinned bookmarks</span>
          <button class="btn transparent tooltip-container add-pinned-btn" data-tooltip="Add pinned bookmark" onclick=${onClickAddBookmark}>
            <i class="fa fa-plus"></i>
          </button>
        </h2>`
      : ''}

      <div class="pinned-bookmarks">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
      </div>
    </div>
  `
}

function renderPinnedBookmark (bookmark) {
  const {href, title} = bookmark

  return yo`
    <a class="pinned-bookmark" href=${href}>
      <img src=${'beaker-favicon:' + href} class="favicon"/>
      <div class="title">${title}</div>
    </a>
  `
}

// helpers
// =

async function loadBookmarks () {
  pinnedBookmarks = (await beaker.bookmarks.listPinnedBookmarks()) || []
}