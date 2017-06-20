import * as yo from 'yo-yo'
import {FileTree, ArchivesList} from 'builtin-pages-lib'
import {pluralize, makeSafe} from '../../lib/strings'
import {throttle} from '../../lib/functions'
import renderTabs from '../com/tabs'
import renderGraph from '../com/peer-history-graph'
import renderFiles from '../com/files-list'
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
var isSidebarOpen = false
var isPublishing = false
var currentFilter = ''
var currentSort = 'mtime'
var currentSection = 'files'
var selectedArchiveKey = ''
var selectedArchive
var selectedArchives = []
var viewError
const reloadDiffThrottled = throttle(reloadDiff, 500)

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

  // check if sidebar should be open
  isSidebarOpen = !selectedArchive

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
  beaker.archives.addEventListener('network-changed', onNetworkChanged)
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

      // load archive metadata
      var a = new DatArchive(selectedArchiveKey)
      selectedArchive = await a.getInfo()
      console.log(selectedArchive)

      // load the filetree from the last published, not from the staging
      var aLastPublish = new DatArchive(`${selectedArchiveKey}+${selectedArchive.version}`)
      var fileTree = new FileTree(aLastPublish, {onDemand: true})

      // fetch all data
      var [history, fileTreeRes] = await Promise.all([
        a.history({end: 20, reverse: true, timeout: 10e3}),
        fileTree.setup().catch(err => null)
      ])
      /*dont await*/ reloadDiff()
      selectedArchive.history = history
      selectedArchive.historyPaginationOffset = 20
      selectedArchive.fileTree = fileTree
      selectedArchive.events = a.createFileActivityStream()

      // wire up events
      selectedArchive.events.addEventListener('changed', onFileChanged)
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
    var diff = selectedArchive.diff = await a.diff({shallow: true})

    // calc diff stats
    diff.forEach(d => { stats[d.change]++ })
  } catch (e) {
    // this can happen if the site's folder has disappeared
  }
  update()
}

// rendering
// =

function update () {
  var isEmpty = !(isTrashOpen || selectedArchive || selectedArchiveKey)
  var viewCls = isEmpty ? 'empty' : ''
  yo.update(document.querySelector('main'), yo`
    <main>
    <div class="sidebar ${isSidebarOpen ? 'open' : ''}">
      <div class="menu">
        <button onclick=${onToggleSidebar}>
          <i class="fa fa-bars"></i>
        </button>
      </div>
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

      <div class="archives-list">
        ${rArchivesList()}
        <div class="new-archive" onclick=${onCreateArchive}>
          <i class="fa fa-plus"></i> Create new site
        </div>
      </div>

      <div class="trash-controls">
        <button onclick=${onClickBulkDelete} class="bulk-delete btn primary ${selectedArchives.length ? 'visible' : ''}">
          <i class="fa fa-trash"></i>
        </button>
        <button class="view-trash" onclick=${onToggleTrash}>${isTrashOpen ? 'Close Trash' : 'Show Trash'}
          <i class="fa ${isTrashOpen ? 'fa-close' : 'fa-trash'}"></i>
        </button>
      </div>
    </div>

    <div class="view ${viewCls}">
      <div onclick=${onToggleSidebar} class="menu">
        <button>
          <i class="fa fa-bars"></i>
        </button>
      </div>
      ${rView()}
    </div>
    </main>
  `)
}

