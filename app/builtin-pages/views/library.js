/* globals DatArchive beaker confirm localStorage */

import yo from 'yo-yo'
import bytes from 'bytes'
import moment from 'moment'
import {pluralize, shortenHash} from '../../lib/strings'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import * as toast from '../com/toast'
import renderBuiltinPagesHeader from '../com/builtin-pages-header'
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
let currentView = 'your archives'
let currentSort = ['alpha', -1]
let currentDateType = 'accessed'
let faviconCacheBuster = Date.now()
let currentUserSession = null

// main
// =

setup()
async function setup () {
  loadSettings()
  currentUserSession = await beaker.browser.getUserSession()
  await loadArchives()
  render()
}

// data
// =

function loadSettings () {
  currentSort[0] = localStorage.currentSortValue || 'alpha'
  currentSort[1] = (+localStorage.currentSortDir) || -1
  currentDateType = localStorage.currentDateType || 'accessed'
}

function saveSettings () {
  localStorage.currentSortValue = currentSort[0]
  localStorage.currentSortDir = currentSort[1]
  localStorage.currentDateType = currentDateType
}

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
    case 'recent':
      archives = await beaker.archives.list({
        search: query ? query : false
      })
      // only archives that have been recently visited in the library
      archives = archives.filter(a => !!a.lastLibraryAccessTime)
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
      } else if (a.url && a.url.toLowerCase().includes(query)) {
        return a
      }
    })
  }
}

function sortArchives () {
  archives.sort((a, b) => {
    var v
    switch (currentSort[0]) {
      case 'size': v = a.size - b.size; break
      case 'peers': v = a.peers - b.peers; break
      case 'recently-accessed': v = a.lastLibraryAccessTime - b.lastLibraryAccessTime; break
      case 'recently-updated': v = a.mtime - b.mtime; break
      case 'alpha':
      default:
        v = (b.title || '').localeCompare(a.title || '')
    }
    return v * currentSort[1]
  })
}

// rendering
// =

function renderColumnHeading ({label, cls, sort}) {
  const icon = currentSort[0] === sort
    ? currentSort[1] > 0
      ? yo`<span class="fa fa-angle-up"></span>`
      : yo`<span class="fa fa-angle-down"></span>`
    : ''

  return yo`
    <div class="column-heading ${cls}">
      <button class="nofocus" onclick=${e => onUpdateSort(sort)}>
        ${label}
      </button>
      ${icon}
    </div>
  `
}

