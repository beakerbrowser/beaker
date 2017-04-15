import * as yo from 'yo-yo'
import {ArchivesList} from 'builtin-pages-lib'
import {pluralize} from '../../lib/strings'
import sparkline from '../../lib/fg/sparkline'
import {niceDate} from '../../lib/time'

// globals
// =

var userProfileUrl
var archivesList
var trashList = []
var isTrashOpen = false
var currentFilter = ''
var currentSort = 'mtime'
var selectedArchiveKey = ''

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

  // render canvas regularly
  setInterval(() => {
    archivesList.archives.forEach(archiveInfo => {
      var canvas = document.querySelector(`#history-${archiveInfo.key}`)
      renderCanvas(canvas, archiveInfo)
    })
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
  if (isTrashOpen) {
    return rTrash()
  } else if (selectedArchiveKey) {
    var selectedArchive = archivesList.archives.find(archive => archive.key === selectedArchiveKey)
    return rArchive(selectedArchive)
  }

  return ''
}

function onSelectArchive () {
  // close the trash if necessary
  if (isTrashOpen) isTrashOpen = false

  selectedArchiveKey = this.dataset.key
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
    if (a.url === userProfileUrl) return -1
    if (b.url === userProfileUrl) return 1

    if (currentSort === 'alphabetical') return niceName(a).localeCompare(niceName(b))
    if (currentSort === 'mtime') return b.mtime - a.mtime
  })

  return filteredArchives.map(rArchiveListItem)
}

function rArchiveListItem (archiveInfo) {
  var cls = archiveInfo.key === selectedArchiveKey ? 'active' : ''
  var icon = ''
  if (archiveInfo.url === userProfileUrl) {
    icon = yo`<i class="fa fa-user-circle-o"></i>`
  }
  return yo`
    <div class="archive ${cls}" data-key=${archiveInfo.key} onclick=${onSelectArchive}>
      <div class="title">
        ${niceName(archiveInfo)}
        ${archiveInfo.isOwner ? '' : yo`<i class="readonly fa fa-eye"></i>`}
      </div>
      <span class="last-updated">Updated ${niceDate(archiveInfo.mtime)}</span>
      <span class="peers">
        <i class="fa fa-share-alt"></i>
        ${archiveInfo.peers}
      </span>
    </div>
  `
}

function rArchive (archiveInfo) {
  var icon = ''
  if (archiveInfo.url === userProfileUrl) {
    icon = yo`<i class="fa fa-user-circle-o"></i>`
  }
  return yo`
    <div class="archive">
      <div class="peer-history">
        <canvas
          id="history-${archiveInfo.key}"
          width="200" height="40"
          onload=${el => renderCanvas(el, archiveInfo)}
          onmousemove=${e => onCanvasMouseMove(e, archiveInfo)}
          onmouseleave=${e => onCanvasMouseLeave(e, archiveInfo)}
        ></canvas>
      </div>
      <div class="info">
        <div class="title"><a href=${'beaker://editor/' + archiveInfo.key} class="link">${icon} ${niceName(archiveInfo)}</a></div>
        <div class="description">${niceDesc(archiveInfo)}</div>
        <div class="status">${archiveInfo.peers} active peers</div>
      </div>
      <div class="actions">
        <div class="btns">
          <a class="btn" href=${archiveInfo.url}><i class="fa fa-external-link"></i> View site</a>
          <a class="btn" onclick=${e => onToggleSaved(e, archiveInfo)}><i class="fa fa-trash"></i> Trash</a>
        </div>
        ${archiveInfo.isOwner
          ? yo`<div class="ownership"><i class="fa fa-pencil"></i> Editable</div>`
          : yo`<div class="ownership"><i class="fa fa-eye"></i> Read-only</div>`}
      </div>
    </div>
  `
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

function renderCanvas (canvas, archiveInfo) {
  sparkline(canvas, archiveInfo.peerHistory)
}

// event handlers
// =

function onCanvasMouseMove (e, archiveInfo) {
  e.target.mouseX = e.layerX
  sparkline(e.target, archiveInfo.peerHistory)
}

function onCanvasMouseLeave (e, archiveInfo) {
  delete e.target.mouseX
  sparkline(e.target, archiveInfo.peerHistory)
}

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