function rView () {
  document.title = 'Library'
  if (viewError) return rError()
  else if (isTrashOpen) return rTrash()
  else if (selectedArchive) return rArchive(selectedArchive)
  else if (selectedArchiveKey) return 'Loading...'
  return rEmpty()
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
      <input checked=${selectedArchives.includes(archiveInfo.key)} data-key=${archiveInfo.key} onclick=${onChangeArchiveListItem} type="checkbox"/>
      <span class="peers">
        <i class="fa fa-share-alt"></i>
        ${archiveInfo.peers}
      </span>
    </div>
  `
}

function rArchive (archiveInfo) {
  document.title = `Library - ${archiveInfo.title || 'dat://' + archiveInfo.key}`

  var toggleSaveIcon, toggleSaveText
  if (archiveInfo.userSettings.isSaved) {
    toggleSaveIcon = 'fa-trash'
    toggleSaveText = 'Remove from library'
  } else {
    toggleSaveIcon = 'fa-floppy-o'
    toggleSaveText = 'Save to library'
  }

  // staging tab setup
  var diffCount, stagingTab
  if (archiveInfo.isOwner && archiveInfo.diff) {
    diffCount = archiveInfo.diff.length
  }

  if (archiveInfo.isOwner) {
    var stagingTab = {
      id: 'staging',
      label: yo`<span>Staging <span class="changes-count">${diffCount || ''}</span></span>`,
      onclick: onClickTab('staging')
    }
  }

  return yo`
    <div class="archive">
      <section class="header">
        <h1 class="title" title=${archiveInfo.title}>
          <a href="dat://${archiveInfo.key}">${niceName(archiveInfo)}</a>
          ${archiveInfo.isOwner ? '' : yo`<span class="readonly"><i class="fa fa-eye"></i>Read-only</span>`}
        </h1>
        <div class="actions">
          <button class="btn primary" onclick=${onShare}>
            <i class="fa fa-link"></i>
            Share site
          </button>
          <button disabled=${archiveInfo.isOwner ? 'false' : 'true'} title="Import files" class="btn" onclick>
            <i class="fa fa-plus"></i>
            Import files
          </button>
          ${toggleable(yo`
            <div class="dropdown-btn-container toggleable-container">
              <button class="btn toggleable">
                <i class="fa fa-caret-down"></i>
              </button>
              <div class="dropdown-btn-list">
                <div class="dropdown-item" onclick=${onFork}>
                  <i class="fa fa-code-fork"></i>
                  Fork this site
                </div>
                <div class="dropdown-item" onclick=${onViewSource}>
                  <i class="fa fa-code"></i>
                  View source
                </div>
                <div class="dropdown-item" onclick=${onChooseNewLocation}>
                  <i class="fa fa-folder-o"></i>
                  Change folder
                </div>
                ${archiveInfo.isOwner
                  ? yo`<div class="dropdown-item" onclick=${onEditSettings}>
                      <i class="fa fa-pencil"></i>
                      Edit site info
                    </div>`
                  : ''}
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

      <section class="tabs-content">
        ${renderTabs(currentSection, [
          {id: 'files', label: 'Published files', onclick: onClickTab('files')},
          {id: 'log', label: 'History', onclick: onClickTab('log')},
          {id: 'metadata', label: 'Metadata', onclick: onClickTab('metadata')},
          {id: 'network', label: 'Network', onclick: onClickTab('network')},
          yo`${stagingTab}`
        ].filter(Boolean))}
        ${({
          files: () => rFiles(archiveInfo),
          log: () => rHistory(archiveInfo),
          metadata: () => rMetadata(archiveInfo),
          network: () => rNetwork(archiveInfo),
          staging: () => rStagingArea(archiveInfo)
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
  if (!archiveInfo.isOwner || !archiveInfo.userSettings.isSaved || archiveInfo.localPathExists) {
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
        <li>If it was moved, you can <a href="#" onclick=${onChooseNewLocation}>update the location</a> and things will resume as before.</li>
        <li>If it was deleted accidentally (or you dont know what happened) you can <a href="#" onclick=${onChooseNewLocation}>choose a
          new location</a> and we’ll restore the files from the last published state.</li>
        <li>If it was deleted on purpose, and you don’t want to keep the site anymore,
          you can <a href="#" onclick=${onToggleSaved}>delete it from your library</a>.</li>
      </ul>
    </section>
  `
}

function rNetwork (archiveInfo) {
  var debugLink = 'beaker://swarm-debugger/' + selectedArchive.url.slice('dat://'.length)
  return yo`
    <div class="network">
      ${renderGraph(archiveInfo)}
      <a href=${debugLink} title="Open network debugger">
        <i class="fa fa-bug"></i>
        Network debugger
      </a>
    </div>
  `
}

function rStagingNotification (archiveInfo) {
  if (!archiveInfo.userSettings.isSaved || !archiveInfo.isOwner) {
    return ''
  }

  var diff = archiveInfo.diff
  if (diff.length === 0) {
    return ''
  }

  return yo`
    <div class="staging-notification">
      <span>${diff.length} unpublished changes</span>
      <div class="actions">
        <button onclick=${e => { e.preventDefault(); currentSection = 'staging'; update() }} class="btn">Review changes</button>
        <button onclick=${onPublish} class="btn success">Publish changes</button>
      </div>
    </div>
  `
}

function rStagingArea (archiveInfo) {
  if (!archiveInfo.userSettings.isSaved || !archiveInfo.isOwner) {
    return ''
  }

  var diff = archiveInfo.diff
  if (diff.length === 0) {
    return yo`<em>No unpublished changes</em>`
  }

  var stats = archiveInfo.diffStats
  return yo`
    <section class="staging">
      <div class="changes">
        <div class="changes-heading">
          <span class="diff-summary">
            Unpublished changes:
          </span>
          <div class="actions">
            <button onclick=${onRevert} class="btn transparent">Revert changes</button>
            ${isPublishing
              ? yo`<button class="btn success" disabled><span class="spinner"></span> Publishing...</button>`
              : yo`<button onclick=${onPublish} class="btn success">Publish</button>`}
          </div>
        </div>
        ${renderChanges(archiveInfo)}
      </div>
    </section>
  `
}

function rFiles (archiveInfo) {
  return yo`
    <div class="published-files">
      ${rStagingNotification(archiveInfo)}
      ${renderFiles(archiveInfo)}
    </div>
  `
}

function rHistory (archiveInfo) {
  var rows = archiveInfo.history.map(function (item, i) {
    var rev = item.version
    var revType = makeSafe(item.type)
    var urlRev = (revType === 'put') ? rev : (rev - 1)  // give the one revision prior for deletions
    revType = revType === 'put' ? 'added' : 'deleted'

    return `
      <div class="history-item">
        <div class="date">
          <a class="link" href=${`dat://${archiveInfo.key}+${rev}`} target="_blank">
          Revision ${rev}</a>
        </div>
        ${revType}
        <a class="path" href="${`dat://${archiveInfo.key}+${urlRev}${item.path}`}" target="_blank">
          ${makeSafe(item.path.slice(1))}
        </a>
      </div>
    `
  })

  if (rows.length === 0) {
    rows.push(`<em>Nothing has been published yet.</em>`)
  }

  var loadMoreBtn = ''
  if (archiveInfo.version > archiveInfo.historyPaginationOffset) {
    loadMoreBtn = yo`<div>
      <a class="link load-more" href="#" onclick=${onLoadMoreHistory}>Load more</a>
    </div>`
  }

  // use innerHTML instead of yo to speed up this render
  var rowEls = yo`<div></div>`
  rowEls.innerHTML = rows.join('')
  return yo`<div class="history">${rowEls}${loadMoreBtn}</div>`
}

function rMetadata (archiveInfo) {
  return yo`
    <div class="metadata">
      <table>
        <tr><td class="label">Files</td><td>${prettyBytes(archiveInfo.stagingSizeLessIgnored)} (${prettyBytes(archiveInfo.stagingSize - archiveInfo.stagingSizeLessIgnored)} ignored)</td></tr>
        <tr><td class="label">History</td><td>${prettyBytes(archiveInfo.metaSize)}</td></tr>
        <tr><td class="label">Updated</td><td>${niceDate(archiveInfo.mtime)}</td></tr>
        <tr><td class="label">Path</td><td>${archiveInfo.userSettings.localPath || ''}</td></tr>
        <tr><td class="label">Editable</td><td>${archiveInfo.isOwner}</td></tr>
      </table>
    </div>
  `
}

function rTrash () {
  document.title = 'Library - Trash'
  return yo`
    <div class="trash">
      <h1>Trash</h1>
      ${trashList.length ? '' : yo`<p>No items in trash</p>`}
      <ul class="trash-list">
        ${trashList.map(archiveInfo => yo`
          <li class="trash-item">
            <a href=${archiveInfo.key}>${niceName(archiveInfo)}</a>
            <button class="restore" onclick=${e => onRestore(e, archiveInfo.key)}>
              Restore
            </button>
          </li>`
        )}
      </ul>
    </div>
  `
}

function rEmpty () {
  return yo`
    <div class="empty">
      <i class="fa fa-folder-open-o"></i>
    </div>
  `
}

function updateGraph () {
  if (currentSection === 'network') {
    var el = document.querySelector(`#history-${selectedArchive.key}`)
    yo.update(el, renderGraph(selectedArchive))
  }
}

// event handlers
// =

function onArchivesUpdated (e) {
  if (selectedArchive && e.details.url === selectedArchive.url) {
    loadCurrentArchive()
  }
}

function onNetworkChanged (e) {
  if (selectedArchive && e.details.url === selectedArchive.url) {
    var now = Date.now()
    var lastHistory = selectedArchive.peerHistory.slice(-1)[0]
    if (lastHistory && (now - lastHistory.ts) < 10e3) {
      // if the last datapoint was < 10s ago, just update it
      lastHistory.peers = e.details.peerCount
    } else {
      selectedArchive.peerHistory.push({ts: now, peers: e.details.peerCount})
    }
    updateGraph()
  }
}

function onShare (e) {
  sharePopup.create(selectedArchive.url)
}

async function onEditSettings (e) {
  e.preventDefault()
  update()
  await beaker.archives.update(selectedArchive.url)
  loadCurrentArchive()
}

async function onFork (e) {
  e.preventDefault()
  update()
  var a = await DatArchive.fork(selectedArchive.url)
  history.pushState({}, null, 'beaker://library/' + a.url.slice('dat://'.length))
}

function onViewSource () {
  window.location = 'beaker://view-source/' + selectedArchive.url.slice('dat://'.length)
}

function onViewSwarmDebugger () {
  window.location = 'beaker://swarm-debugger/' + selectedArchive.url.slice('dat://'.length)
}

async function removeArchive (archiveInfo) {
  trashList.unshift(archiveInfo)
  await beaker.archives.remove(archiveInfo.key)
  archiveInfo.userSettings.isSaved = false
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

async function onRestore (e, key) {
  e.preventDefault()
  trashList.splice(trashList.findIndex(a => a.key === key), 1)
  await beaker.archives.add(key)
  update()
}

function onToggleTrash () {
  isTrashOpen = !isTrashOpen
  update()
}

function onToggleSidebar () {
  isSidebarOpen = !isSidebarOpen
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
  // update UI
  isPublishing = true
  update()

  try {
    // publish
    var a = new DatArchive(selectedArchiveKey)
    await a.commit({timeout: 30e3})
    toast.create('Your changes have been published')
  } catch (e) {
    console.error(e)
    toast.create(e.toString())
  }

  // update UI
  selectedArchive.diff = [] // optimistically clear it to speed up rendering
  isPublishing = false
  update()
}

async function onRevert () {
  if (!confirm('This will revert all files to the last published state. Are you sure?')) {
    return
  }

  try {
    var a = new DatArchive(selectedArchiveKey)
    await a.revert()
    toast.create('Your files have been reverted')
    reloadDiffThrottled()
  } catch (e) {
    console.error(e)
    toast.create(e.toString())
  }
}

async function onFileChanged () {
  reloadDiffThrottled()
}

async function onChooseNewLocation (e) {
  e.preventDefault()
  var localPath = await beakerBrowser.showLocalPathDialog({
    defaultPath: selectedArchive.userSettings.localPath,
    warnIfNotEmpty: !selectedArchive.isOwner
  })
  await beaker.archives.update(selectedArchiveKey, null, {localPath})
  loadCurrentArchive()
}

async function onLoadMoreHistory (e) {
  e.preventDefault()

  // read more history
  var a = new DatArchive(selectedArchiveKey)
  var moreHistory = await a.history({
    start: selectedArchive.historyPaginationOffset,
    end: selectedArchive.historyPaginationOffset + 500,
    reverse: true
  })

  // add to tracked history and update
  selectedArchive.history = selectedArchive.history.concat(moreHistory)
  selectedArchive.historyPaginationOffset += 500
  update()
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

async function onClickBulkDelete () {
  for (const key of selectedArchives) {
    var archive = new DatArchive(key)
    var archiveInfo = await archive.getInfo()
    await removeArchive(archiveInfo)
  }

  selectedArchives = []
  update()
}

function onChangeArchiveListItem (e) {
  e.stopPropagation()
  var key = e.target.dataset.key
  var bulkDeleteBtn = document.querySelector('.bulk-delete')

  if (e.target.checked) selectedArchives.push(key)
  else selectedArchives.splice(selectedArchives.indexOf(key), 1)
  update()
}

async function onCreateArchive () {
  var archive = await DatArchive.create()
  history.pushState({}, null, 'beaker://library/' + archive.url.slice('dat://'.length))
}

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return (archiveInfo.description || '').trim() || yo`<em>No description</em>`
}