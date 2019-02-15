/* globals beaker localStorage DatArchive */

import * as yo from 'yo-yo'
import Sortable from 'sortablejs'
import * as explorerPopup from '../com/settings/explorer-popup'
import * as editBookmarkPopup from '../com/settings/edit-bookmark-popup'
import * as MOTD from '../com/motd'
import * as onboardingPopup from '../com/onboarding-popup'
import * as contextMenu from '../com/context-menu'
import * as toast from '../com/toast'
import {findParent, writeToClipboard} from '../../lib/fg/event-handlers'
import {getBasicType} from '@beaker/core/lib/dat'

const LATEST_VERSION = 8002 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const RELEASE_NOTES_URL = 'https://github.com/beakerbrowser/beaker/releases/tag/0.8.2'

const SEARCH_GROUPS = [
  {key: 'fixed'},
  {key: 'apps', label: 'Applications'},
  {key: 'people', label: 'People'},
  {key: 'webPages', label: 'Web pages'},
  {key: 'imageCollections', label: 'Image collections'},
  {key: 'fileShares', label: 'File shares'},
  {key: 'bookmarks', label: 'Bookmarks'},
  {key: 'history', label: 'Your browsing history'},
  {key: 'others', label: 'Saved to your Library'}
]

// globals
// =

const bookmarks = navigator.importSystemAPI('bookmarks')
var currentUserSession
var pinnedBookmarks = []
var searchResults = {}
var query = ''
var lastQuery
var activeSearchResultIndex = 0
var isSearchFocused = false
var settings
var hasDismissedOnboarding = localStorage.hasDismissedOnboarding ? true : false
var pinGridMode = localStorage.pinGridMode || 'square-mode'

update()
setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  settings = await beaker.browser.getSettings()

  // open onboarding popup if this is the first render
  // if (!hasDismissedOnboarding) onboardingPopup.create()
  if (!localStorage.hasRunTutorial) {
    localStorage.hasRunTutorial = 1
    beakerStartTutorial()
  }

  // open update info if appropriate
  if (!settings.no_welcome_tab) {
    let latestVersion = await beaker.sitedata.get('beaker://start', 'latest-version')
    if (+latestVersion && +latestVersion < LATEST_VERSION) {
      await beaker.sitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
      window.open(RELEASE_NOTES_URL)
    }
  }

  await loadBookmarks()
  MOTD.load()
  update()
}

// rendering
// =

function update () {
  yo.update(document.querySelector('.window-content.start'), yo`
    <div class="window-content builtin start">
      <div class="builtin-wrapper start-wrapper">
        <div class="start-top-right-controls">
          <a href="beaker://settings"><span class="fas fa-cog"></span></a>
        </div>

        <div style="position: absolute; bottom: 10px; right: 20px; font-size: 22px; text-align: right; font-weight: 300">
          <span style="color: #2864dc; font-size: 38px; line-height: 1">Blue r1</span><br>
          Beta pre-release
        </div>

        ${MOTD.render()}

        <div class="start-content-container">
          ${renderSearch()}
          ${renderPinnedBookmarks()}
        </div>
      </div>
    </div>
  `)

  addSorting()
}

function renderSearch () {
  function renderSearchResultGroup (group, label) {
    if (!group || !group.length) return ''
    return yo`
      <div class="autocomplete-result-group">
        ${label ? yo`<div class="autocomplete-result-group-title">${label}</div>` : ''}
        ${group.map(renderSearchResult)}
      </div>
    `
  }

  var i = 0
  function renderSearchResult (res) {
    return yo`
      <a href=${res.url} class="autocomplete-result search-result ${i++ === activeSearchResultIndex ? 'active' : ''}">
        ${res.icon
            ? yo`<i class="icon ${res.icon}"></i>`
            : getBasicType(res.type) === 'user'
              ? yo`<img class="icon favicon rounded" src="${res.url}/thumb"/>`
              : yo`<img class="icon favicon" src="beaker-favicon:32,${res.url}"/>`
          }
        <span class="title">${res.title}</span>
        <span class="label">— ${res.url}</span>
      </a>
    `
  }

  return yo`
    <div class="autocomplete-container search-container">
      <input type="text" autofocus onfocus=${onFocusSearch} class="search" placeholder="Search your Web" onkeyup=${(e) => delay(onInputSearch, e)}/>
      <i class="fa fa-search"></i>

      <button class="btn primary search-btn" title="Submit search query" onclick=${onClickSubmitActiveSearch}>
        <i class="fa fa-arrow-right"></i>
      </button>

      ${query.length && isSearchFocused
        ? yo`<div class="search-results autocomplete-results">
          ${SEARCH_GROUPS.map(({key, label}) => renderSearchResultGroup(searchResults[key], label))}
        </div>`
        : ''}
    </div>`
}

function renderPinnedBookmarks () {
  return yo`
    <div class="pinned-bookmarks-container ${pinGridMode}">
      <div class="pinned-bookmarks-config">
        <div class="mode">
          ${renderPinGridMode('fas fa-th', 'square-mode')}
          ${renderPinGridMode('fas fa-th-large', 'horz-mode')}
        </div>
      </div>
      <div class="pinned-bookmarks">
        ${pinnedBookmarks.map(renderPinnedBookmark)}
        <a class="pinned-bookmark explorer-pin" href="#" onclick=${onClickExplorer}>
          <i class="fa fa-ellipsis-h"></i>
        </a>
      </div>
    </div>
  `
}

