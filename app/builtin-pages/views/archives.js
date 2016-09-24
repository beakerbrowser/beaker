/*
This uses the datInternalAPI API, which is exposed by webview-preload to all archives loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import { render as renderArchivesList } from '../com/archives-list'
import * as editSiteModal from '../com/modals/edit-site' 

// globals
// =

var archives

// exported API
// =

export function setup () {
  if (!window.datInternalAPI)
    return console.warn('Dat plugin is required for the Archives page.')

  // wire up events
  var archivesEvents = emitStream(datInternalAPI.archivesEventStream())
  archivesEvents.on('update-archive', onUpdateArchive)
  archivesEvents.on('update-peers', onUpdatePeers)
}

export function show () {
  document.title = 'Your Archives'
  co(function*(){
    if (window.datInternalAPI) {
      // fetch archives
      archives = yield datInternalAPI.getSavedArchives()
      archives.sort(archiveSortFn)
    }
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  // content
  var content = (window.datInternalAPI)
    ? renderArchivesList(archives, { renderEmpty, onToggleServeArchive, onDeleteArchive, onUndoDeletions })
    : renderNotSupported()

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archives">
      <div class="ll-heading">
        Your Archives
        <button class="btn" onclick=${onClickCreateArchive}>New Archive</button>
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/faq.html#what-are-archives" title="What are Dat Archives?"><span class="icon icon-help-circled"></span> What are Dat Archives?</a>
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${content}
    </div>
  </div>`)
}

function renderEmpty () {
  return yo`<div class="ll-empty">You have not added or created any archives.</div>`
}

function renderNotSupported () {
  return yo`<div class="archives-listing">
    <div class="ll-empty">The DAT Plugin must be enabled to use this feature.</div>
  </div>`
}

// event handlers
// =

// DISABLED for now
// function onToggleSharing (archive) {
//   if (archive.isSharing)
//     datInternalAPI.unswarm(archive.key)
//   else
//     datInternalAPI.swarm(archive.key)
//   render()
// }

function onClickCreateArchive (e) {
  editSiteModal.create({}, { title: 'New Files Archive', onSubmit: opts => {
    datInternalAPI.createNewArchive(opts).then(key => {
      window.location = 'dat://' + key
    })
  }})
}

function onUpdateArchive (update) {
  console.log('update', update)
  if (archives) {
    // find the archive being updated
    var archive = archives.find(a => a.key == update.key)
    if (archive) {
      // patch the archive
      for (var k in update)
        archive[k] = update[k]
      render()
    }
  }
}

function onUpdatePeers ({ key, peers }) {
  if (archives) {
    // find the archive being updated
    var archive = archives.find(a => a.key == key)
    if (archive)
      archive.peers = peers // update
    render()
  }
}


function onToggleServeArchive (archiveInfo) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    archiveInfo.userSettings.isServing = !archiveInfo.userSettings.isServing

    // isSaved must reflect isServing
    if (archiveInfo.userSettings.isServing && !archiveInfo.userSettings.isSaved)
      archiveInfo.userSettings.isSaved = true
    datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
    
    render()
  }
}

function onDeleteArchive (archiveInfo) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
      
    archiveInfo.userSettings.isSaved = !archiveInfo.userSettings.isSaved

    // isServing must reflect isSaved
    if (!archiveInfo.userSettings.isSaved && archiveInfo.userSettings.isServing)
      archiveInfo.userSettings.isServing = false

    datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
    render()
  }
}

function onUndoDeletions (e) {
  e.preventDefault()
  e.stopPropagation()

  archives.forEach(archiveInfo => {
    if (!archiveInfo.userSettings.isSaved) {
      archiveInfo.userSettings.isSaved = true
      datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
    }
  })
  render()
}

// helpers
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}