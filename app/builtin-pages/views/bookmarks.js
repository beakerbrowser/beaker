/* globals beaker localStorage */

const yo = require('yo-yo')
import {getHostname} from '../../lib/strings'
import * as toast from '../com/toast'
import * as editBookmarkPopup from '../com/settings/edit-bookmark-popup'
import renderBuiltinPagesHeader from '../com/builtin-pages-header'
import toggleable from '../com/toggleable'
import renderCloseIcon from '../icon/close'

// globals
//

var query = '' // current search query
var resultsCount = 0
var currentView = 'all'
var currentSort
var bookmarks = []
var tags = []
var filteredTags = []
var tagsQuery = ''
var userProfile = {_origin: null} // null TODO(profiles) disabled -prf
// var followedUserProfiles = null TODO(profiles) disabled -prf

// read current view config
currentSort = localStorage.currentSort || 'recent'

// main
// =

renderToPage()
setup()
async function setup () {
  // load and render bookmarks
  // userProfile = await beaker.profiles.getCurrentUserProfile() TODO(profiles) disabled -prf
  await loadBookmarks()
  renderToPage()

  // now load & render tags and profiles
  tags = await beaker.bookmarks.listBookmarkTags()
  tags = tags.sort()
  filteredTags = tags
  // TODO(profiles) disabled -prf
  // followedUserProfiles = await Promise.all(
  //   userProfile.followUrls.map(u => beaker.profiles.getUserProfile(u))
  // )
  renderToPage()
}

async function loadBookmarks () {
  // read data
  switch (currentView) {
    case 'pinned':
      bookmarks = await beaker.bookmarks.listPinnedBookmarks()
      break

    case 'public':
      bookmarks = await beaker.bookmarks.listPublicBookmarks({
        author: userProfile._origin
      })
      break

    case 'private':
      bookmarks = await beaker.bookmarks.listPrivateBookmarks()
      break

    case 'mine':
      {
        let publicBookmarks = await beaker.bookmarks.listPublicBookmarks({
          author: userProfile._origin
        })
        let privateBookmarks = await beaker.bookmarks.listPrivateBookmarks()
        bookmarks = publicBookmarks.concat(privateBookmarks)
      }
      break

    case 'all':
      {
        let publicBookmarks = await beaker.bookmarks.listPublicBookmarks()
        let privateBookmarks = await beaker.bookmarks.listPrivateBookmarks()
        bookmarks = publicBookmarks.concat(privateBookmarks)
      }
      break

    case 'search':
      {
        let publicBookmarks = await beaker.bookmarks.listPublicBookmarks()
        let privateBookmarks = await beaker.bookmarks.listPrivateBookmarks()
        bookmarks = publicBookmarks.concat(privateBookmarks)
      }
      break
    default:
      if (currentView.startsWith('tag:')) {
        let tag = currentView.slice('tag:'.length)
        let publicBookmarks = await beaker.bookmarks.listPublicBookmarks({tag})
        let privateBookmarks = await beaker.bookmarks.listPrivateBookmarks({tag})
        bookmarks = publicBookmarks.concat(privateBookmarks)
      } else if (currentView.startsWith('dat://')) {
        bookmarks = await beaker.bookmarks.listPublicBookmarks({author: currentView})
      }
      break
  }

  // apply sort
  sortBookmarks()
}

function sortBookmarks () {
  if (currentSort === 'recent') {
    bookmarks.sort((a, b) => b.createdAt - a.createdAt)
  } else if (currentSort === 'alpha') {
    bookmarks.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }
}

// rendering
// =

