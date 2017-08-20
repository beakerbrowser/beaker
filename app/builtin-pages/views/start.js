/* globals beaker beakerBrowser beakerSitedata DatArchive Image */

import * as yo from 'yo-yo'
import {ArchivesList} from 'builtin-pages-lib'
import ColorThief from '../../lib/fg/color-thief'
import {findParent} from '../../lib/fg/event-handlers'
import {pluralize} from '../../lib/strings'
import renderSidebar from '../com/sidebar'

const colorThief = new ColorThief()

const LATEST_VERSION = 7005 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const WELCOME_URL = 'https://beakerbrowser.com/docs/using-beaker/'
const RELEASE_NOTES_URL = 'https://beakerbrowser.com/releases/0-7-5/?updated=true'

// globals
// =

var pinnedBookmarks
var settings

setup()
async function setup () {
  await loadBookmarks()
  settings = await beakerBrowser.getSettings()
  update()

  // open update info if appropriate
  if (!settings.noWelcomeTab) {
    let latestVersion = await beakerSitedata.get('beaker://start', 'latest-version')
    if (+latestVersion < LATEST_VERSION) {
      await beakerSitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
      if (!latestVersion) {
        window.open(WELCOME_URL)
      } else {
        window.open(RELEASE_NOTES_URL)
      }
      return
    }
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
    </div>
  `
}

function renderPinnedBookmark (bookmark) {
  var { href, title } = bookmark
  var [r, g, b] = bookmark.dominantColor || [255, 255, 255]
  return yo`
    <a class="pinned-bookmark" href=${href}>
      <div class="favicon-container">
        <img src=${'beaker-favicon:' + href} class="favicon"/>
      </div>
      <div class="title">${title}</div>
    </a>
  `
}

// helpers
// =

async function loadBookmarks () {
  pinnedBookmarks = (await beaker.bookmarks.listPinnedBookmarks()) || []

  // load dominant colors of each pinned bookmark
  await Promise.all(pinnedBookmarks.map(attachDominantColor))
}

function attachDominantColor (bookmark) {
  return new Promise(resolve => {
    var img = new Image()
    img.setAttribute('crossOrigin', 'anonymous')
    img.onload = e => {
      var c = colorThief.getColor(img, 10)
      // c[0] = (c[0] / 4) | 0 + 192
      // c[1] = (c[1] / 4) | 0 + 192
      // c[2] = (c[2] / 4) | 0 + 192
      bookmark.dominantColor = c
      resolve()
    }
    img.onerror = resolve
    img.src = 'beaker-favicon:' + bookmark.href
  })
}

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}
