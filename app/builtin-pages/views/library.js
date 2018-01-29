/* globals DatArchive beaker */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {pluralize, shortenHash} from '../../lib/strings'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import * as toast from '../com/toast'
import toggleable from '../com/toggleable'
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
    case 'seeding':
      archives = await beaker.archives.list({
        isNetworked: true
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
    <a href="beaker://library/${row.url}" class="ll-row archive ${row.checked ? 'selected' : ''}">
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
            <button class="btn small restore" onclick=${e => onRestore(e, row)}>
              <i class="fa fa-undo"></i>
              <span>Restore</span>
            </button>`
        }

        <input type="checkbox" checked=${!!row.checked} onclick=${(e) => onToggleChecked(e, row)}/>

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
    </div>
  `
}

function render () {
  let recentArchives = renderRows('recent', 10)
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper builtin-wrapper">
        <div class="builtin-sidebar">
          <h1 class="title-heading">Library</h1>
          <div class="section">
            <div onclick=${() => onUpdateView('all')} class="nav-item ${currentView === 'all' ? 'active' : ''}">
              All
            </div>

            <div onclick=${() => onUpdateView('trash')} class="nav-item ${currentView === 'trash' ? 'active' : ''}">
              Trash
            </div>
          </div>
        </div>

        <div class="builtin-main">
          <div class="builtin-header fixed">
            <div class="search-container">
              <input required autofocus onkeyup=${onUpdateSearchQuery} placeholder="Search" type="text" class="search"/>
              <span onclick=${onClearQuery} class="close-btn">
                ${renderCloseIcon()}
              </span>
              <i class="fa fa-search"></i>
            </div>

            ${selectedArchives && selectedArchives.length
              ? yo`
                <div>
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
              : ''
            }
          </div>

          <div>
            ${recentArchives ? [
              yo`<div class="ll-sticky-heading">Recent</div>`,
              recentArchives
            ] : ''}

            <div class="ll-sticky-heading">More stuffs</div>
            ${renderRows()}
          </div>
        </div>
      </div>
    `
  )
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
  e.stopPropagation()
  e.preventDefault()

  const nickname = archive.title || archive.url
  if (confirm(`Delete ${nickname} from your Library?`)) {
    try {
      await beaker.archives.remove(archive.url)
      await loadArchives()
      render()
    } catch (_) {
      toast.create(`Could not remove ${nickname} from your Library`, 'error')
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
  e.stopPropagation()
  e.preventDefault()

  await beaker.archives.add(archive.url, {isSaved: true})
  await loadArchives()
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