import * as yo from 'yo-yo'
import {Archive, ArchivesList} from 'builtin-pages-lib'
import {pluralize} from '../../lib/strings'
import renderGraph from '../com/peer-history-graph'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import toggleable, {closeAllToggleables} from '../com/toggleable'

// globals
// =

var userProfileUrl
var archivesList
var trashList = []
var isTrashOpen = false
var currentFilter = ''
var currentSort = ''
var selectedArchiveKey = ''
var selectedArchive

setup()
async function setup () {
  // load archives
  archivesList = new ArchivesList({listenNetwork: true})
  await archivesList.setup({isSaved: true})
  userProfileUrl = (await beaker.profiles.get(0)).url
  update()

  // load deleted archives
  trashList = await beaker.archives.list({isSaved: false})
  update()

  // render graph regularly
  setInterval(() => {
    if (selectedArchive) {
      updateGraph(selectedArchive)
    }
  }, 5e3)

  // setup handlers
  archivesList.addEventListener('changed', update)
}

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
    <div class="sidebar">
      <div class="sidebar-actions">
        <label for="filter">
          <input
            class="filter"
            name="filter"
            placeholder="Filter"
            type="text"
            value=${currentFilter || ''}
            onkeyup=${onChangeFilter}/>
          <button onclick=${onClearFilter} class="clear-filter ${currentFilter ? 'visible' : ''}">
            <i class="fa fa-close"></i>
          </button>
        </label>

        <div class="sort">
          <label for="sort">Sort by</label>
          <select name="sort" oninput=${onChangeSort}>
            <option value="alphabetical" selected=${currentSort === 'alphabetical'}>
              Name
            </option>
            <option value="mtime" selected=${currentSort === 'mtime'}>
              Recently updated
            </option>
            <option value="peers" selected=${currentSort === 'peers'}>
              Active peers
            </option>
          </select>
        </div>
      </div>

      <div class="archives-list">${rArchivesList()}</div>

      <div class="trash-controls">
        <button onclick=${onToggleTrash}>${isTrashOpen ? 'Close Trash' : 'Show Trash'}
          <i class="fa ${isTrashOpen ? 'fa-close' : 'fa-trash'}"></i>
        </button>
      </div>
    </div>

    <div class="view">
      ${rView()}
    </div>
    </main>
  `)
}

function rView () {
  if (isTrashOpen) return rTrash()
  else if (selectedArchiveKey) return rArchive(selectedArchive)
  return ''
}

async function onSelectArchive () {
  // close the trash if necessary
  if (isTrashOpen) isTrashOpen = false

  selectedArchiveKey = this.dataset.key
  selectedArchive = archivesList.archives.find(archive => archive.key === selectedArchiveKey)
  selectedArchive.history = (await (new DatArchive(selectedArchiveKey)).history())

  // sort history in descending order
  selectedArchive.history.reverse()

  update()
}

function rArchivesList () {
  // apply filter
  var filteredArchives = archivesList.archives.filter(archive => {
    if (!currentFilter) {
      return true
    }
    else if (currentFilter && archive.title.toLowerCase().indexOf(currentFilter) !== -1) {
      return true
    }
    return false
  })

  // sort
  filteredArchives.sort((a, b) => {
    if (!currentSort && a.url === userProfileUrl) return -1
    if (!currentSort && b.url === userProfileUrl) return 1

    if (currentSort === 'alphabetical') return niceName(a).localeCompare(niceName(b))
    if (currentSort === 'mtime') return b.mtime - a.mtime
    if (currentSort === 'peers') return b.peers - a.peers
  })

  return filteredArchives.map(rArchiveListItem)
}

function rArchiveListItem (archiveInfo) {
  var cls = archiveInfo.key === selectedArchiveKey ? 'active' : ''
  var icon = ''

  if (archiveInfo.url === userProfileUrl) {
    icon = yo`<i class="fa fa-user"></i>`
  }

  return yo`
    <div class="archive ${cls}" data-key=${archiveInfo.key} onclick=${onSelectArchive}>
      <div class="title">
        ${icon}
        ${niceName(archiveInfo)}
        ${archiveInfo.isOwner ? '' : yo`<i class="readonly fa fa-eye"></i>`}
      </div>
      <a class="editor-link" onclick=${e => e.stopPropagation()} href="beaker://editor/${archiveInfo.key}">Edit</a>
      <span class="last-updated">Updated ${niceDate(archiveInfo.mtime)}</span>
      <span class="peers">
        <i class="fa fa-share-alt"></i>
        ${archiveInfo.peers}
      </span>
    </div>
  `
}

function rArchive (archiveInfo) {
  var toggleSaveIcon, toggleSaveText
  if (archiveInfo.userSettings.isSaved) {
    toggleSaveIcon = 'fa-trash'
    toggleSaveText = 'Remove from library'
  } else {
    toggleSaveIcon = 'fa-floppy-o'
    toggleSaveText = 'Save to library'
  }

  return yo`
    <div class="archive">
      <div class="info">
        <h1 class="title" title=${archiveInfo.title}>
          <a href="dat://${archiveInfo.key}">${archiveInfo.title}</a>
          ${archiveInfo.isOwner ? '' : yo`<i class="readonly fa fa-eye"></i>`}
        </h1>
        <p class="description">${niceDesc(archiveInfo)}</p>
        <div class="actions">
          <span class="readonly">${archiveInfo.isOwner ? '' : yo`<em>(Read-only)</em>`}</span>
          <a class="editor-link btn primary" href="beaker://editor/${archiveInfo.key}">
            <i class="fa fa-pencil"></i>
            Open in editor
          </a>
          ${toggleable(yo`
            <div class="dropdown-btn-container toggleable-container">
              <button class="btn toggleable">
                <i class="fa fa-caret-down"></i>
              </button>
              <div class="dropdown-btn-list">
                <a class="dropdown-item" href="dat://${archiveInfo.key}">
                  <i class="fa fa-external-link"></i>
                  View site
                </a>
                <div class="dropdown-item" onclick=${e => onToggleSaved(e, archiveInfo)}>
                  <i class="fa ${toggleSaveIcon}"></i>
                  ${toggleSaveText}
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <h2>Network activity</h2>
      <div class="peer-history">
        ${renderGraph(archiveInfo)}
      </div>

      <h2>Metadata</h2>
      <div class="metadata">
        <table>
          <tr><td class="label">Size</td><td>${prettyBytes(archiveInfo.size)}</td></tr>
          <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime)}</td></tr>
          <tr><td class="label">Files</td><td>300</td></tr>
          <tr><td class="label">URL</td><td>dat://${archiveInfo.key}</td></tr>
          <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
        </table>
      </div>

      <h2>History</h2>
      <div class="history">
        ${rArchiveHistory(archiveInfo)}
      </div>
    </div>
  `
}

function rArchiveHistory (archiveInfo) {
  var rowEls = []
  archiveInfo.history.forEach(item => {
    var date = item.value ? niceDate(item.value.mtime) : ''
    var size = item.value ? `(${prettyBytes(item.value.size)})` : ''
    rowEls.push(yo`
      <li class="history-item">
        <span class="date">${date}</span>
        ${item.type}
        ${item.name}
        ${size}
      </li>
    `)
  })

  return yo`<ul>${rowEls}</ul>`
}

function rTrash () {
  return yo`
    <div class="trash">
      <h1>Trash</h1>
      ${trashList.length ? '' : yo`<p>No items in trash</p>`}
      <ul class="trash-list">
        ${trashList.map(archiveInfo => yo`
          <li class="trash-item">
            <a href=${archiveInfo.key}>${niceName(archiveInfo)}</a>
            <button class="restore" onclick=${e => onToggleSaved(e, archiveInfo)}>
              Restore
            </button>
          </li>`
        )}
      </ul>
    </div>
  `
}

function updateGraph (archiveInfo) {
  var el = document.querySelector(`#history-${archiveInfo.key}`)
  yo.update(el, renderGraph(archiveInfo))
}

// event handlers
// =

async function onToggleSaved (e, archiveInfo) {
  if (archiveInfo.userSettings.isSaved) {
    trashList.unshift(archiveInfo)
    await beaker.archives.remove(archiveInfo.key)
    archiveInfo.userSettings.isSaved = false
  } else {
    trashList.splice(trashList.findIndex(a => a.key === archiveInfo.key), 1)
    await beaker.archives.add(archiveInfo.key)
    archiveInfo.userSettings.isSaved = true
  }
  update()
}

function onToggleTrash () {
  isTrashOpen = !isTrashOpen
  update()
}

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}

function onChangeFilter (e) {
  currentFilter = e.target.value
  update()
}

function onChangeSort (e) {
  var selectedIndex = e.target.selectedIndex
  currentSort = e.target[selectedIndex].value
  update()
}

function onClearFilter () {
  currentFilter = ''
  document.querySelector('input[name="filter"]').value = ''
  update()
}
