/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import * as toast from '../com/toast'
import renderBuiltinPagesNav from '../com/builtin-pages-nav'
import toggleable from '../com/toggleable'
import * as contextMenu from '../com/context-menu'
import renderCloseIcon from '../icon/close'

// globals
// =

// archives, cached in memory
let archives = []
let selectedArchives = []
let query = ''
let currentView = 'your archives'
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

  // attach extra data to each archive
  // archives = await Promise.all(archives.map(async a => {
  //   const workspace = await beaker.workspaces.get(0, a.url)
  //   if (workspace) a.workspaceName = workspace.name
  //   return a
  // }))

  // apply sort
  sortArchives()
}

function filterArchives () {
  if (query && query.length) {
    archives = archives.filter(a => {
      if (a.title && a.title.toLowerCase().includes(query)) {
        return a
      }
      else if (a.description && a.description.toLowerCase().includes(query)) {
        return a
      }
    })
  }
}

function sortArchives () {
  if (currentSort === 'recent') {
    archives = archives.sort((a, b) => b.createdAt - a.createdAt)
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

  if (!a.length) return sort ? null : yo`<em class="empty">No archives</em>`
  return a.map(renderRow)
}

function renderRow (row, i) {
  const isSeeding = row.userSettings && row.userSettings.networked
  const isSaved = row.userSettings && row.userSettings.isSaved
  const isOwner = row.isOwner

  return yo`
    <a
      href="beaker://library/${row.url}"
      class="ll-row archive ${row.checked ? 'selected' : ''}"
      oncontextmenu=${e => onArchiveContextMenu(e, row, false)}
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
            <button class="btn small transparent trash" onclick=${e => onDelete(e, row)} title="Move to Trash">
              <i class="fa fa-trash-o"></i>
            </button>`
          : yo`
            <button class="btn restore" onclick=${e => onRestore(e, row)}>
              <i class="fa fa-undo"></i>
              <span>Restore</span>
            </button>`
        }

        ${toggleable(yo`
          <div class="dropdown toggleable-container">
            <button class="btn transparent toggleable">
              <i class="fa fa-ellipsis-v"></i>
            </button>

            <div class="dropdown-items with-triangle right">
              <div class="dropdown-item" onclick=${() => {e.stopPropagation(); onCopy(row.url); }}>
                <i class="fa fa-link"></i>
                Copy URL
              </div>

              <div class="dropdown-item" onclick=${() => onClickFork(row.url)}>
                <i class="fa fa-code-fork"></i>
                Fork
              </div>
            </div>
          </div>
        `)}
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
  const isSeeding = a.userSettings && a.userSettings.networked
  const isSaved = a.userSettings && a.userSettings.isSaved
  const isOwner = a.isOwner

  return yo`
    <a
      href="beaker://library/${a.url}"
      class="ll-row archive recent"
      oncontextmenu=${e => onArchiveContextMenu(e, a, true)}
    >
      <div class="title">
        ${a.title || yo`<em>Untitled</em>`}
      </div>

      <img class="favicon" src="beaker-favicon:${a.url}" />

      <span class="url">
        ${shortenHash(a.url)}
      </span>
    </div>
  `
}

