/* globals beaker localStorage DatArchive */

import * as yo from 'yo-yo'
import Sortable from 'sortablejs'
import * as addPinnedBookmarkPopup from '../com/settings/add-pinned-bookmark-popup'
import * as editBookmarkPopup from '../com/settings/edit-bookmark-popup'
import * as MOTD from '../com/motd'
import * as onboardingPopup from '../com/onboarding-popup'
import * as contextMenu from '../com/context-menu'
import * as toast from '../com/toast'
import {findParent, writeToClipboard} from '../../lib/fg/event-handlers'

import {getSearchEngineOrDefault, getDefaultSearchEngine} from '../../lib/search-engines'

const LATEST_VERSION = 7011 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
const RELEASE_NOTES_URL = 'https://beakerbrowser.com/releases/0-7-10/?updated=true'

// globals
// =

var pinnedBookmarks = []
var searchResults = []
var query = ''
var activeSearchResult = 0
var isSearchFocused = false
var settings
var hasDismissedOnboarding = localStorage.hasDismissedOnboarding ? true : false

update()
setup()
async function setup () {
  settings = await beaker.browser.getSettings()

  // open onboarding popup if this is the first render
  if (!hasDismissedOnboarding) onboardingPopup.create()

  // open update info if appropriate
  // if (!settings.no_welcome_tab) {
  //   let latestVersion = await beaker.sitedata.get('beaker://start', 'latest-version')
  //   if (+latestVersion && +latestVersion < LATEST_VERSION) {
  //     await beaker.sitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
  //     window.open(RELEASE_NOTES_URL)
  //   }
  // }

  await loadBookmarks()
  MOTD.load()
  update()
}

// events
// =

function onClickNewSiteButton (e) {
  e.preventDefault()
  e.stopPropagation()

  contextMenu.create({
    x: e.clientX,
    y: e.clientY - 20,
    render ({x, y}) {
      return yo`
        <div class="context-menu dropdown" style="left: ${x}px; top: ${y}px">
          <div class="dropdown-items custom create-new filters subtle-shadow center top">
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
      `
    }
  })
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

async function onClickHelpButton () {
  await onboardingPopup.create({showHelpOnly: true})
}

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
  if (!query || !searchResults) return
  window.location = searchResults[activeSearchResult].targetUrl
}

function onInputSearch (e) {
  // enter
  if (e.keyCode === 13) {
    // ENTER
    window.location = searchResults[activeSearchResult].targetUrl
  } else if (e.keyCode === 40) {
    // DOWN
    activeSearchResult += 1

    // make sure we don't go out of bounds
    if (activeSearchResult > searchResults.length - 1) {
      activeSearchResult = searchResults.length - 1
    }
    update()
  } else if (e.keyCode === 38) {
    // UP
    activeSearchResult -= 1

    // make sure we don't go out of bounds
    if (activeSearchResult < 0) {
      activeSearchResult = 0
    }
    update()
  } else {
    onUpdateSearchQuery(e.target.value)
  }
}

async function onUpdateSearchQuery (q) {
  searchResults = []
  activeSearchResult = 0
  query = q.length ? q.toLowerCase() : ''

  if (query.length) {
    // fetch library archives
    // filter by title, URL
    let libraryResults = await beaker.archives.list({isNetworked: true})
    libraryResults = libraryResults.filter(a => (a.url.includes(query) || (a.title && a.title.toLowerCase().includes(query)))).slice(0, 3)
    libraryResults = libraryResults.map(a => {
      return {
        title: a.title,
        faviconUrl: a.url,
        targetUrl: a.url,
        label: 'Saved to Library'
      }
    })
    searchResults = searchResults.concat(libraryResults)

    // fetch history
    let historyResults = await beaker.history.search(query)
    historyResults = historyResults.slice(0, 6)
    historyResults = historyResults.map(r => {
      return {
        title: r.title,
        faviconUrl: r.url,
        targetUrl: r.url,
        label: r.url
      }
    })
    searchResults = searchResults.concat(historyResults)

    var configuredSearchEngine = settings.search_engine;
    var engine = getSearchEngineOrDefault(configuredSearchEngine);

    // add a search result search to the results
    const searchResult = {
      title: query,
      targetUrl: engine.makeQueryUrl(query),
      icon: 'fa fa-search',
      label: 'Search ' + engine.name,
      class: 'ddg'
    }
    searchResults.push(searchResult)
  }

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
    {icon: 'external-link', label: 'Open Link in New Tab', click: () => window.open(url)},
    {icon: 'link', label: 'Copy Link Address', click: () => writeToClipboard(url)},
    {icon: 'pencil', label: 'Edit', click: () => onClickEditBookmark(bookmark)},
    {icon: 'trash', label: 'Delete', click: () => onClickDeleteBookmark(bookmark)}
  ]
  await contextMenu.create({x: e.clientX, y: e.clientY, items})
}

