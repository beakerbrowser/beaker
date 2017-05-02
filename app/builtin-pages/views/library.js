import * as yo from 'yo-yo'
import {FileTree, ArchivesList} from 'builtin-pages-lib'
import {pluralize, makeSafe} from '../../lib/strings'
import renderTabs from '../com/tabs'
import renderGraph from '../com/peer-history-graph'
import renderFiles from '../com/library-files-list'
import renderChanges from '../com/archive-changes'
import {niceDate} from '../../lib/time'
import prettyBytes from 'pretty-bytes'
import toggleable, {closeAllToggleables} from '../com/toggleable'
import * as toast from '../com/toast'
import * as sharePopup from '../com/share-popup'

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
var viewError

setup()
async function setup () {
  // load archives
  archivesList = new ArchivesList({listenNetwork: true})
  await archivesList.setup({isSaved: true})
  userProfileUrl = (await beaker.profiles.get(0)).url
  update()

  // load current archive
  await loadCurrentArchive()

  // load deleted archives
  trashList = await beaker.archives.list({isSaved: false})
  update()

  // render graph regularly
  setInterval(() => {
    if (selectedArchive) {
      updateGraph()
    }
  }, 5e3)

  // setup handlers
  archivesList.addEventListener('changed', update)
  beaker.archives.addEventListener('updated', onArchivesUpdated)
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
  // reset state
  if (isTrashOpen) isTrashOpen = false
  if (selectedArchive && selectedArchive.events) {
    selectedArchive.events.close()
    selectedArchive.events = null
  }
  viewError = null
  currentSection = 'files'

  try {
    selectedArchiveKey = await parseURLKey()
    if (selectedArchiveKey) {
      // show 'loading...'
      update()
      
      // load all data needed
      var a = new DatArchive(selectedArchiveKey)
      var fileTree = new FileTree(a)
      selectedArchive = await a.getInfo()
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
    selectedArchive = null
    console.error(e)
    viewError = e
  }

  update()
}

async function reloadDiff () {
  if (!selectedArchive || !selectedArchive.isOwner) {
    return
  }

  selectedArchive.diff = []
  var stats = selectedArchive.diffStats = {add: 0, mod: 0, del: 0}
  try {
    // load diff
    var a = new DatArchive(selectedArchiveKey)
    var diff = selectedArchive.diff = await a.diff()

    // calc diff stats
    diff.forEach(d => { stats[d.change]++ })
  } catch (e) {
    // this can happen if the site's folder has disappeared
  }
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
  if (viewError) return rError()
  else if (isTrashOpen) return rTrash()
  else if (selectedArchive) return rArchive(selectedArchive)
  else if (selectedArchiveKey) return 'Loading...'
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
      <span class="last-updated">Updated ${niceDate(archiveInfo.mtime || 0)}</span>
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

  var showChanges = archiveInfo.isOwner && archiveInfo.userSettings.isSaved
  var changesLabel = 'Staging'
  if (archiveInfo.diff && archiveInfo.diff.length > 0) {
    changesLabel = `Staging (${archiveInfo.diff.length})`
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
          <a class="btn primary" onclick=${onShare}>
            <i class="fa fa-link"></i>
            Share site
          </a>
          <a class="btn" target="_blank" href="dat://${archiveInfo.key}">
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
                  ? yo`<a class="dropdown-item" onclick=${onOpenFolder}>
                      <i class="fa fa-folder-open-o"></i>
                      Open folder
                    </a>`
                  : yo`<a class="dropdown-item disabled">
                      <i class="fa fa-folder-open-o"></i>
                      Open folder
                    </a>`}
                <div class="dropdown-item" onclick=${onEditSettings}>
                  <i class="fa fa-pencil"></i>
                  Edit site settings
                </div>
                <div class="dropdown-item" onclick=${onFork}>
                  <i class="fa fa-code-fork"></i>
                  Fork this site
                </div>
                <div class="dropdown-item" onclick=${onToggleSaved}>
                  <i class="fa ${toggleSaveIcon}"></i>
                  ${toggleSaveText}
                </div>
              </div>
            </div>
          `)}
        </div>
      </section>

      ${rNotSaved(archiveInfo)}
      ${rMissingLocalPathMessage(archiveInfo)}
      ${rDiffMessage(archiveInfo)}

      <h2>Network activity</h2>
      <section class="peer-history">
        ${renderGraph(archiveInfo)}
      </section>

      <section>
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Files', onclick: onClickTab('files')},
          showChanges ? {id: 'changes', label: changesLabel, onclick: onClickTab('changes')} : undefined,
          {id: 'log', label: 'History', onclick: onClickTab('log')},
          {id: 'metadata', label: 'Metadata', onclick: onClickTab('metadata')}
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

function rError () {
  return yo`
    <div class="message error">
      <i class="fa fa-exclamation-triangle"></i> ${viewError.toString()}
    </div>
  `
}

function rNotSaved (archiveInfo) {
  if (archiveInfo.userSettings.isSaved) {
    return ''
  }
  return yo`
    <section class="message primary">
      This archive is not saved to your library. <a href="#" onclick=${onToggleSaved}>Save now.</a>
    </section>
  `
}

function rMissingLocalPathMessage (archiveInfo) {
  if (!archiveInfo.userSettings.isSaved || archiveInfo.localPathExists) {
    return ''
  }
  return yo`
    <section class="message error missing-local-path">
      <div>
        <i class="fa fa-exclamation-triangle"></i>
        <strong>Beaker cannot find the local copy of this site.</strong>
        This is probably because the folder was moved or deleted.
      </div>
      <ul>
        <li>If it was moved, you can <a href="#" onclick=${onUpdateLocation}>update the location</a> and things will resume as before.</li>
        <li>If it was deleted accidentally (or you dont know what happened) you can <a href="#" onclick=${onUpdateLocation}>choose a
          new location</a> and we${"'"}ll restore the files from the last published state.</li>
        <li>If it was deleted on purpose, and you don${"'"}t want to keep the site anymore,
          you can <a href="#" onclick=${onToggleSaved}>delete it from your library</a>.</li>
      </ul>
    </section>
  `
}

function rDiffMessage (archiveInfo) {
  if (!archiveInfo.userSettings.isSaved || !archiveInfo.isOwner) {
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
  var len = archiveInfo.history.length
  var rowEls = archiveInfo.history.map(function (item, i) {
    var rev = len - i
    return `
      <div class="history-item">
        <div class="date"><a class="link" href=${`dat://${archiveInfo.key}+${rev}`} target="_blank">Revision ${rev}</a></div>
        ${makeSafe(item.type)}
        ${makeSafe(item.name)}
      </div>
    `
  })

  if (rowEls.length === 0) {
    rowEls.push(`<em>Nothing has been published yet.</em>`)
  }

  // use innerHTML instead of yo to speed up this render
  var el = yo`<div class="history"></div>`
  el.innerHTML = rowEls.join('')
  return el
}

function rMetadata (archiveInfo) {
  return yo`
    <div class="metadata">
      <table>
        <tr><td class="label">Files</td><td>${prettyBytes(archiveInfo.stagingSize)}</td></tr>
        <tr><td class="label">History</td><td>${prettyBytes(archiveInfo.metaSize)}</td></tr>
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
            <button class="restore" onclick=${onToggleSaved}>
              Restore
            </button>
          </li>`
        )}
      </ul>
    </div>
  `
}

function updateGraph () {
  var el = document.querySelector(`#history-${selectedArchive.key}`)
  yo.update(el, renderGraph(selectedArchive))
}

// event handlers
// =

function onArchivesUpdated (e) {
  if (selectedArchive && e.details.url === selectedArchive.url) {
    loadCurrentArchive()
  }
}

function onShare (e) {
  sharePopup.create(selectedArchive.url)
}

function onOpenFolder (e) {
  if (selectedArchive.userSettings.localPath) {
    beakerBrowser.openFolder(selectedArchive.userSettings.localPath)
  }
  update()
}

async function onEditSettings (e) {
  e.preventDefault()
  update()
  await beaker.archives.updateManifest(selectedArchive.url)
}

async function onFork (e) {
  e.preventDefault()
  update()
  var a = await DatArchive.fork(selectedArchive.url)
  history.pushState({}, null, 'beaker://library/' + a.url.slice('dat://'.length))
}

async function onToggleSaved (e) {
  e.preventDefault()
  if (selectedArchive.userSettings.isSaved) {
    trashList.unshift(selectedArchive)
    await beaker.archives.remove(selectedArchive.key)
    selectedArchive.userSettings.isSaved = false
  } else {
    trashList.splice(trashList.findIndex(a => a.key === selectedArchive.key), 1)
    await beaker.archives.add(selectedArchive.key)
    selectedArchive.userSettings.isSaved = true
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

async function onUpdateLocation (e) {
  e.preventDefault()
  await beaker.archives.add(selectedArchiveKey, {promptLocalPath: true})
  loadCurrentArchive()
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
