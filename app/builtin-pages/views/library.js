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

  if (!a.length) return yo`<em class="empty">No archives</em>`
  return a.map(renderRow)
}

function renderRow (row, i) {
  const isSeeding = row.userSettings && row.userSettings.networked
  const isSaved = row.userSettings && row.userSettings.isSaved
  const isOwner = row.isOwner

  return yo`
    <a href="beaker://library/${row.url}" class="ll-row archive">
      <img class="favicon" src="beaker-favicon:${row.url}" />

      <span class="title">
        ${row.title || yo`<em>Untitled</em>`}
      </span>

      <a href=${row.url} class="url">
        ${shortenHash(row.url)}
      </a>

      ${!isOwner ? yo`<span class="badge read-only">Read-only</span>` : ''}

      <div class="buttons">
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
  yo.update(
    document.querySelector('.library-wrapper'), yo`
      <div class="library-wrapper builtin-wrapper">
        <div class="builtin-sidebar">
          <h1>Library</h1>
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

          </div>

          <div>
            <div class="ll-sticky-heading">Recent</div>
            ${renderRows('recent', 10)}

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

function onCopy (str, successMessage = 'URL copied to clipboard') {
  writeToClipboard(str)
  toast.create(successMessage)
}

async function onDeleteArchive (url, title) {
  const nickname = title ? `"${title}"` : url
  if (confirm(`Delete ${nickname} from your Library?`)) {
    try {
      await beaker.archives.remove(url)
      await loadArchives()
      render()
    } catch (_) {
      toast.create(`Could not remove ${nickname} from your Library`, 'error')
    }
  }
}

async function onClickFork (url) {
  const fork = await DatArchive.fork(url, {prompt: true}).catch(() => {})
  window.location = fork.url
}

async function onClickRestore (archive) {
  await beaker.archives.add(archive.url, {isSaved: true})
  archive.userSettings.isSaved = true
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