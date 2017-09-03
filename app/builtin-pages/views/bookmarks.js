/* globals beaker */

const yo = require('yo-yo')
import {getHostname} from '../../lib/strings'
import renderSidebar from '../com/sidebar'
import renderCloseIcon from '../icon/close'
import renderGlobeIcon from '../icon/globe'
import renderPinIcon from '../icon/pin'
import renderPadlockIcon from '../icon/padlock'
import renderStarFillIcon from '../icon/star-fill'
import renderTrashIcon from '../icon/trash'
import renderPencilIcon from '../icon/pencil'

// globals
//

var query = '' // current search query
var currentView = 'all'
var currentRenderingMode = ''
var bookmarks = []
var tags = []
var userProfile = null
var followedUserProfiles = null


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
    case 'all':
      {
        let publicBookmarks = await beaker.bookmarks.listPublicBookmarks({
          author: userProfile._origin
        })
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
  } else if (row.isEditing) {
    return renderRowEditing(row, i)
  } else {
    return renderRowDefault(row, i)
  }
}

function renderRowEditing (row, i) {
  return yo`
  <li class="ll-row editing ll-link bookmarks__row bookmarks__row--editing" data-row=${i}>
    <div class="link">
      <div class="inputs bookmarks__inputs">
        <input name="title" value=${row.editTitle} onkeyup=${onKeyUp(i)} />
        <input name="url" value=${row.editHref} onkeyup=${onKeyUp(i)} />
      </div>
    </div>
  </li>`
}

function renderRowDefault (row, i) {
  if (row.private || row._origin === userProfile._origin) {
    return renderRowEditable(row, i)
  } else {
    return renderRowUneditable(row, i)
  }
}

function renderRowExpanded (row, i) {
}

function renderRowGrid (row, i) {
  return yo`
    <li class="ll-row bookmarks__row grid" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="header">
          <span class="title bookmark__title">
            ${row.title.startsWith('dat://')
              ? yo`<em>Untitled</em>`
              : yo`${row.title}`
            }
          </span>
          <span class="url bookmark__url">${getHostname(row.href)}</span>
        </span>

        <div class="notes">${row.notes || yo`<em>No notes</em>`}</div>

        <div class="tags">
          ${row.tags.map(t => {
            const view = `tag:${t}`
            return yo`<span onclick=${(e) => {e.stopPropagation(); e.preventDefault(); onUpdateViewFilter(view);}} class="tag">${t}</span>`
          })}
        </div>
      </a>

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
    </li>`
}

function renderRowEditable (row, i) {
  return yo`
    <li class="ll-row bookmarks__row" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>
        <span class="url bookmark__url">${getHostname(row.href)}</span>
      </a>
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
    </li>`
}

function renderRowUneditable (row, i) {
  return yo`
    <li class="ll-row bookmarks__row" data-row=${i}>
      <a class="link bookmark__link" href=${row.href} title=${row.title} />
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>
        <span class="url bookmark__url">${row.href}</span>
      </a>
    </li>`
}

function renderBookmarksListToPage () {
  yo.update(
    document.querySelector('.links-list.bookmarks'),
    yo`
      <div class="links-list bookmarks ${bookmarksView}">
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
              <h2>Your bookmarks</h2>
              <div class="nav-item ${currentView === 'all' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('all')}>
                ${renderStarFillIcon()}
                All bookmarks
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

              <div class="view-controls">
                <span onclick=${() => onUpdateViewRendering('')}>list</span>
                <span onclick=${() => onUpdateViewRendering('grid')}>grid</span>
                <span onclick=${() => onUpdateViewRendering('expanded')}>expanded</span>
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

async function onUpdateViewRendering (mode) {
  currentRenderingMode = mode
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

function onClickEdit (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    // capture initial value
    bookmarks[i].editTitle = bookmarks[i].title
    bookmarks[i].editHref = bookmarks[i].href

    // enter edit-mode
    bookmarks[i].isEditing = true
    renderToPage()
    document.querySelector(`[data-row="${i}"] input`).focus()
  }
}

function onKeyUp (i) {
  return async e => {
    if (e.keyCode == 13) {
      // enter-key
      // capture the old url
      var oldUrl = bookmarks[i].href

      // update values
      bookmarks[i].title = document.querySelector(`[data-row="${i}"] [name="title"]`).value
      bookmarks[i].href = document.querySelector(`[data-row="${i}"] [name="url"]`).value

      // exit edit-mode
      bookmarks[i].isEditing = false
      renderToPage()

      // save in backend
      var b = bookmarks[i]
      if (b.private) {
        await beaker.bookmarks.bookmarkPrivate(oldUrl, {title: b.title, url: b.url})
      } else {
        await beaker.bookmarks.bookmarkPublic(oldUrl, {title: b.title, url: b.url})
      }
    } else if (e.keyCode == 27) {
      // escape-key
      // exit edit-mode
      bookmarks[i].isEditing = false
      renderToPage()
    } else {
      // all else
      // update edit values
      if (e.target.name == 'title') { bookmarks[i].editTitle = e.target.value }
      if (e.target.name == 'url') { bookmarks[i].editHref = e.target.value }
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