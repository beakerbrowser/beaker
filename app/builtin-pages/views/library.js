/* globals DatArchive beaker confirm localStorage */

import yo from 'yo-yo'
import bytes from 'bytes'
import {pluralize} from '../../lib/strings'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import {SITE_TEMPLATES, createSiteFromTemplate} from '../../lib/templates'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'
import * as toast from '../com/toast'
import toggleable from '../com/toggleable'
import * as contextMenu from '../com/context-menu'
import renderCloseIcon from '../icon/close'

// globals
// =

// archives, cached in memory
let archives = []
let selectedArchives = []
let query = ''
let currentView = 'all'
let currentSort = ['type', -1]
let currentDateType = 'accessed'
var currentUserSession

// main
// =

setup()
async function setup () {
  currentUserSession = await beaker.browser.getUserSession()
  loadSettings()
  await loadArchives()
  render()
}

async function resetup () {
  selectedArchives = []
  loadSettings() // load settings to restore from any temporary settings
  await loadArchives()
  render()
}

// data
// =

function loadSettings () {
  currentSort[0] = localStorage.currentSortValue || 'type'
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
    case 'trash':
      archives = await beaker.archives.list({
        isOwner: true,
        isSaved: false
      })
      break
    default:
      archives = await beaker.archives.list({
        isSaved: true,
        search: query ? query : false,
        type: currentView !== 'all' ? currentView : undefined // unless view == all, intrepret view as a type filter
      })
      break
  }

  // apply search query
  filterArchives()

  // apply sort
  sortArchives()

  console.log(archives)
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
    var v = 0
    switch (currentSort[0]) {
      case 'size': v = a.size - b.size; break
      case 'peers': v = a.peers - b.peers; break
      case 'recently-accessed': v = a.lastLibraryAccessTime - b.lastLibraryAccessTime; break
      case 'recently-updated': v = a.mtime - b.mtime; break
      case 'published': v = Number(a.isPublished) - Number(b.isPublished); break
      case 'owner': v = getOwner(b).localeCompare(getOwner(a)); break
    }
    if (v === 0) v = (b.title || '').localeCompare(a.title || '') // use title to tie-break
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
        <i class="${query ? 'fa fa-search' : 'far fa-folder-open'}"></i>

        <p>
          ${query
            ? `No results for "${query}"`
            : `No items found`
          }
        </p>
      </div>`
  }
  return a.map(renderRow)
}

function renderRow (row, i) {
  const isMenuOpen = row.menuIsOpenIn === 'row'
  const date = currentDateType === 'accessed'
    ? row.lastLibraryAccessTime
    : row.mtime

  return yo`
    <a
      href="${row.url}"
      class="ll-row archive ${row.checked ? 'selected' : ''} ${isMenuOpen ? 'menu-open' : ''}"
      oncontextmenu=${e => onArchivePopupMenu(e, row, {isContext: true})}
    >
      <span class="title">
        ${renderIcon(row)}
        ${row.title
          ? yo`<span class="title">${row.title}</span>`
          : yo`<span class="title empty"><em>Untitled</em></span>`
        }
      </span>

      <span class="owner">
        ${getOwner(row)}
      </span>

      <span class="type">
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

      <span class="published">
        ${getPublished(row)}
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
        <div class="builtin-main">
          ${renderSidebar()}

          <div>
            ${renderSubheader()}

            ${archives.length
              ? yo`
                <div class="ll-column-headings">
                  ${renderColumnHeading({cls: 'title', sort: 'alpha', label: 'Title'})}
                  ${renderColumnHeading({cls: 'owner', sort: 'owner', label: 'Owner'})}
                  ${renderColumnHeading({cls: 'type', sort: 'type', label: 'Type'})}
                  ${renderColumnHeading({cls: 'peers', sort: 'peers', label: 'Peers'})}
                  ${renderColumnHeading({cls: 'date', sort: `recently-${currentDateType}`, label: `Last ${currentDateType}`})}
                  ${renderColumnHeading({cls: 'size', sort: 'size', label: 'Size'})}
                  ${renderColumnHeading({cls: 'published', sort: 'published', label: 'Published?'})}
                  <span class="buttons"></span>
                </div>`
              : ''
            }

            ${renderRows()}

            <p class="builtin-hint">
              <i class="fa fa-info-circle"></i>
              Your Library contains websites and archives you${"'"}ve created,
              along with websites that you${"'"}re seeding.
            </p>
          </div>
        </div>
      </div>
    `
  )
}

function renderSidebar () {
  /**
   * @param {opts} [opts]
   */
  const navItem = ({onclick, isActive, label, icon}) => yo`
    <div onclick=${onclick} class="nav-item ${isActive ? 'active' : ''}">
      <i class="fa fa-angle-right"></i>
      ${icon ? yo`<img src="beaker://assets/img/templates/${icon}.png">` : ''}
      ${label}
    </div>`

  return yo`
    <div class="builtin-sidebar">
      ${renderBuiltinPagesNav('beaker://library/', 'Your Library')}
      <div class="section nav">
        ${navItem({
          onclick: () => onUpdateView('all'),
          isActive: currentView === 'all',
          label: 'All'
        })}
        ${navItem({
          onclick: () => onUpdateView('your archives'),
          isActive: currentView === 'your archives',
          label: 'Created by you'
        })}
        ${navItem({
          onclick: () => onUpdateView('trash'),
          isActive: currentView === 'trash',
          label: 'Trash'
        })}
        <hr>
        ${navItem({
          onclick: () => onUpdateView('user'),
          isActive: currentView === 'user',
          icon: 'user',
          label: 'People'
        })}
        ${navItem({
          onclick: () => onUpdateView('web-page'),
          isActive: currentView === 'web-page',
          icon: 'web-page',
          label: 'Web pages'
        })}
        ${navItem({
          onclick: () => onUpdateView('file-share'),
          isActive: currentView === 'file-share',
          icon: 'file-share',
          label: 'File shares'
        })}
        ${navItem({
          onclick: () => onUpdateView('image-collection'),
          isActive: currentView === 'image-collection',
          icon: 'image-collection',
          label: 'Image collections'
        })}
      </div>
    </div>`
}

function renderSubheader () {
  let actions = ''

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
              Move to Trash
            </button>`
        }
      </div>`
  } else {
    actions = yo`    
      <div class="actions">
        ${toggleable(yo`
          <div class="dropdown toggleable-container">
            <button class="btn primary toggleable">
              New +
            </button>

            <div class="dropdown-items with-triangle create-new subtle-shadow right">
              ${SITE_TEMPLATES.filter(t => !t.disabled).map(t => yo`
                <div class="dropdown-item" onclick=${e => onCreateSite(e, t.id)}>
                  <img src="beaker://assets/img/templates/${t.id}.png" />
                  ${t.title}
                </div>
              `)}
            </div>
          </div>
        `)}
      </div>`
  }

  return yo`
    <div class="builtin-subheader">
      <div class="search-container">
        <input required autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search your Library" type="text" class="search"/>

        <span onclick=${onClearQuery} class="close-btn">
          ${renderCloseIcon()}
        </span>

        <i class="fa fa-search"></i>
      </div>
      ${actions}
    </div>`
}

function renderIcon (archive) {
  return yo`<img class="favicon" src="beaker-favicon:32,${archive.url}" />`
}

function removeFromLibraryLabel (archive) {
  return (archive.isOwner) ? 'Move to Trash' : 'Stop seeding'
}

function removeFromLibraryIcon (archive) {
  return (archive.isOwner) ? 'fa fa-trash' : 'fa fa-pause'
}

function getPublished (archive) {
  return archive.isPublished ? yo`<span class="fas fa-check"></span>` : ''
}

function getOwner (archive) {
  return archive.isOwner ? 'me' : ''
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

async function onCreateSite (e, template) {
  // create a new archive
  window.location = await createSiteFromTemplate(template)
}

async function onPublish (archive) {
  try {
    var details = await beaker.browser.showShellModal('publish-archive', {url: archive.url, title: archive.title, description: archive.description})
    toast.create(`Published ${archive.title || archive.url}`, 'success')
    archive.title = details.title
    archive.description = details.description
    archive.isPublished = true
  } catch (err) {
    if (err.message === 'Canceled') return
    console.error(err)
    toast.create(err.toString(), 'error')
  }
  render()
}

async function onUnpublish (archive) {
  if (!confirm('Are you sure you want to unpublish this?')) {
    return
  }
  try {
    await beaker.archives.unpublish(archive.url)
    toast.create(`Unpublished ${archive.title || archive.url}`)
    archive.isPublished = false
  } catch (err) {
    console.error(err)
    toast.create(err.toString(), 'error')
  }
  render()
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
  const msg = `Move ${selectedArchives.length} ${pluralize(selectedArchives.length, 'item')} to Trash?`
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
    {icon: 'fa fa-external-link-alt', label: 'Open in new tab', click: () => window.open(archive.url)},
    {icon: 'fa fa-link', label: 'Copy URL', click: () => onCopy(archive.url)},
    {icon: 'code', label: 'View source', click: () => window.open(`beaker://editor/${archive.url}`)},
    {icon: 'fas fa-code', label: 'View site files', click: () => window.open(`beaker://library/${archive.url}`)}
  ]
  if (archive.isOwner) {
    if (archive.isPublished) {
      items.unshift({icon: 'fa fa-bullhorn', label: 'Published', click: () => {}, disabled: true})
      items.push({icon: 'fa fa-eraser', label: 'Unpublish', click: () => onUnpublish(archive)})
    } else {
      items.unshift({icon: 'fa fa-bullhorn', label: 'Publish', click: () => onPublish(archive)})
    }
  }
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

function onUpdateView (view) {
  currentView = view
  resetup()
}

// helper gets the offsetTop relative to the document
function getTop (el) {
  let top = 0
  do {
    top += el.offsetTop
  } while ((el = el.offsetParent))
  return top
}
