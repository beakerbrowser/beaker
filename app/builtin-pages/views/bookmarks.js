/* globals beaker */

const yo = require('yo-yo')
const co = require('co')
import renderSidebar from '../com/sidebar'
import renderCloseIcon from '../icon/close'
import renderGlobeIcon from '../icon/globe'
import renderHistoryIcon from '../icon/history'
import renderPinIcon from '../icon/pin'
import renderPadlockIcon from '../icon/padlock'
import renderStarFillIcon from '../icon/star-fill'
import renderTrashIcon from '../icon/trash'
import renderPencilIcon from '../icon/pencil'

// globals
//

// current search query
var query = ''
var currentViewFilter = ''

// bookmarks, cached in memory
var bookmarks = []
var privateBookmarks = []
var publicBookmarks = []
var filteredBookmarks = []

// main
// =

setup()
async function setup () {
  // get the bookmarks, ordered by # of views
  publicBookmarks = await beaker.bookmarks.listPublicBookmarks()
  privateBookmarks = await beaker.bookmarks.listPrivateBookmarks()

  bookmarks = publicBookmarks.concat(privateBookmarks)
  filteredBookmarks = bookmarks
  render()
}

// rendering
// =


const renderRow = (row, i) =>
  row.isEditing ? renderRowEditing(row, i) : renderRowDefault(row, i)

const renderRowEditing = (row, i) =>
  yo`
  <li class="ll-row editing ll-link bookmarks__row bookmarks__row--editing" data-row=${i}>
    <div class="link">
      <div class="inputs bookmarks__inputs">
        <input name="title" value=${row.editTitle} onkeyup=${onKeyUp(i)} />
        <input name="url" value=${row.editUrl} onkeyup=${onKeyUp(i)} />
      </div>
    </div>
  </li>`

const renderRowDefault = (row, i) =>
  yo`
    <li class="ll-row bookmarks__row" data-row=${i}>
      <a class="link bookmark__link" href=${row.url} title=${row.title} />
        <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.href} />
        <span class="title bookmark__title">
          ${row.title.startsWith('dat://')
            ? yo`<em>Untitled</em>`
            : yo`${row.title}`
          }
        </span>
        <span class="url bookmark__url">${row.url}</span>
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

function renderBookmarksList () {
  yo.update(
    document.querySelector('.links-list.bookmarks'),
    yo`
      <div class="links-list bookmarks">
        ${filteredBookmarks.length
          ? filteredBookmarks.map(renderRow)
          : yo`<em class="empty">No bookmarks</em>`
        }
      </div>
    `)
}

function render () {
  var helpEl = filteredBookmarks.length ? '' : yo`<em class="empty">No results</em>`

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
              <div class="nav-item ${currentViewFilter === '' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('')}>
                ${renderStarFillIcon()}
                All bookmarks
              </div>
              <div class="nav-item ${currentViewFilter === 'pinned' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('pinned')}>
                ${renderPinIcon()}
                Pinned
              </div>
              <div class="nav-item ${currentViewFilter === 'public' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('public')}>
                ${renderGlobeIcon()}
                Shared by you
              </div>
              <div class="nav-item ${currentViewFilter === 'private' ? 'active' : ''}" onclick=${() => onUpdateViewFilter('private')}>
                ${renderPadlockIcon()}
                Private
              </div>
            </div>

            <div class="section">
              <h2>Friends</h2>
              <div class="friend nav-item">
                <img src="https://pbs.twimg.com/profile_images/868195193253535744/yXQt-VYo_400x400.jpg"/>
                <span class="name">Paul Frazee</span>
              </div>
              <div class="friend nav-item">
                <img src="https://pbs.twimg.com/profile_images/706616363599532032/b5z-Hw5g_400x400.jpg"/>
                <span class="name">Max Ogden</span>
              </div>
              <div class="friend nav-item">
                <img src="https://pbs.twimg.com/profile_images/791404539517607936/eU8RPmL-_400x400.jpg"/>
                <span class="name">Karisa McKelvey</span>
              </div>
            </div>
          </div>

          <div class="builtin-main">
            <div class="builtin-header">
              <div class="search-container">
                <input required autofocus onkeyup=${onFilterBookmarks} placeholder="Search bookmarks" type="text" class="search"/>
                <span onclick=${onClearQuery} class="close-container">
                  ${renderCloseIcon()}
                </span>
              </div>
            </div>

            ${currentViewFilter !== ''
              ? yo`
                <div class="bookmarks-breadcrumbs">
                  <span onclick=${() => onUpdateViewFilter('all')} class="breadcrumb">
                    All bookmarks
                  </span>
                  <span class="breadcrumb">
                    ${currentViewFilter.charAt(0).toUpperCase() + currentViewFilter.slice(1)} bookmarks
                  </span>
                </div>`
              : ''}

            <div class="links-list bookmarks">
              ${filteredBookmarks.map(renderRow)}
              ${helpEl}
            </div>
          </div>
        </div>`)
}

