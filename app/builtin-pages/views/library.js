import * as yo from 'yo-yo'
import {FileTree, ArchivesList} from 'builtin-pages-lib'
import {pluralize} from '../../lib/strings'
import renderTabs from '../com/tabs'
import renderGraph from '../com/peer-history-graph'
import renderFiles from '../com/library-files-list'
import renderChanges from '../com/archive-changes'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import toggleable, {closeAllToggleables} from '../com/toggleable'
import * as toast from '../com/toast'

window.toast = toast

// HACK FIX
// the good folk of whatwg didnt think to include an event for pushState(), so let's add one
// -prf
var _wr = function(type) {
  var orig = window.history[type];
  return function() {
    var rv = orig.apply(this, arguments);
    var e = new Event(type.toLowerCase());
    e.arguments = arguments;
    window.dispatchEvent(e);
    return rv;
  };
};
window.history.pushState = _wr('pushState')
window.history.replaceState = _wr('replaceState')

// globals
// =

var userProfileUrl
var archivesList
var trashList = []
var isTrashOpen = false
var currentFilter = ''
var currentSort = 'mtime'
var currentSection = 'files'
var selectedArchiveKey = ''
var selectedArchive

setup()
async function setup () {
  // load archives
  archivesList = new ArchivesList({listenNetwork: true})
  await archivesList.setup({isSaved: true})
  userProfileUrl = (await beaker.profiles.get(0)).url
  await loadCurrentArchive()

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
  window.addEventListener('pushstate', loadCurrentArchive)
  window.addEventListener('popstate', loadCurrentArchive)
}

async function parseURLKey () {
  var path = window.location.pathname
  if (path === '/' || !path) return false
  try {
    // extract key from url
    var name = /^\/([^\/]+)/.exec(path)[1]
    if (/[0-9a-f]{64}/i.test(name)) return name
    return DatArchive.resolveName(name)
  } catch (e) {
    console.error('Failed to parse URL', e)
    throw new Error('Invalid dat URL')
  }
}

async function loadCurrentArchive () {
  // close the trash if necessary
  if (isTrashOpen) isTrashOpen = false
  if (selectedArchive && selectedArchive.events) {
    selectedArchive.events.close()
    selectedArchive.events = null
  }
  currentSection = 'files' // reset section

  try {
    selectedArchiveKey = await parseURLKey()
    if (selectedArchiveKey) {
      selectedArchive = archivesList.archives.find(archive => archive.key === selectedArchiveKey)

      // load all data needed
      var a = new DatArchive(selectedArchiveKey)
      var fileTree = new FileTree(a)
      var [history, fileTreeRes, _] = await Promise.all([
        a.history(),
        fileTree.setup(),
        await reloadDiff()
      ])
      selectedArchive.history = history
      selectedArchive.fileTree = fileTree
      selectedArchive.events = a.createFileActivityStream()

      // wire up events
      selectedArchive.events.addEventListener('changed', onFileChanged)

      // sort history in descending order
      selectedArchive.history.reverse()
    } else {
      selectedArchive = null
    }
  } catch (e) {
    console.error(e)
  }

  update()
}

