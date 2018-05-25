/* globals DatArchive beaker confirm */

import yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import * as toast from '../com/toast'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'
import toggleable from '../com/toggleable'
import * as createArchivePopup from '../com/create-archive-popup'
import * as contextMenu from '../com/context-menu'
import renderCloseIcon from '../icon/close'

// globals
// =

// archives, cached in memory
let archives = []
let selectedArchives = []
let query = ''
let currentView = 'all'
let currentSort = 'alpha'

// main
// =

setup()
async function setup () {
  await loadArchives()
  render()
}

// data
// =

async function loadArchives () {
  // read data
  switch (currentView) {
    case 'your archives':
      archives = await beaker.archives.list({
        isOwner: true,
        isSaved: true,
        search: query ? query : false
      })
      break
    case 'seeding':
      archives = await beaker.archives.list({
        isOwner: false,
        isSaved: true,
        search: query ? query : false
      })
      break
    case 'trash':
      archives = await beaker.archives.list({
        isOwner: true,
        isSaved: false
      })
      break
    default:
      archives = await beaker.archives.list({
        isSaved: true,
        search: query ? query : false
      })
      break
  }

  // apply search query
  filterArchives()

  // apply sort
  sortArchives()
}

function filterArchives () {
  if (query && query.length) {
    archives = archives.filter(a => {
      if (a.title && a.title.toLowerCase().includes(query)) {
        return a
      } else if (a.description && a.description.toLowerCase().includes(query)) {
        return a
      }
    })
  }
}

function sortArchives () {
  if (currentSort === 'recently-accessed') {
    archives = archives.sort((a, b) => b.lastLibraryAccessTime - a.lastLibraryAccessTime)
  } else if (currentSort === 'recently-updated') {
    archives = archives.sort((a, b) => b.mtime - a.mtime)
  } else if (currentSort === 'alpha') {
    archives = archives.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  }
}

// rendering
// =

function renderRows (sort = '', max = undefined) {
  let a = Array.from(archives)

  if (sort === 'recent') {
    a = a.filter(a => a.lastLibraryAccessTime > 0)
    a.sort((a, b) => b.lastLibraryAccessTime - a.lastLibraryAccessTime)
  }

  if (max) {
    a = a.slice(0, max)
  }

  if (!a.length) {
    return sort
    ? null
    : yo`
      <div class="view empty">
        <i class="fa fa-search"></i>

        <p>
          ${query
            ? `No results for "${query}"`
            : `No archives in ${currentView}`
          }
        </p>
      </div>`
  }
  return a.map(renderRow)
}

function renderRow (row, i) {
  const isOwner = row.isOwner
  const isMenuOpen = row.menuIsOpenIn === 'row'

  return yo`
    <a
      href="beaker://library/${row.url}"
      class="ll-row archive ${row.checked ? 'selected' : ''} ${isMenuOpen ? 'menu-open' : ''}"
      oncontextmenu=${e => onArchivePopupMenu(e, row, {isContext: true})}
    >
      <img class="favicon" src="beaker-favicon:${row.url}" />

      <span class="title">
        ${row.title || yo`<em>Untitled</em>`}
      </span>

      <span class="url">
        ${shortenHash(row.url)}
      </span>

      ${!isOwner ? yo`<span class="badge read-only">Read-only</span>` : ''}

      <div class="buttons">
        ${row.userSettings.isSaved
          ? yo`
            <button class="btn plain trash" onclick=${e => onDelete(e, row)} title=${removeFromLibraryLabel(row)}>
              <i class="fa fa-trash-o"></i>
            </button>`
          : yo`
            <button class="btn restore" onclick=${e => onRestore(e, row)}>
              <i class="fa fa-undo"></i>
              <span>Restore</span>
            </button>`
        }

        <button class="btn plain toggleable ${isMenuOpen ? 'pressed' : ''}" onclick=${e => onArchivePopupMenu(e, row, {xOffset: 7})}>
          <i class="fa fa-ellipsis-v"></i>
        </button>
      </div>

      <label class="checkbox">
        <input type="checkbox" checked=${!!row.checked} onclick=${(e) => onToggleChecked(e, row)}/>
        <i class="fa fa-check-circle"></i>
      </label>
    </div>
  `
}