function render () {
  let recentArchives = renderRecentArchives('recent', 10, 'recent')

  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper library builtin-wrapper">
        ${renderHeader()}

        <div class="builtin-main">
          ${renderSidebar()}

          <div>
            ${recentArchives && currentView !== 'trash' ? [
              yo`<div class="subtitle-heading">Recent</div>`,
              yo`<div class="recent-archives">${recentArchives}</div>`
            ] : ''}

            <div class="subtitle-heading">${currentView}</div>
            ${renderRows()}

            <p class="builtin-hint">
              Your Library contains websites and archives you've created,
              along with websites that you're seeding.
              <i class="fa fa-question-circle-o"></i>
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

        <div onclick=${() => onUpdateView('trash')} class="nav-item ${currentView === 'trash' ? 'active' : ''}">
          <i class="fa fa-angle-right"></i>
          Trash
        </div>
      </div>
    </div>`
}

function renderHeader () {
  return yo`
    <div class="builtin-header fixed">
      ${renderBuiltinPagesNav('Library')}

      ${selectedArchives && selectedArchives.length
        ? yo`
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
                  Remove selected
                </button>`
            }
          </div>`
        : yo`
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

                      <div class="dropdown-item active">
                        <i class="fa fa-check"></i>
                        <span class="description">Alphabetical</span>
                      </div>

                      <div class="dropdown-item">
                        <i></i>
                        <span class="description">Recently accessed</span>
                      </div>

                      <div class="dropdown-item">
                        <i></i>
                        <span class="description">Recently updated</span>
                      </div>
                    </div>

                    <div class="section">
                      <div class="section-header">Filters:</div>

                      <div class="dropdown-item active">
                        <i class="fa fa-check-square"></i>
                        <span class="description">Currently seeding</span>
                      </div>

                      <div class="dropdown-item">
                        <i class="fa fa-square-o"></i>
                        <span class="description">Editable</span>
                      </div>

                      <div class="dropdown-item">
                        <i class="fa fa-square-o"></i>
                        <span class="description">Saved for offline</span>
                      </div>
                    </div>
                  </div>
                </div>
              `)}
            </div>
          </div>`
      }
    </div>`
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
  selectedArchives.forEach(a => a.checked = false)
  selectedArchives = []
  render()
}

function onCopy (str, successMessage = 'URL copied to clipboard') {
  writeToClipboard(str)
  toast.create(successMessage)
}

async function onDeleteSelected () {
  if (!confirm(`Remove ${selectedArchives.length} ${pluralize(selectedArchives.length, 'archive')} from your Library?`)) {
    return
  }

  await Promise.all(selectedArchives.map(async a => {
    a.checked = false
    try {
      await beaker.archives.remove(a.url)
    } catch (e) {
      toast.create(`Could not remove ${a.title || a.url} from your Library`, 'error')
    }
  }))
  selectedArchives = []

  await loadArchives()
  render()
}

async function onDelete (e, archive) {
  if (e) {
    e.stopPropagation()
    e.preventDefault()
  }

  const nickname = archive.title || archive.url
  if (confirm(`Move ${nickname} to Trash?`)) {
    try {
      await beaker.archives.remove(archive.url)
      await loadArchives()
      render()
    } catch (_) {
      toast.create(`Could not move ${nickname} to Trash`, 'error')
    }
  }
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

function onArchiveContextMenu (e, archive, isRecent) {
  e.preventDefault()
  let items = [
    {icon: 'external-link', label: 'Open site in new tab', click: () => window.open(archive.url) },
    {icon: 'link', label: 'Copy URL', click: () => onCopy(archive.url) },
    {icon: 'code-fork', label: 'Fork', click: () => onClickFork(archive.url) }
  ]
  if (archive.userSettings.isSaved) {
    items.push({icon: 'trash', label: 'Delete', click: () => onDelete(null, archive)})
  } else {
    items.push({icon: 'undo', label: 'Restore from trash', click: () => onRestore(null, archive)})
  }
  if (isRecent) {
    items.push({icon: 'times', label: 'Remove from recent', click: () => removeFromRecent(archive)})
  }
  contextMenu.create({x: e.clientX, y: e.clientY, items})
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
  document.querySelector('input.search').value = ''
  query = ''
  await loadArchives()
  render()
}

async function onUpdateView (view) {
  // reset the search query
  query = ''
  document.querySelector('input.search').value = ''

  // reset selectedArchives
  selectedArchives = []

  currentView = view
  await loadArchives()
  render()

  // focus the search input
  document.querySelector('input.search').focus()
}

function onScrollContent (e) {
  if (isAtEnd) { return }

  var el = e.target
  if (el.offsetHeight + el.scrollTop + BEGIN_LOAD_OFFSET >= el.scrollHeight) {
    // hit bottom
    fetchMore(renderAndAppendRows)
  }
}