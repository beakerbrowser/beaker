/* globals beaker */

const yo = require('yo-yo')
import {getHostname} from '../../lib/strings'
import * as toast from '../com/toast'
import * as editBookmarkPopup from '../com/edit-bookmark-popup'
import renderSidebar from '../com/sidebar'
import renderCloseIcon from '../icon/close'
import renderGlobeIcon from '../icon/globe'
import renderHistoryIcon from '../icon/history'
import renderPinIcon from '../icon/pin'
import renderPadlockIcon from '../icon/padlock'
import renderStarFillIcon from '../icon/star-fill'
import renderTrashIcon from '../icon/trash'
import renderPencilIcon from '../icon/pencil'
import renderGridIcon from '../icon/grid'
import renderListIcon from '../icon/list'
import renderListExpandedIcon from '../icon/list-expanded'

// globals
//

var query = '' // current search query
var currentView = 'all'
var currentRenderingMode
var currentSort
var bookmarks = []
var tags = []
var userProfile = null
var followedUserProfiles = null

// read current view config
currentRenderingMode = localStorage.currentRenderingMode || 'expanded'
currentSort = localStorage.currentSort || 'recent'

// main
// =

renderToPage()
setup()
async function setup () {
  // load and render bookmarks
  userProfile = await beaker.profiles.getCurrentProfile()
  await loadBookmarks()
  renderToPage()

  // now load & render tags and profiles
  tags = await beaker.bookmarks.listBookmarkTags()
  followedUserProfiles = await Promise.all(
    userProfile.followUrls.map(u => beaker.profiles.getProfile(u))
  )
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
  if (row.isHidden) {
    return ''
  } else if (currentRenderingMode === 'grid') {
    return renderRowGrid(row, i)
  } else if (currentRenderingMode === 'expanded') {
    return renderRowExpanded(row, i)
  } else if (currentRenderingMode === 'compact') {
    return renderRowCompact(row, i)
  } else {
    return ''
  }
}

function renderRowCompact (row, i) {
  const isOwner = row.private || row._origin === userProfile._origin

  return yo`
    <li class="ll-row bookmarks__row compact ${row.private ? 'private' : 'public'} ${isOwner ? 'is-owner' : ''}" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        ${!isOwner ? yo`<a class="avatar-container row-modifier" href=${row._origin}><img class="avatar" src="${row._origin}/avatar.png"/></a>` : '' }
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>

        <span class="url bookmark__url">${getHostname(row.href)}</span>

        ${isOwner && !row.private ? yo`
          <span>
            <span class="separator">•</span>
            ${renderGlobeIcon()}
          </span>`
          : ''}
      </a>

      ${renderActions(row, i)}
    </li>`
}

function renderRowExpanded (row, i) {
  const isOwner = row.private || row._origin === userProfile._origin

  return yo`
    <li class="ll-row bookmarks__row expanded" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        ${!isOwner ? yo`<a class="avatar-container row-modifier" href=${row._origin}><img class="avatar" src="${row._origin}/avatar.png"/></a>` : '' }

        <span class="header">
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />

          <div class="info">
            <span class="title bookmark__title">
              ${row.title.startsWith('dat://')
                ? yo`<em>Untitled</em>`
                : yo`${row.title}`
              }
            </span>
            <span class="url bookmark__url">${getHostname(row.href)}</span>
          </div>
        </span>

        <div class="notes ${row.notes ? '' : 'empty'}">${row.notes || ''}</div>

        <div class="tags ${row.tags.length ? '' : 'empty'}">
          ${row.tags.map(t => {
            const view = `tag:${t}`
            return yo`<span onclick=${(e) => {e.stopPropagation(); e.preventDefault(); onUpdateViewFilter(view);}} class="tag">${t}</span>`
          })}
        </div>
      </a>

      ${renderActions(row, i)}
    </li>`
}

function renderRowGrid (row, i) {
  const isOwner = row.private || row._origin === userProfile._origin

  return yo`
    <li class="ll-row bookmarks__row grid" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        ${!isOwner ? yo`<a class="avatar-container row-modifier" href=${row._origin}><img class="avatar" src="${row._origin}/avatar.png"/></a>` : '' }

        <span class="header">
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />

          <div class="info">
            <span class="title bookmark__title">
              ${row.title.startsWith('dat://')
                ? yo`<em>Untitled</em>`
                : yo`${row.title}`
              }
            </span>
            <span class="url bookmark__url">${getHostname(row.href)}</span>
          </div>
        </span>

        <div class="notes ${row.notes ? '' : 'empty'}">${row.notes || ''}</div>

        <div class="tags ${row.tags.length ? '' : 'empty'}">
          ${row.tags.map(t => {
            const view = `tag:${t}`
            return yo`<span onclick=${(e) => {e.stopPropagation(); e.preventDefault(); onUpdateViewFilter(view);}} class="tag">${t}</span>`
          })}
        </div>
      </a>

      ${renderActions(row, i)}
    </li>`
}

function renderActions (row, i) {
  const isOwner = row.private || row._origin === userProfile._origin

  if (isOwner) {
    return yo`
      <div class="actions bookmark__actions">
        <div class="action" onclick=${onClickEdit(i)} title="Edit bookmark">
          ${renderPencilIcon()}
        </div>
        <div class="action" onclick=${onClickDelete(i)} title="Delete bookmark">
          ${renderTrashIcon()}
        </div>
        <div class="action pin ${row.pinned ? 'pinned' : 'unpinned'}" onclick=${() => onTogglePinned(i)}>
          ${renderPinIcon()}
        </div>
      </div>
    `
  } else {
    return yo`
      <div class="actions">
        <div class="action add" onclick=${() => onClickCopyToBookmarks(i)} title="Add to your bookmarks"><span class="icon add">+</span></div>
      </div>
    `
  }
}