function renderRow (row, i) {
  if (row.isHidden) return ''

  const isOwner = row.private /* || row._origin === userProfile._origin TODO(profiles) disabled -prf */

  return yo`
    <li class="ll-row bookmarks__row list ${row.private ? 'private' : 'public'} ${isOwner ? 'is-owner' : ''}" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        ${!isOwner ? yo`<a class="avatar-container row-modifier" href=${row._origin}><img class="avatar" src="${row._origin}/avatar.png"/></a>` : ''}
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>

        <span class="url bookmark__url">${getHostname(row.href)}</span>

        ${!currentView.startsWith('tag:')
          ? row.tags.map(tag => {
            return yo`
              <span class="tag" onclick=${e => { e.preventDefault(); e.stopPropagation(); onUpdateViewFilter(`tag:${tag}`) }}>
                ${tag}
              </span>`
          })
          : ''
        }

        ${isOwner && !row.private ? yo`
          <span>
            <span class="separator">•</span>
            <i class="fa fa-globe"></i>
          </span>`
          : ''}
      </a>

      ${renderActions(row, i)}
    </li>`
}

function renderActions (row, i) {
  const isOwner = row.private /* || row._origin === userProfile._origin TODO(profiles) disabled -prf */

  if (isOwner) {
    return yo`
      <div class="actions bookmark__actions">
        <button class="btn plain action tooltip-container" onclick=${onClickEdit(i)} data-tooltip="Edit bookmark">
          <i class="fas fa-pencil-alt icon"></i>
        </button>

        <button class="btn plain action bookmark tooltip-container" onclick=${onClickDelete(i)} data-tooltip="Unbookmark">
          <i class="fas fa-star icon"></i>
        </button>

        <button class="btn plain action pin ${row.pinned ? 'pinned' : 'unpinned'}" onclick=${() => onTogglePinned(i)} data-tooltip="${row.pinned ? 'Unpin from' : 'Pin to'} start page">
          <i class="fa fa-thumb-tack icon"></i>
        </button>
      </div>
    `
  } else {
    return yo`
      <div class="actions">
        <button class="btn transparent action add" data-tooltip="Add to your bookmarks" onclick=${() => onClickCopyToBookmarks(i)}>
          <i class="fa fa-plus"></i>
        </button>
      </div>
    `
  }
}

function renderBookmarksListToPage () {
  var helpEl = ''

  if (query && !resultsCount) {
    helpEl = yo`
      <div class="view empty">
        <i class="fa fa-search"></i>
        <p>
          No results for "${query}"
        </p>
      </div>`
  }

  yo.update(
    document.querySelector('.links-list.bookmarks'),
    yo`
      <div class="links-list bookmarks">
        ${query
          ? yo`<h2 class="subtitle-heading">"${query}" in Bookmarks</h2>`
          : yo`<h2 class="subtitle-heading">${currentView}</h2>`
        }
        ${bookmarks.length && resultsCount
          ? bookmarks.map(renderRow)
          : helpEl
        }
      </div>
    `)
}

