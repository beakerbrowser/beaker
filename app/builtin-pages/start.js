/*
This uses the beakerBookmarks API, which is exposed by webview-preload to all
sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// globals
// =

var builtinPages = [
  { href: 'beaker:history', label: 'History', icon: 'back-in-time' },
  { href: 'beaker:bookmarks', label: 'Bookmarks', icon: 'star' },
  { href: 'beaker:downloads', label: 'Downloads', icon: 'down' },
  { href: 'beaker:settings', label: 'Settings', icon: 'cog' }
]

var pinnedBoomarks

co(function* () {
  pinnedBookmarks = yield beakerBookmarks.getPinned() || []
  render()
})

// rendering
// =

function render () {
  document.querySelector('.pinned-wrapper').appendChild(
    yo`
      <div class="pinned">
        ${builtinPages.map(renderPinnedItem)}
        <div class="pinned__item" onclick="addPinnedSite">
          <div class="pinned__item-square transparent">
            <i class="icon icon-plus" aria-hidden="true"></i>
          </div>
        </div>
      </div>`
  )
}

function renderPinnedItem (item) {
  // render items
  var { href, label, icon } = item

  return yo`
    <a class="pinned__item" href=${href}>
      <div class="pinned__item-square">
        <i class="icon icon-${icon}" aria-hidden="true"></i>
      </div>
      <div class="pinned__item-label">${label}</div>
    </a>`
}