function renderRows (sort = '', max = undefined) {
  let a = Array.from(archives)

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
  const date = currentDateType === 'accessed'
    ? row.lastLibraryAccessTime
    : row.mtime

  return yo`
    <a
      href="beaker://library/${row.url}"
      class="ll-row archive ${row.checked ? 'selected' : ''} ${isMenuOpen ? 'menu-open' : ''}"
      oncontextmenu=${e => onArchivePopupMenu(e, row, {isContext: true})}
    >
      <span class="title">
        <img class="favicon" src="beaker-favicon:32,${row.url}?cache=${faviconCacheBuster}" />

        ${row.title
          ? yo`<span class="title">${row.title}</span>`
          : yo`<span class="title empty"><em>Untitled</em></span>`
        }

        ${!isOwner
          ? yo`<span class="badge read-only">Read-only</span>`
          : ''
        }
      </span>

      <span class="peers">
        ${row.peers ? `${row.peers} ${pluralize(row.peers, 'peer')}` : '--'}
      </span>

      <span class="date">
        ${date ? niceDate(date) : '--'}
      </span>

      <span class="size">
        ${bytes(row.size)}
      </span>

      <div class="buttons">
        ${row.userSettings.isSaved
          ? yo`
            <button class="btn plain trash" onclick=${e => onDelete(e, row)} title=${removeFromLibraryLabel(row)}>
              <i class="fas fa-trash"></i>
            </button>`
          : yo`
            <button class="btn plain restore" onclick=${e => onRestore(e, row)} title="Restore from trash">
              <i class="fa fa-undo"></i>
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

function render () {
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library builtin-wrapper">
        ${renderHeader()}

        <div class="builtin-main">
          ${renderSidebar()}

          <div>
            ${archives.length
              ? yo`
                <div class="ll-column-headings">
                  ${renderColumnHeading({cls: 'title', sort: 'alpha', label: 'Title'})}
                  ${renderColumnHeading({cls: 'peers', sort: 'peers', label: 'Peers'})}
                  ${renderColumnHeading({cls: 'date', sort: `recently-${currentDateType}`, label: `Last ${currentDateType}`})}
                  ${renderColumnHeading({cls: 'size', sort: 'size', label: 'Size'})}
                  <span class="buttons"></span>
                </div>`
              : ''
            }

            ${renderRows()}

            <p class="builtin-hint">
              <i class="fa fa-info-circle"></i>
              Your Library contains websites and archives you've created,
              along with websites that you're seeding.
            </p>
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

        <div onclick=${() => onUpdateView('recent')} class="nav-item ${currentView === 'recent' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          Recent
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
        <button class="btn transparent" onclick=${onSelectAll}>
          Select all
        </button>
        |
        <button class="btn transparent" onclick=${onDeselectAll}>
          Deselect all
        </button>

        ${currentView === 'trash'
          ? [
              yo`
                <button class="btn" onclick=${onRestoreSelected}>
                  Restore selected
                </button>`,
              ' ',
              yo`
                <button class="btn warning" onclick=${onDeleteSelectedPermanently}>
                  Delete permanently
                </button>`
            ]
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
        ${toggleable(yo`
          <div class="dropdown toggleable-container">
            <button class="btn primary toggleable">
              <span>New</span>
              <i class="fa fa-plus"></i>
            </button>
            <div class="dropdown-items create-new filters subtle-shadow right">
              <div class="dropdown-item" onclick=${() => onCreateSite()}>
                <div class="label">
                  <i class="far fa-clone"></i>
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
                  <i class="far fa-folder"></i>
                  From folder
                </div>
                <p class="description">
                  Create a new project from a folder on your computer
                </p>
              </div>
            </div>
          </div>
        `)}
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
                    class="dropdown-item ${currentSort[0] === 'alpha' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('alpha')}
                  >
                    ${currentSort[0] === 'alpha' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Alphabetical</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'recently-accessed' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('recently-accessed')}
                  >
                    ${currentSort[0] === 'recently-accessed' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently accessed</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'recently-updated' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('recently-updated')}
                  >
                    ${currentSort[0] === 'recently-updated' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Recently updated</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'size' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('size')}
                  >
                    ${currentSort[0] === 'size' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Archive size</span>
                  </div>

                  <div
                    class="dropdown-item ${currentSort[0] === 'peers' ? 'active' : ''}"
                    onclick=${() => onUpdateSort('peers')}
                  >
                    ${currentSort[0] === 'peers' ? yo`<i class="fa fa-check"></i>` : yo`<i></i>`}
                    <span class="description">Peer count</span>
                  </div>
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>`
  }

  return renderBuiltinPagesHeader('Library', currentUserSession)
  // TODO replace fully
  // return yo`
  //   <div class="builtin-header fixed">
  //     ${renderBuiltinPagesHeader('Library')}
  //     ${searchContainer}
  //     ${actions}
  //   </div>`
}

function removeFromLibraryLabel (archive) {
  return (archive.isOwner) ? 'Move to Trash' : 'Stop seeding'
}

function removeFromLibraryIcon (archive) {
  return (archive.isOwner) ? 'fa fa-trash' : 'fa fa-pause'
}

// events
// =

function onToggleChecked (e, row) {
  e.stopPropagation()
  row.checked = !row.checked
  selectedArchives = archives.filter(a => !!a.checked)
  render()
}

function onSelectAll () {
  selectedArchives = archives.slice()
  selectedArchives.forEach(a => { a.checked = true })
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
  window.location += archive.url + '#setup'
}

async function onCreateSite (template) {
  // create a new archive
  const archive = await DatArchive.create({template, prompt: false})
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

async function onDeleteSelectedPermanently () {
  if (!confirm(`Delete ${selectedArchives.length} ${pluralize(selectedArchives.length, 'archive')} permanently?`)) {
    return
  }

  await Promise.all(selectedArchives.map(async a => {
    try {
      await beaker.archives.delete(a.url)
    } catch (e) {
      console.error(e)
      toast.create(`Could not delete ${a.title || a.url}`, 'error')
    }
  }))
  selectedArchives = []

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

async function onArchivePopupMenu (e, archive, {isContext, xOffset} = {}) {
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
    archive.menuIsOpenIn = 'row'
    render()
  }

  // construct and show popup
  let items = [
    {icon: 'fa fa-link', label: 'Copy URL', click: () => onCopy(archive.url)},
    {icon: 'fa fa-external-link-alt', label: 'Open in new tab', click: () => window.open(archive.url)},
    {icon: 'far fa-clone', label: 'Make a copy', click: () => onMakeCopy(null, archive)},
    {icon: 'fa fa-cog', label: 'Settings', click: () => window.open(`beaker://library/${archive.url}#settings`)}
  ]
  if (archive.userSettings.isSaved) {
    items.push({icon: removeFromLibraryIcon(archive), label: removeFromLibraryLabel(archive), click: () => onDelete(null, archive)})
  } else {
    items.push({icon: 'fa fa-undo', label: 'Restore from trash', click: () => onRestore(null, archive)})
    items.push({icon: 'fa fa-times-circle', label: 'Delete permanently', click: () => onDeletePermanently(null, archive)})
  }
  await contextMenu.create({x, y, items, parent, right: !isContext, withTriangle: !isContext})

  if (!isContext) {
    // set the menu closed
    archive.menuIsOpenIn = false
    render()
  }
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

function onUpdateSort (sort, direction = false, {noSave} = {}) {
  if (sort === 'recently-accessed') {
    currentDateType = 'accessed'
  } else if (sort === 'recently-updated') {
    currentDateType = 'updated'
  }
  if (!direction) {
    // invert the direction if none is provided and the user toggled same sort
    direction = (currentSort[0] === sort) ? (currentSort[1] * -1) : -1
  }
  currentSort[0] = sort
  currentSort[1] = direction
  if (!noSave) {
    saveSettings()
  }
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
  loadSettings() // load settings to restore from any temporary settings
  await loadArchives()
  render()

  if (view === 'recent') {
    // sort by recently viewed, dont save (temporary for this view)
    onUpdateSort('recently-accessed', -1, {noSave: true})
  }

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
