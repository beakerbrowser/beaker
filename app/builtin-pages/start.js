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

var pinnedBookmarks

co(function* () {
  pinnedBookmarks = (yield beakerBookmarks.listPinned()) || []
  render()
})

// rendering
// =

function render () {
  yo.update(document.querySelector('.pinned-wrapper'), yo`
    <div class="pinned-wrapper">
      <div class="pinned">
        ${builtinPages.map(renderPinnedItem)}
        ${pinnedBookmarks.map(renderPinnedBookmark)}
        <div class="pinned__item" onclick="addPinnedSite">
          <div class="pinned__item-square transparent pin-site" onclick=${renderPinSiteForm}>
            <i class="icon icon-plus" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    </div>`)
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

function renderPinnedBookmark (bookmark) {
  var { url, title } = bookmark

  return yo`
    <a class="pinned__item" href=${url}>
      <div class="pinned__item-square">
        <img class="icon" src=${'beaker-favicon:' + url} />
      </div>
      <div class="pinned__item-label ellipsis">${title}</div>
      <input type="button" value=unpin data-url=${url} onclick=${unpinSite} />
    </a>`
}

function renderPinSiteForm (url, title) {
  document.querySelector('.pinned-wrapper').append(yo`
    <form id="add-pinned-site">
      <label for="url">URL</label>
      <input name="url" type="text" placeholder="URL" required />

      <label for="title">Title</label>
      <input name="title" type="text" placeholder="Title" required />
      <input type="button" value="Pin site" onclick=${pinSite} />
    </form>`)

  document.querySelector('input[name="url"]').focus()
  document.querySelector('.pin-site').style.display = 'none'
}

function pinSite (e) {
  e.preventDefault()

  var form = document.getElementById('add-pinned-site')
  var {url, title} = form.elements

  beakerBookmarks.add(url.value, title.value, 1)

  beakerBookmarks.listPinned().then(pinned => {
    pinnedBookmarks = pinned
    render()
  })

  document.querySelector('.pinned-wrapper').removeChild(form)
}

function unpinSite (e) {
  e.preventDefault()
  beakerBookmarks.togglePinned(e.target.dataset.url, true)

  beakerBookmarks.listPinned().then(pinned => {
    pinnedBookmarks = pinned
    render()
  })
}