function renderRecentArchives (sort = '', max = undefined) {
  let a = Array.from(archives)

  if (sort === 'recent') {
    a = a.filter(a => a.lastLibraryAccessTime > 0)
    a.sort((a, b) => b.lastLibraryAccessTime - a.lastLibraryAccessTime)
  }

  if (max) {
    a = a.slice(0, max)
  }

  if (!a.length) return ''
  return a.map(renderRecent)
}

function renderRecent (a) {
  const isOwner = a.isOwner
  const isMenuOpen = a.menuIsOpenIn === 'recent'

  return yo`
    <a
      href="beaker://library/${a.url}"
      class="ll-row archive recent ${isMenuOpen ? 'menu-open' : ''}"
      oncontextmenu=${e => onArchivePopupMenu(e, a, {isContext: true, isRecent: true})}
    >
      <img class="favicon" src="beaker-favicon:32,${a.url}" />

      ${!isOwner
        ? yo`<span class="badge read-only" title="Read-only"><i class="fa fa-eye"></i></span>`
        : ''
      }

      <div class="info">
        <div class="title">
          ${a.title || yo`<em>Untitled</em>`}
        </div>

        <span class="url">
          ${shortenHash(a.url)}
        </span>

        <button
          class="btn plain ${isMenuOpen ? 'pressed' : ''}"
          onclick=${e => onArchivePopupMenu(e, a, {isRecent: true, xOffset: 12})}
        >
          <i class="fa fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  `
}