// event handlers
// =

function onUpdateViewFilter (filter) {
  currentViewFilter = filter || ''

  if (!filter) filteredBookmarks = bookmarks
  else if (filter === 'pinned') filteredBookmarks = bookmarks.filter(b => b.pinned)
  else if (filter === 'public') filteredBookmarks = bookmarks.filter(b => !b.private)
  else if (filter === 'private') filteredBookmarks = bookmarks.filter(b => b.private)
  else filteredBookmarks = bookmarks
  render()
}

function onClearQuery () {
  document.querySelector('input.search').value = ''
  query = ''
  filteredBookmarks = bookmarks
  render()
}

function onFilterBookmarks (e) {
  query = e.target.value.toLowerCase()
  filteredBookmarks = bookmarks.filter(b => {
    return b.title.toLowerCase().includes(query) || b.href.toLowerCase().includes(query)
  })

  renderBookmarksList()
}

async function onTogglePinned (i) {
  var b = bookmarks[i]
  bookmarks[i].pinned = !b.pinned
  await beaker.bookmarks.setBookmarkPinned(b.href, bookmarks[i])
  render()
}

function onClickEdit (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    // capture initial value
    bookmarks[i].editTitle = bookmarks[i].title
    bookmarks[i].editUrl = bookmarks[i].url

    // enter edit-mode
    bookmarks[i].isEditing = true
    render()
    document.querySelector(`[data-row="${i}"] input`).focus()
  }
}

function onKeyUp (i) {
  return e => {
    if (e.keyCode == 13) {
      // enter-key
      // capture the old url
      var oldUrl = bookmarks[i].url

      // update values
      bookmarks[i].title = document.querySelector(`[data-row="${i}"] [name="title"]`).value
      bookmarks[i].url = document.querySelector(`[data-row="${i}"] [name="url"]`).value

      // exit edit-mode
      bookmarks[i].isEditing = false
      render()

      // save in backend
      beaker.bookmarks.changeTitle(oldUrl, bookmarks[i].title)
      beaker.bookmarks.changeUrl(oldUrl, bookmarks[i].url)
    } else if (e.keyCode == 27) {
      // escape-key
      // exit edit-mode
      bookmarks[i].isEditing = false
      render()
    } else {
      // all else
      // update edit values
      if (e.target.name == 'title') { bookmarks[i].editTitle = e.target.value }
      if (e.target.name == 'url') { bookmarks[i].editUrl = e.target.value }
    }
  }
}

function onClickDelete (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    // delete bookmark
    var b = bookmarks[i]
    bookmarks.splice(i, 1)
    if (b.private) {
      beaker.bookmarks.unbookmarkPrivate(b.href)
    } else {
      beaker.bookmarks.unbookmarkPublic(b.href)
    }
    render()
  }
}