function renderPinGridMode (icon, mode) {
  return yo`<span class="${mode === pinGridMode ? 'active' : ''} ${icon}" onclick=${() => onSetPinGridMode(mode)}></span>`
}

function renderPinnedBookmark (bookmark) {
  const {href, title} = bookmark

  return yo`
    <a class="pinned-bookmark" href=${href} oncontextmenu=${e => onContextmenuPinnedBookmark(e, bookmark)}>
      <img src=${'beaker-favicon:64,' + href} class="favicon"/>
      <div class="title">${title}</div>
    </a>
  `
}

// events
// =

function onFocusSearch () {
  isSearchFocused = true
  update()

  window.addEventListener('click', onClickWhileSearchFocused)
}

function onClickWhileSearchFocused (e) {
  if (findParent(e.target, 'search-results') || findParent(e.target, 'search')) {
    return
  } else {
    isSearchFocused = false
    window.removeEventListener('click', onClickWhileSearchFocused)
    update()
  }
}

function onClickSubmitActiveSearch () {
  var res = getActiveSearchResult()
  if (!res) return
  window.location = res.url
}

function onInputSearch (e) {
  // enter
  if (e.keyCode === 13) {
    // ENTER
    window.location = getActiveSearchResult().url
  } else if (e.keyCode === 40) {
    // DOWN
    moveActiveSearchResult(1)
    update()
  } else if (e.keyCode === 38) {
    // UP
    moveActiveSearchResult(-1)
    update()
  } else {
    onUpdateSearchQuery(e.target.value)
  }
}

async function onUpdateSearchQuery (q) {
  searchResults = []
  query = q.length ? q.toLowerCase() : ''

  // reset selection if query changed
  if (lastQuery !== query) {
    activeSearchResultIndex = 0
  }
  lastQuery = query

  if (query.length) {
    searchResults = await beaker.crawler.listSuggestions(query)
    searchResults.fixed = [{
      url: `beaker://search?q=${encodeURIComponent(query)}`,
      icon: 'fa fa-search',
      title: `Search your Web for "${query}"`
    }]
  }

  update()
}

async function onClickExplorer (e) {
  e.preventDefault()
  try { await explorerPopup.create() }
  catch (e) { /*ignore*/ }

  // reload bookmarks in case any pins were added
  await loadBookmarks()
  update()
}

async function onClickEditBookmark (bOriginal) {
  try {
    // render popup
    var b = await editBookmarkPopup.create(bOriginal.href, bOriginal)

    // delete old bookmark if url changed
    if (bOriginal.href !== b.href) {
      await beaker.bookmarks.unbookmarkPrivate(bOriginal.href)
    }

    // set the bookmark
    await beaker.bookmarks.bookmarkPrivate(b.href, b)
    await beaker.bookmarks.setBookmarkPinned(b.href, b.pinned)

    await loadBookmarks()
    update()
  } catch (e) {
    // ignore
    console.log(e)
  }
}

async function onClickDeleteBookmark (bookmark) {
  await beaker.bookmarks.unbookmarkPrivate(bookmark.href)
  await loadBookmarks()
  update()

  async function undo () {
    await beaker.bookmarks.bookmarkPrivate(bookmark.href, bookmark)
    await beaker.bookmarks.setBookmarkPinned(bookmark.href, bookmark.pinned)
    await loadBookmarks()
    update()
  }

  toast.create('Bookmark deleted', '', 10e3, {label: 'Undo', click: undo})
}

async function onContextmenuPinnedBookmark (e, bookmark) {
  e.preventDefault()
  var url = e.currentTarget.getAttribute('href')
  const items = [
    {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(url)},
    {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(url)},
    {icon: 'fa fa-pencil-alt', label: 'Edit', click: () => onClickEditBookmark(bookmark)},
    {icon: 'fa fa-trash', label: 'Delete', click: () => onClickDeleteBookmark(bookmark)}
  ]
  await contextMenu.create({x: e.clientX, y: e.clientY, items})
}

function onSetPinGridMode (mode) {
  localStorage.pinGridMode = pinGridMode = mode
  update()
}

// helpers
// =

function delay (cb, param) {
  window.clearTimeout(cb)
  setTimeout(cb, 75, param)
}

async function loadBookmarks () {
  pinnedBookmarks = (await bookmarks.list({filters: {isPinned: true}})) || []
}

function getMergedSearchResults () {
  var list = []
  for (let group of SEARCH_GROUPS) {
    list = list.concat(searchResults[group.key])
  }
  return list
}

function getActiveSearchResult () {
  var mergedResults = getMergedSearchResults()
  return mergedResults[activeSearchResultIndex || 0]
}

function moveActiveSearchResult (dir) {
  var mergedResults = getMergedSearchResults()
  var i = activeSearchResultIndex || 0
  i += dir
  // make sure we don't go out of bounds
  if (i < 0) i = 0
  if (i > mergedResults.length - 1) i = mergedResults.length - 1
  activeSearchResultIndex = i
}

function addSorting () {
  new Sortable(document.querySelector('.pinned-bookmarks'), {
    group: 'pinned-bookmarks',
    draggable: '.pinned-bookmark',
    dataIdAttr: 'href',
    forceFallback: true,
    store: {
      get () {
        return pinnedBookmarks.map(b => b.href).concat('#')
      },
      async set (sortable) {
        var order = sortable.toArray()
        await beaker.bookmarks.setBookmarkPinOrder(order)
        loadBookmarks()
      }
    }
  })
}