// rendering
// =

function update () {
  // TODO(bgimg) restore when background images are restored -prf
  // var theme = settings.start_page_background_image

  yo.update(document.querySelector('.window-content.start'), yo`
    <div class="window-content builtin start ${''/* TODO(bgimg) theme */}">
      <div class="builtin-wrapper start-wrapper">
        <div class="header-actions">
          ${renderHelpButton()}
        </div>
        ${MOTD.render()}
        <div class="autocomplete-container search-container">
          <input type="text" autofocus onfocus=${onFocusSearch} class="search" placeholder="Search the Web, your Library, bookmarks, and more" onkeyup=${(e) => delay(onInputSearch, e)}/>
          <i class="fa fa-search"></i>

          <button class="btn primary search-btn" title="Submit search query" onclick=${onClickSubmitActiveSearch}>
            <i class="fa fa-arrow-right"></i>
          </button>

          ${query.length && isSearchFocused ? yo`
            <div class="search-results autocomplete-results">${searchResults.map(renderSearchResult)}</div>`
          : ''}
        </div>

        ${renderPinnedBookmarks()}

        ${renderDock()}

      </div>
    </div>
  `)

  addSorting()
}

function renderHelpButton () {
  return yo`
    <button class="btn plain help" onclick=${onClickHelpButton}>
      <i class="fa fa-question-circle-o"></i>
    </button>`
}

function renderSearchResult (res, i) {
  return yo`
    <a href=${res.targetUrl} class="autocomplete-result search-result ${i === activeSearchResult ? 'active' : ''} ${res.class}">
      ${res.faviconUrl
        ? yo`<img class="icon favicon" src="beaker-favicon:32,${res.faviconUrl}"/>`
        : yo`<i class="icon ${res.icon}"></i>`
      }

      <span class="title">${res.title}</span>

      ${res.label ? yo`<span class="label">— ${res.label || ''}</span>` : ''}
    </a>
  `
}

function renderDock () {
  return yo`
    <div class="dock-wrapper">
      <div class="dock">
        <a class="dock-item" href="beaker://settings">
          Settings
        </a>

        <a class="dock-item" href="beaker://history">
          History
        </a>

        <a class="dock-item" href="beaker://bookmarks">
          Bookmarks
        </a>

        <a class="dock-item" href="beaker://library">
          Library
        </a>

        <span class="dock-separator">|</span>

        <a class="dock-item" onclick=${onClickNewSiteButton}>
          New +
        </a>
      </div>
    </div>
  `
}

function renderPinnedBookmarks () {
  return yo`
    <div class="pinned-bookmarks-container">
      ${pinnedBookmarks.length ? yo`
        <h2 class="subtitle-heading">
          <span>Pinned bookmarks</span>
          <button class="btn transparent add-pinned-btn" data-tooltip="Add pinned bookmark" onclick=${onClickAddBookmark}>
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
    <a class="pinned-bookmark" href=${href} oncontextmenu=${e => onContextmenuPinnedBookmark(e, bookmark)}>
      <img src=${'beaker-favicon:32,' + href} class="favicon"/>
      <div class="title">${title}</div>
    </a>
  `
}

// helpers
// =

function delay (cb, param) {
  window.clearTimeout(cb)
  setTimeout(cb, 75, param)
}

async function loadBookmarks () {
  pinnedBookmarks = (await beaker.bookmarks.listPinnedBookmarks()) || []
}

function addSorting () {
  new Sortable(document.querySelector('.pinned-bookmarks'), {
    group: 'pinned-bookmarks',
    draggable: '.pinned-bookmark',
    dataIdAttr: 'href',
    forceFallback: true,
    store: {
      get () {
        return pinnedBookmarks.map(b => b.href)
      },
      async set (sortable) {
        var order = sortable.toArray()
        await beaker.bookmarks.setBookmarkPinOrder(order)
        loadBookmarks()
      }
    }
  })
}