function render () {
  let recentArchives
  if (!query && (currentView === 'all' || currentView === 'your archives')) {
    recentArchives = renderRecentArchives('recent', 8, 'recent')
  }

  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library builtin-wrapper">
        ${renderHeader()}

        <div class="builtin-main">
          ${renderSidebar()}

          <div>
            ${recentArchives ? [
              yo`<div class="subtitle-heading">Recent</div>`,
              yo`<div class="recent-archives">${recentArchives}</div>`
            ] : ''}

            <div class="subtitle-heading">
              ${query
                ? `"${query}" in ${currentView}`
                : currentView
              }

              ${currentView === 'trash'
                ? yo`
                  <button class="link" onclick=${onClearDatTrash}>
                    Empty Trash
                  </button>`
                : ''}

              ${currentView === 'seeding'
                ? yo`
                  <a href="beaker://settings#dat-network-activity" class="link">
                    Manage network activity
                  </a>`
                : ''}
            </div>

            ${renderRows()}

            ${!query
              ? yo`
                <p class="builtin-hint">
                  Your Library contains websites and archives you've created,
                  along with websites that you're seeding.
                  <i class="fa fa-question-circle-o"></i>
                </p>`
              : ''
            }
          </div>
        </div>
      </div>
    `
  )
}

function renderSidebar () {
  return yo`
    <div class="builtin-sidebar">
      <div class="section nav">
        <div onclick=${() => onUpdateView('all')} class="nav-item ${currentView === 'all' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          All
        </div>

        <div onclick=${() => onUpdateView('your archives')} class="nav-item ${currentView === 'your archives' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          Your archives
        </div>

        <div onclick=${() => onUpdateView('seeding')} class="nav-item ${currentView === 'seeding' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          Currently seeding
        </div>

        <div onclick=${() => onUpdateView('trash')} class="nav-item ${currentView === 'trash' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          Trash
        </div>
      </div>
    </div>`
}

function renderHeader () {
  let actions = ''
  let searchContainer = ''

  if (selectedArchives && selectedArchives.length) {
    actions = yo`
      <div class="actions">
        <button class="btn transparent" onclick=${onDeselectAll}>
          Deselect all
        </button>

        ${currentView === 'trash'
          ? yo`
            <button class="btn" onclick=${onRestoreSelected}>
              Restore selected
            </button>`
          : yo`
            <button class="btn warning" onclick=${onDeleteSelected}>
              ${currentView === 'seeding' ? 'Stop seeding' : 'Move to Trash'}
            </button>`
        }
      </div>`

    searchContainer = ''
  } else {
    actions = yo`
      <div class="actions">
        <button class="btn primary" onclick=${onNewArchive}>
          <span>New</span>
          <i class="fa fa-plus"></i>
        </button>
      </div>`

    searchContainer = yo`
      <div class="search-container">
        <input required autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your Library" type="text" class="search"/>

        <span onclick=${onClearQuery} class="close-btn">
          ${renderCloseIcon()}
        </span>

        <i class="fa fa-search"></i>

        <div class="filter-btn">
          ${toggleable(yo`
            <div class="dropdown toggleable-container">
              <button class="btn transparent toggleable">
                <i class="fa fa-filter"></i>
              </button>

              <div class="dropdown-items filters with-triangle compact subtle-shadow right">
                <div class="section">
                  <div class="section-header">Sort by:</div>

                  <div
                    class="dropdown-item ${currentSort === 'alpha' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('alpha')}
                  >
                    ${currentSort === 'alpha' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Alphabetical</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort === 'recently-accessed' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('recently-accessed')}
                  >
                    ${currentSort === 'recently-accessed' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently accessed</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort === 'recently-updated' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('recently-updated')}
                  >
                    ${currentSort === 'recently-updated' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently updated</span>
                  </div>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>`
  }

  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Library')}
      ${searchContainer}
      ${actions}
    </div>`
}

function removeFromLibraryLabel (archive) {
  return (archive.isOwner) ? 'Move to Trash' : 'Stop seeding'
}

function removeFromLibraryIcon (archive) {
  return (archive.isOwner) ? 'trash' : 'pause'
}

// events
// =

function onToggleChecked (e, row) {
  e.stopPropagation()
  row.checked = !row.checked
  selectedArchives = archives.filter(a => !!a.checked)
  render()
}

function onDeselectAll () {
  selectedArchives.forEach(a => { a.checked = false })
  selectedArchives = []
  render()
}

function onCopy (str, successMessage = 'URL copied to clipboard') {
  writeToClipboard(str)
  toast.create(successMessage)
}

async function onDeleteSelected () {
  const msg = currentView === 'seeding'
    ? `Stop seeding ${selectedArchives.length} ${pluralize(selectedArchives.length, 'archive')}?`
    : `Move ${selectedArchives.length} ${pluralize(selectedArchives.length, 'archive')} to Trash?`
  if (!confirm(msg)) {
    return
  }

  await Promise.all(selectedArchives.map(async a => {
    a.checked = false
    try {
      await beaker.archives.remove(a.url)
    } catch (e) {
      toast.create(`Could not move ${a.title || a.url} to Trash`, 'error')
    }
  }))
  selectedArchives = []

  await loadArchives()
  render()
}

async function onNewArchive (e) {
  e.preventDefault()
  e.stopPropagation()

  // let the user choose a template or folder
  var {template, folder} = await createArchivePopup.create()

  // create a new archive
  const archive = await DatArchive.create({template, prompt: false})
  if (folder) {
    await beaker.archives.setLocalSyncPath(archive.url, folder, {syncFolderToArchive: true})
  }
  window.location += archive.url + '#setup'
}

async function onMakeCopy (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  const fork = await DatArchive.fork(archive.url, {prompt: true}).catch(() => {})
  window.location = `beaker://library/${fork.url}#setup`
}

async function onDelete (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  const nickname = archive.title || 'Untitled'
  const msg = archive.isOwner
    ? `Move ${nickname} to Trash?`
    : `Stop seeding ${nickname}?`
  if (confirm(msg)) {
    try {
      await beaker.archives.remove(archive.url)
    } catch (e) {
      console.error(e)
      toast.create(`Could not move ${nickname} to Trash`, 'error')
    }
  }
  await loadArchives()
  render()
}

async function onDeletePermanently (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  const nickname = archive.title || 'Untitled'
  if (confirm(`Delete ${nickname} permanently?`)) {
    try {
      await beaker.archives.delete(archive.url)
    } catch (e) {
      console.error(e)
      toast.create(`Could not delete ${nickname}`, 'error')
    }
  }
  await loadArchives()
  render()
}

async function onRestoreSelected () {
  await Promise.all(selectedArchives.map(async a => {
    a.checked = false
    a.userSettings.isSaved = true
    await beaker.archives.add(a.url, {isSaved: true})
  }))

  selectedArchives = []
  await loadArchives()
  render()
}

async function onRestore (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  await beaker.archives.add(archive.url, {isSaved: true})
  await loadArchives()
  render()
}

async function onArchivePopupMenu (e, archive, {isRecent, isContext, xOffset} = {}) {
  xOffset = xOffset || 0
  e.preventDefault()
  e.stopPropagation()
  let x, y, parent

  if (isContext) {
    // position off the mouse
    x = e.clientX
    y = e.clientY
  } else {
    // append to the scrolling container so that the menu stays in the right position
    parent = document.querySelector('.window-content')

    // position off the element
    let rect = e.currentTarget.getClientRects()[0]
    x = rect.right
    y = getTop(e.currentTarget) + e.currentTarget.offsetHeight
  }
  x += xOffset

  if (!isContext) {
    // set the menu open (to keep button pressed while menu is open)
    archive.menuIsOpenIn = (isRecent) ? 'recent' : 'row'
    render()
  }

  // construct and show popup
  let items = [
    {icon: 'link', label: 'Copy URL', click: () => onCopy(archive.url) },
    {icon: 'external-link', label: 'Open in new tab', click: () => window.open(archive.url) },
    {icon: 'clone', label: 'Make a copy', click: () => onMakeCopy(null, archive) }
  ]
  if (isRecent) {
    items.push({icon: 'times', label: 'Remove from recent', click: () => removeFromRecent(archive)})
  }
  if (archive.userSettings.isSaved) {
    items.push({icon: removeFromLibraryIcon(archive), label: removeFromLibraryLabel(archive), click: () => onDelete(null, archive)})
  } else {
    items.push({icon: 'undo', label: 'Restore from trash', click: () => onRestore(null, archive)})
    items.push({icon: 'times-circle', label: 'Delete permanently', click: () => onDeletePermanently(null, archive)})
  }
  await contextMenu.create({x, y, items, parent, right: !isContext, withTriangle: !isContext})

  if (!isContext) {
    // set the menu closed
    archive.menuIsOpenIn = false
    render()
  }
}

async function removeFromRecent (archive) {
  await beaker.archives.touch(
    archive.url.slice('dat://'.length),
    'lastLibraryAccessTime',
    0 // set to zero
  )
  archive.lastLibraryAccessTime = 0
  render()
}

async function onUpdateSearchQuery (e) {
  var newQuery = e.target.value.toLowerCase()
  if (newQuery !== query) {
    query = newQuery
    await loadArchives()
    render()
  }
}

async function onClearQuery () {
  try {
    document.querySelector('input.search').value = ''
  } catch (_) {}

  query = ''
  await loadArchives()
  render()
}

function onUpdateSort (sort) {
  currentSort = sort
  sortArchives()
  render()
}

async function onClearDatTrash () {
  const results = await beaker.archives.clearGarbage({isOwner: true})
  console.debug('Dat trash cleared', results)
  toast.create(`Trash emptied (${bytes(results.totalBytes)} freed from ${results.totalArchives} archives)`, '', 5e3)
  await loadArchives()
  render()
}

async function onUpdateView (view) {
  // reset the search query
  query = ''
  try {
    document.querySelector('input.search').value = ''
  } catch (_) {}

  // reset selectedArchives
  selectedArchives = []

  currentView = view
  await loadArchives()
  render()

  // focus the search input
  document.querySelector('input.search').focus()
}

// helper gets the offsetTop relative to the document
function getTop (el) {
  let top = 0
  do {
    top += el.offsetTop
  } while ((el = el.offsetParent))
  return top
}