async function reloadDiff () {
  console.log(selectedArchive)
  if (!selectedArchive || !selectedArchive.isOwner) {
    return
  }

  // load diff
  var a = new DatArchive(selectedArchiveKey)
  var diff = selectedArchive.diff = await a.diff()

  // calc diff stats
  var stats = {add: 0, mod: 0, del: 0}
  diff.forEach(d => { stats[d.change]++ })
  selectedArchive.diffStats = stats
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
            <option value="mtime" selected=${currentSort === 'mtime'}>
              Recently updated
            </option>
            <option value="alphabetical" selected=${currentSort === 'alphabetical'}>
              Name
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

function rArchivesList () {
  // apply filter
  var filteredArchives = archivesList.archives.filter(archive => {
    if (!currentFilter) {
      return true
    }
    else if (currentFilter && archive.title && archive.title.toLowerCase().indexOf(currentFilter) !== -1) {
      return true
    }
    return false
  })

  // sort
  filteredArchives.sort((a, b) => {
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
    <div class="archive ${cls}" onclick=${onSelectArchive(archiveInfo)}>
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

  var changesLabel = 'Changes'
  if (archiveInfo.diff && archiveInfo.diff.length > 0) {
    changesLabel = `Changes (${archiveInfo.diff.length})`
  }

  return yo`
    <div class="archive">
      <section class="info">
        <h1 class="title" title=${archiveInfo.title}>
          <a href="dat://${archiveInfo.key}">${niceName(archiveInfo)}</a>
          ${archiveInfo.isOwner ? '' : yo`<i class="readonly fa fa-eye"></i>`}
        </h1>
        <p class="description">${niceDesc(archiveInfo)}</p>
        <div class="actions">
          <span class="readonly">${archiveInfo.isOwner ? '' : yo`<em>(Read-only)</em>`}</span>
          <a class="btn" href="dat://${archiveInfo.key}">
            <i class="fa fa-external-link"></i>
            View site
          </a>
          ${toggleable(yo`
            <div class="dropdown-btn-container toggleable-container">
              <button class="btn toggleable">
                <i class="fa fa-caret-down"></i>
              </button>
              <div class="dropdown-btn-list">
                ${archiveInfo.userSettings.localPath
                  ? yo`<a class="dropdown-item" onclick=${e => onOpenFolder(e, archiveInfo)}>
                      <i class="fa fa-folder-open-o"></i>
                      Open folder
                    </a>`
                  : yo`<a class="dropdown-item disabled">
                      <i class="fa fa-folder-open-o"></i>
                      Open folder
                    </a>`}
                <div class="dropdown-item" onclick=${e => onToggleSaved(e, archiveInfo)}>
                  <i class="fa ${toggleSaveIcon}"></i>
                  ${toggleSaveText}
                </div>
              </div>
            </div>
          `)}
        </div>
      </section>

      ${rDiffSummary(archiveInfo)}

      <h2>Network activity</h2>
      <section class="peer-history">
        ${renderGraph(archiveInfo)}
      </section>

      <section>
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Files', onclick: onClickTab('files')},
          archiveInfo.isOwner ? {id: 'changes', label: changesLabel, onclick: onClickTab('changes')} : undefined,
          {id: 'metadata', label: 'Metadata', onclick: onClickTab('metadata')},
          {id: 'log', label: 'Log', onclick: onClickTab('log')},
        ].filter(Boolean))}
        ${({
          files: () => renderFiles(archiveInfo),
          log: () => rHistory(archiveInfo),
          metadata: () => rMetadata(archiveInfo),
          changes: () => renderChanges(archiveInfo, {onPublish, onRevert})
        })[currentSection]()}
      </section>
    </div>
  `
}

function rDiffSummary (archiveInfo) {
  if (!archiveInfo.isOwner) {
    return ''
  }
  
  var diff = archiveInfo.diff
  if (diff.length === 0) {
    return ''
  }

  var stats = archiveInfo.diffStats
  return yo`
    <section class="message info diff-summary">
      <div>
        There are ${stats.add} ${pluralize(stats.add, 'addition')},
        ${stats.mod} ${pluralize(stats.mod, 'change')},
        and ${stats.del} ${pluralize(stats.del, 'deletion')}.
      </div>
      <div>
        <a onclick=${onClickTab('changes')} href="#">Review and publish</a>
      </div> 
    </section>
  `
}

function rHistory (archiveInfo) {
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

  if (rowEls.length === 0) {
    rowEls.push(yo`<em>Nothing has been published yet.</em>`)
  }

  return yo`<ul class="history">${rowEls}</ul>`
}

function rMetadata (archiveInfo) {
  return yo`
    <div class="metadata">
      <table>
        <tr><td class="label">Size</td><td>${prettyBytes(archiveInfo.size)}</td></tr>
        <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime)}</td></tr>
        <tr><td class="label">URL</td><td>dat://${archiveInfo.key}</td></tr>
        <tr><td class="label">Path</td><td>${archiveInfo.userSettings.localPath || ''}</td></tr>
        <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
      </table>
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

function updateGraph (archiveInfo) {
  var el = document.querySelector(`#history-${archiveInfo.key}`)
  yo.update(el, renderGraph(archiveInfo))
}

// event handlers
// =

function onOpenFolder (e, archiveInfo) {
  if (archiveInfo.userSettings.localPath) {
    beakerBrowser.openFolder(archiveInfo.userSettings.localPath)
  }
  update()
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
  update()
}

function onToggleTrash () {
  isTrashOpen = !isTrashOpen
  update()
}

function onSelectArchive (archiveInfo) {
  return e => {
    history.pushState({}, null, 'beaker://library/' + archiveInfo.key)
  }
}

function onClickTab (tab) {
  return e => {
    e.preventDefault()
    currentSection = tab
    update()
  }
}

async function onPublish () {
  try {
    var a = new DatArchive(selectedArchiveKey)
    await a.commit()
    toast.create('Your changes have been published')
  } catch (e) {
    console.error(e)
    toast.create(e.toString())
  }
}

async function onRevert () {
  if (!confirm('This will revert all files to the last published state. Are you sure?')) {
    return
  }

  try {
    var a = new DatArchive(selectedArchiveKey)
    await a.revert()
    toast.create('Your files have been reverted')
  } catch (e) {
    console.error(e)
    toast.create(e.toString())
  }
}

async function onFileChanged () {
  await reloadDiff()
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
