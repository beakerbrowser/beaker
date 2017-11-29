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
let currentSort = 'recent'

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
    case 'offline':
      archives = await beaker.archives.list({
        isSaved: true,
        isNetworked: false
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

function renderRows () {
  if (!archives.length) return yo`<em class="empty">No archives</em>`
  return yo`<div>${archives.map(renderRow)}</div>`
}

function renderRow (row, i) {
  const isSeeding = row.userSettings && row.userSettings.networked
  const isSaved = row.userSettings && row.userSettings.isSaved
  const isOwner = row.isOwner

  return yo`
    <div class="row archive">
      <div>
        <img class="favicon" src="beaker-favicon:${row.url}" />

        <span class="info">
          <div>
            <a href=${row.url} class="title">
              ${row.title || yo`<em>Untitled</em>`}
            </a>

            <span class="status tooltip-container">
              <span class="circle ${isSeeding ? 'green' : 'red'}"></span>
              <span class="tooltip">${isSeeding ? 'Seeding' : 'Not seeding'} files</span>
            </a>

            ${!isOwner ? yo`<span class="badge read-only">Read-only</span>` : ''}
          </div>

          <div class="metadata">
            ${row.peers} ${pluralize(row.peers, 'peer')}
            <span class="bullet">•</span>
            ${prettyBytes(row.size)}
            <span class="bullet">•</span>
            <a href=${row.url} class="url">${shortenHash(row.url)}</a>
          </div>
        </span>
      </div>

      <div class="buttons">
        ${isSaved ? yo`
          <button class="btn transparent remove-archive" title="Delete archive" onclick=${e => {e.preventDefault(); e.stopPropagation(); onDeleteArchive(row.url, row.title || null);}}>
            <i class="fa fa-trash-o"></i>
          </button>`
        : ''}

        <button title="Copy URL" class="btn copy-url" onclick=${() => onCopy(row.url)}>
          <i class="fa fa-clipboard"></i>
        </button>

        ${isSaved ? yo`
          <button title="Edit" class="btn" onclick=${() => onClickEdit(row)}>
            <span>${isOwner ? 'Edit' : 'Fork & Edit'}</span>
            <i class="fa fa-pencil"></i>
          </button>`
        : yo`
          <button title="Restore" class="btn" onclick=${() => onClickRestore(row)}>
            Restore
            <i class="fa fa-undo"></i>
          </button>`
        }

        ${toggleable(yo`
          <div class="dropdown toggleable-container">
            <button class="btn transparent toggleable">
              <i class="fa fa-ellipsis-v"></i>
            </button>

            <div class="dropdown-items with-triangle right">
              <a href="beaker://library/${row.url}" target="_blank" class="dropdown-item">
                <i class="fa fa-file-code-o"></i>
                View files
              </a>

              <div class="dropdown-item" onclick=${() => onClickFork(row.url)}>
                <i class="fa fa-code-fork"></i>
                Fork
              </div>

              <div class="dropdown-item" onclick=${() => onToggleSeeding(row)}>
                <i class="fa fa-${isSeeding ? 'stop' : 'upload'}"></i>
                ${isSeeding ? 'Stop' : 'Start'} seeding files
              </div>

              <div class="dropdown-item" onclick=${() => onClickDownloadZip(row.url)}>
                <i class="fa fa-file-archive-o"></i>
                Download as .zip
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
    document.querySelector('.library2-wrapper'), yo`
      <div class="library2-wrapper builtin-wrapper">
        <div class="builtin-sidebar">
          <h1>Library</h1>
          <div class="section">
            <div onclick=${() => onUpdateView('all')} class="nav-item ${currentView === 'all' ? 'active' : ''}">
              All
            </div>

            <div onclick=${() => onUpdateView('seeding')} class="nav-item ${currentView === 'seeding' ? 'active' : ''}">
              Currently seeding
            </div>

            <div onclick=${() => onUpdateView('offline')} class="nav-item ${currentView === 'offline' ? 'active' : ''}">
              Offline
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

          ${renderRows()}
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

async function onToggleSeeding (archive) {
  const newNetworkedStatus = !archive.userSettings.networked

  const isSaved = archive.userSettings && archive.userSettings.isSaved
  const isOwner = archive.isOwner

  // don't unsave the archive if user is owner
  if (isOwner && isSaved) {
    var tmpArchive = new DatArchive(archive.url)

    try {
      await tmpArchive.configure({networked: newNetworkedStatus})
    } catch (e) {
      toast.create('Something went wrong', 'error')
      return
    }
  } else {
    // unsave if not owner and update the peer count
    if (isSaved) {
      await beaker.archives.remove(archive.url)
      archive.userSettings.isSaved = false
    } else {
      await beaker.archives.add(archive.url)
      archive.userSettings.isSaved = true
    }
  }

  // update the local archive data and re-render
  archive.userSettings.networked = newNetworkedStatus
  render()
}

async function onClickFork (url) {
  const fork = await DatArchive.fork(url, {prompt: true}).catch(() => {})
  window.location = fork.url
}

async function onClickEdit (archive) {
  let editableUrl = archive.url

  // if user is not the archive's owner, create an editable version
  if (!archive.isOwner) {
    const fork = await DatArchive.fork(archive.url, {prompt: false}).catch(() => {})
    editableUrl = fork.url
  }

  // fetch the workspace info
  let workspace = await beaker.workspaces.get(0, editableUrl)

  // if the archive doesn't already have a workspace attached to it, create one
  if (!workspace) {
    workspace = await beaker.workspaces.create(0, {publishTargetUrl: editableUrl})
  }

  window.location = `beaker://workspaces/${workspace.name}`
}

async function onClickRestore (archive) {
  await beaker.archives.add(archive.url, {isSaved: true})
  archive.userSettings.isSaved = true
  render()
}

function onClickDownloadZip (url) {
  beaker.browser.downloadURL(`${url}?download_as=zip`)
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