function renderBookmarksListToPage () {
  yo.update(
    document.querySelector('.links-list.bookmarks'),
    yo`
      <div class="links-list bookmarks ${currentRenderingMode}">
        ${bookmarks.length
          ? bookmarks.map(renderRow)
          : yo`<em class="empty">No bookmarks</em>`
        }
      </div>
    `)
}

function renderToPage () {
  var searchPlaceholder = 'Search bookmarks'
  if (currentView === 'pinned' || currentView === 'public' || currentView === 'private') {
    searchPlaceholder = `Search ${currentView} bookmarks`
  }

  yo.update(
    document.querySelector('.bookmarks-wrapper'),
    yo`
      <div class="bookmarks-wrapper builtin-wrapper">
        ${renderSidebar('bookmarks')}
        <div>
          <div class="builtin-sidebar">
            <h1>Bookmarks</h1>

            <div class="section">
              <div class="nav-item ${currentView === 'all' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('all')}>
                ${renderStarFillIcon()}
                All bookmarks
              </div>
            </div>

            <div class="section">
              <h2>Your bookmarks</h2>
              <div class="nav-item ${currentView === 'mine' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('mine')}>
                ${renderStarFillIcon()}
                Your bookmarks
              </div>
              <div class="nav-item ${currentView === 'pinned' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('pinned')}>
                ${renderPinIcon()}
                Pinned
              </div>
              <div class="nav-item ${currentView === 'public' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('public')}>
                ${renderGlobeIcon()}
                Shared by you
              </div>
              <div class="nav-item ${currentView === 'private' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('private')}>
                ${renderPadlockIcon()}
                Private
              </div>
            </div>

            <div class="section">
              <h2>Friends</h2>

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
            </div>

            <div class="section">
              <h2>Tags</h2>

              <div class="nav-link-cloud">
                ${tags.map(t => {
                  const view = `tag:${t}`
                  const cls = currentView === view ? 'active' : undefined
                  return yo`<a class=${cls} onclick=${() => onUpdateViewFilter(view)}>${t}</a>`
                })}
              </div>
            </div>
          </div>

          <div class="builtin-main">
            <div class="builtin-header fixed">
              <div class="search-container">
                <input required autofocus onkeyup=${onQueryBookmarks} placeholder=${searchPlaceholder} type="text" class="search"/>
                <span onclick=${onClearQuery} class="close-btn">
                  ${renderCloseIcon()}
                </span>
              </div>

              <div class="sort-controls btn-bar">
                <span class="btn ${currentSort === 'alpha' ? 'pressed' : ''}" title="Sort by name" onclick=${() => onUpdateSort('alpha')}>
                  ${renderListIcon()}
                </span>

                <span class="btn ${currentSort === 'recent' ? 'pressed' : ''}" title="Sort by latest" onclick=${() => onUpdateSort('recent')}>
                  ${renderHistoryIcon()}
                </span>
              </div>

              <div class="view-controls btn-bar">
                <span class="btn ${currentRenderingMode === 'compact' ? 'pressed' : ''}" title="List view" onclick=${() => onUpdateViewRendering('compact')}>
                  ${renderListIcon()}
                </span>

                <span class="btn ${currentRenderingMode === 'grid' ? 'pressed' : ''}" title="Grid view" onclick=${() => onUpdateViewRendering('grid')}>
                  ${renderGridIcon()}
                </span>

                <span class="btn ${currentRenderingMode === 'expanded' ? 'pressed' : ''}"  title="Expanded list view" onclick=${() => onUpdateViewRendering('expanded')}>
                  ${renderListExpandedIcon()}
                </span>
              </div>
            </div>

            ${renderBookmarks()}
          </div>
        </div>`)
}

function renderBookmarks () {
  var helpEl = bookmarks.length ? '' : yo`<em class="empty">No results</em>`
  return yo`
    <div>
      <div class="links-list bookmarks ${currentRenderingMode}">
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
  sortBookmarks()
  renderToPage()
}

function onUpdateViewRendering (mode) {
  currentRenderingMode = mode
  localStorage.currentRenderingMode = mode
  renderToPage()
}

async function onClearQuery () {
  document.querySelector('input.search').value = ''
  query = ''
  currentView = 'all'
  await loadBookmarks()
  renderToPage()
}

async function onQueryBookmarks (e) {
  query = e.target.value.toLowerCase()
  if (!query) return onClearQuery()
  if (currentView !== 'search') {
    currentView = 'search'
    await loadBookmarks()
    renderToPage()
  }
  bookmarks.forEach(b => {
    b.isHidden = !(b.title.toLowerCase().includes(query) || b.href.toLowerCase().includes(query))
  })
  renderBookmarksListToPage()
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

      // delete old bookmark if privacy changed
      else if (bOriginal.private && !b.private) {
        await beaker.bookmarks.unbookmarkPrivate(b.href)
      } else if (!bOriginal.private && b.private) {
        await beaker.bookmarks.unbookmarkPublic(b.href)
      }

      // set the bookmark
      if (b.private) {
        await beaker.bookmarks.bookmarkPrivate(b.href, b)
      } else {
        beaker.bookmarks.bookmarkPublic(b.href, b)
      }

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

// internal helpers
// =

function findUsernameFor (origin) {
  if (!followedUserProfiles) return ''
  if (origin === userProfile._origin) return 'You'
  var p = followedUserProfiles.find(p => p._origin === origin)
  if (p) return p.name
  return ''
}