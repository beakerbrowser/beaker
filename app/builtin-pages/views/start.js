/* globals beaker */

import * as yo from 'yo-yo'
import {findParent} from '../../lib/fg/event-handlers'
import * as addPinnedBookmarkPopup from '../com/add-pinned-bookmark-popup'
import renderHelpTip from '../com/help-tip'
import * as onboardingPopup from '../com/onboarding-popup'

const LATEST_VERSION = 7010 // semver where major*1mm and minor*1k; thus 3.2.1 = 3002001
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
  if (!settings.no_welcome_tab) {
    let latestVersion = await beaker.sitedata.get('beaker://start', 'latest-version')
    if (+latestVersion && +latestVersion < LATEST_VERSION) {
      await beaker.sitedata.set('beaker://start', 'latest-version', LATEST_VERSION)
      window.open(RELEASE_NOTES_URL)
    }
  }

  await loadBookmarks()
  update()
}

// events
// =

async function onClickHelpButton () {
  await onboardingPopup.create()
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

    // add a DuckDuckGo search to the results
    const ddgRes = {
      title: query,
      targetUrl: `https://duckduckgo.com?q=${query}`,
      icon: 'fa fa-search',
      label: 'Search DuckDuckGo',
      class: 'ddg'
    }
    searchResults.push(ddgRes)
  }

  update()
}

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
        ${renderHelpTip()}
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

        <div class="beta-info">
          <i class="fa fa-bolt"></i>
          You're using a beta version of Beaker.
          <a href="https://www.surveymonkey.com/r/NK9LGQ3">Share feedback</a> or
          <a href="https://github.com/beakerbrowser/beaker/issues/new?labels=0.8-beta-feedback&template=issue_template_0.8_beta.md">Report an issue</a>.
        </div>

        ${renderDock()}

        ${renderHelpButton()}
      </div>
    </div>
  `)
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
        <a class="dock-item subtitle-heading" href="beaker://settings">
          Settings
        </a>

        <a class="dock-item subtitle-heading" href="beaker://history">
          History
        </a>

        <a class="dock-item subtitle-heading" href="beaker://bookmarks">
          Bookmarks
        </a>

        <a class="dock-item subtitle-heading" href="beaker://library">
          Library
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
    <a class="pinned-bookmark" href=${href}>
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