function renderHeader () {
  return renderBuiltinPagesHeader('Bookmarks', null)

  // TODO replace
  var searchPlaceholder = 'Search your bookmarks'
  if (currentView === 'pinned' || currentView === 'public' || currentView === 'private') {
    searchPlaceholder = `Search ${currentView} bookmarks`
  }

  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Bookmarks')}

      <div class="search-container">
        <input required autofocus onkeyup=${onQueryBookmarks} placeholder=${searchPlaceholder} type="text" class="search"/>

        <span onclick=${onClearQuery} class="close-btn">
          ${renderCloseIcon()}
        </span>

        <i class="fa fa-search"></i>

        ${currentView.startsWith('tag:')
          ? yo`
            <span class="tag active nohover">
              ${currentView.slice('tag:'.length)}
              <span class="remove-btn" onclick=${() => onUpdateViewFilter('')}>
                <i class="fa fa-times"></i>
              </span>
            </span>`
          : ''
        }

        <div class="filter-btn">
          ${toggleable(yo`
            <div class="dropdown toggleable-container">
              <button class="btn transparent toggleable">
                <i class="fa fa-filter"></i>
              </button>

              <div class="dropdown-items filters with-triangle compact subtle-shadow right">
                <div class="section">
                  <div class="section-header">Sort by:</div>

                  <div onclick=${(e) => onUpdateSort('alpha')} class="dropdown-item ${currentSort === 'alpha' ? 'active' : ''}">
                    ${currentSort === 'alpha' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Alphabetical</span>
                  </div>

                  <div onclick=${(e) => onUpdateSort('recent')} class="dropdown-item ${currentSort === 'recent' ? 'active' : ''}">
                    ${currentSort === 'recent' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently bookmarked</span>
                  </div>
                </div>

                <div class="section">
                  <div class="section-header">Filter by tag:</div>

                  <input autofocus type="text" class="underline nofocus" onkeyup=${onQueryTags} placeholder="Search tags"/>

                  <div class="tag-cloud">
                    ${filteredTags.map(tag => {
                      const view = `tag:${tag}`
                      const cls = currentView === view ? 'active' : ''
                      return yo`
                        <button title="Filter by ${tag} tag" class="tag ${cls} nofocus" onclick=${() => onUpdateViewFilter(view)}>
                          ${tag}
                        </button>`
                    })}
                  </div>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>
    </div>`
}

function renderTagCloud () {
  yo.update(document.querySelector('.tag-cloud'), yo`
    <div class="tag-cloud">
      ${filteredTags.map(tag => {
        const view = `tag:${tag}`
        const cls = currentView === view ? 'active' : ''
        return yo`
          <button title="Filter by ${tag} tag" class="tag ${cls} onfocus" onclick=${() => onUpdateViewFilter(view)}>
            ${tag}
          </button>`
      })}
    </div>`
  )
}

function renderSidebar () {
  return yo`
    <div class="builtin-sidebar">
      <div class="section">
        <div class="nav-item ${currentView === 'all' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('all')}>
          <i class="fa fa-angle-right"></i>
          All bookmarks
        </div>

        ${''/* TODO(profiles) put pinned menu item here until profiles are stored -prf */}
        <div class="nav-item ${currentView === 'pinned' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('pinned')}>
          <i class="fa fa-angle-right"></i>
          Pinned bookmarks
        </div>
      </div>

      ${''/* TODO(profiles) disabled -prf
      <div class="section">
        <h2 class="subtitle-heading">Your bookmarks</h2>
        <div class="nav-item ${currentView === 'mine' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('mine')}>
          <i class="fas fa-star icon"></i>
          Your bookmarks
        </div>
        <div class="nav-item ${currentView === 'pinned' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('pinned')}>
          <i class="fa fa-thumb-tack icon"></i>
          Pinned
        </div>
        <div class="nav-item ${currentView === 'public' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('public')}>
          <i class="fa fa-globe icon"></i>
          Shared by you
        </div>
        <div class="nav-item ${currentView === 'private' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('private')}>
          <i class="fa fa-lock icon"></i>
          Private
        </div>
      </div>

      <div class="section">
        <h2 class="subtitle-heading">Friends</h2>

        ${followedUserProfiles
          ? followedUserProfiles.length
            ? followedUserProfiles.map(p => {
              return yo`
                <div class="friend nav-item ${currentView === p._origin ? 'active' : ''}" onclick=${() => onUpdateViewFilter(p._origin)}>
                  <img src=${p.avatar ? p._origin + p.avatar : ''} />
                  <span class="name">${p.name || 'Anonymous'}</span>
                </div>
              `
            })
            : yo`<div class="nav-item"><em>Not following anybody.</em></div>`
          : yo`<div class="nav-item"><em>Loading...</em></div>`}
      </div> */}
    </div>`
}

function renderToPage () {
  yo.update(
    document.querySelector('.bookmarks-wrapper'),
    yo`
      <div class="bookmarks-wrapper builtin-wrapper">
        ${renderHeader()}

        <div class="builtin-main">
          ${renderSidebar()}

          ${currentView.startsWith('tag:') || currentView.startsWith('pinned')
            ? yo`<h2 class="subtitle-heading">${currentView}</h2>`
            : ''
          }

          ${renderBookmarks()}
        </div>
      `)
}

function renderBookmarks () {
  var helpEl = ''

  if (query && !resultsCount) {
    helpEl = yo`
      <div class="view empty">
        <i class="fa fa-search"></i>
        <p>
          No results for "${query}"
        </p>
      </div>`
  } else if (!bookmarks.length) {
    helpEl = yo`<div class="empty">Loading...</div>`
  }

  return yo`
    <div>
      <div class="links-list bookmarks">
        ${bookmarks.map(renderRow)}
        ${helpEl}
      </div>
    </div>
  `
}

// event handlers
// =

async function onUpdateViewFilter (filter) {
  currentView = filter || 'all'
  document.querySelector('input.search').value = ''
  query = ''
  await loadBookmarks()
  renderToPage()
}

function onUpdateSort (sort) {
  currentSort = sort
  localStorage.currentSort = sort
  console.log(currentSort)
  sortBookmarks()
  renderToPage()
}

async function onClearQuery () {
  document.querySelector('input.search').value = ''
  query = ''
  resultsCount = 0
  currentView = 'all'
  await loadBookmarks()
  renderToPage()
}

async function onQueryBookmarks (e) {
  query = e.target.value.toLowerCase()
  resultsCount = 0
  if (!query) return onClearQuery()
  if (currentView !== 'search') {
    currentView = 'search'
    await loadBookmarks()
    renderToPage()
  }
  bookmarks.forEach(b => {
    b.isHidden = !(b.title.toLowerCase().includes(query) || b.href.toLowerCase().includes(query))
    if (!b.isHidden) resultsCount += 1
  })
  renderBookmarksListToPage()
}

async function onQueryTags (e) {
  tagsQuery = e.target.value.toLowerCase()
  filteredTags = tags.filter(tag => tag.toLowerCase().includes(tagsQuery))
  renderTagCloud()
}

async function onTogglePinned (i) {
  var b = bookmarks[i]
  b.pinned = !b.pinned
  await beaker.bookmarks.setBookmarkPinned(b.href, b.pinned)
  renderToPage()
}

async function onClickCopyToBookmarks (i) {
  var b = bookmarks[i]
  await beaker.bookmarks.bookmarkPrivate(b.href, b)

  toast.create(`${b.href} copied to your Bookmarks`)
}

function onClickEdit (i) {
  return async e => {
    e.preventDefault()
    e.stopPropagation()

    // capture initial value
    var bOriginal = bookmarks[i]
    bOriginal.isPrivate = bOriginal.private

    // render popup
    try {
      var b = await editBookmarkPopup.create(bOriginal.href, bOriginal)

      // delete old bookmark if url changed
      if (bOriginal.href !== b.href) {
        if (bOriginal.private) {
          await beaker.bookmarks.unbookmarkPrivate(bOriginal.href)
        } else {
          await beaker.bookmarks.unbookmarkPublic(bOriginal.href)
        }
      }

      // delete old bookmark if privacy changed TODO(profiles) disabled -prf
      // else if (bOriginal.private && !b.private) {
      //   await beaker.bookmarks.unbookmarkPrivate(b.href)
      // } else if (!bOriginal.private && b.private) {
      //   await beaker.bookmarks.unbookmarkPublic(b.href)
      // }

      // set the bookmark
      await beaker.bookmarks.bookmarkPrivate(b.href, b)
      /* TODO(profiles) private only -prf
      if (b.private) {
        await beaker.bookmarks.bookmarkPrivate(b.href, b)
      } else {
        beaker.bookmarks.bookmarkPublic(b.href, b)
      }*/

      // set the pinned status of the bookmark
      await beaker.bookmarks.setBookmarkPinned(b.href, b.pinned)

      await loadBookmarks()
      renderToPage()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }
}

function onClickDelete (i) {
  return async e => {
    e.preventDefault()
    e.stopPropagation()

    // delete bookmark
    var b = bookmarks[i]
    bookmarks.splice(i, 1)
    if (b.private) {
      await beaker.bookmarks.unbookmarkPrivate(b.href)
    } else {
      await beaker.bookmarks.unbookmarkPublic(b.href)
    }
    renderToPage()
  }
}
