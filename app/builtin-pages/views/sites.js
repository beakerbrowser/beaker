/*
This uses the datInternalAPI API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import { render as renderSitesList } from '../com/sites-list'
import * as editSiteModal from '../com/modals/edit-site' 

// globals
// =

var archives

// exported API
// =

export function setup () {
  if (!window.datInternalAPI)
    return console.warn('Dat plugin is required for the Sites page.')

  // wire up events
  var archivesEvents = emitStream(datInternalAPI.archivesEventStream())
  archivesEvents.on('update-archive', onUpdateArchive)
  archivesEvents.on('update-peers', onUpdatePeers)
}

export function show () {
  document.title = 'Your Sites'
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
    ? renderSitesList(archives, { renderEmpty, onToggleSeedSite, onDeleteSite, onUndoDeletions })
    : renderNotSupported()

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="sites">
      <div class="ll-heading">
        Your Sites
        <button class="btn" onclick=${onClickCreateSite}>New Site</button>
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${content}
    </div>
  </div>`)
}

function renderEmpty () {
  return yo`<div class="ll-empty">You have not added or created any sites.</div>`
}

function renderNotSupported () {
  return yo`<div class="sites-listing">
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

function onClickCreateSite (e) {
  editSiteModal.create({}, { title: 'New Website', onSubmit: opts => {
    opts.useNewSiteTemplate = true
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


function onToggleSeedSite (archiveInfo) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    archiveInfo.userSettings.isSeeding = !archiveInfo.userSettings.isSeeding

    // isSaved must reflect isSeeding
    if (archiveInfo.userSettings.isSeeding && !archiveInfo.userSettings.isSaved)
      archiveInfo.userSettings.isSaved = true
    datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
    
    render()
  }
}

function onDeleteSite (archiveInfo) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
      
    archiveInfo.userSettings.isSaved = !archiveInfo.userSettings.isSaved

    // isSeeding must reflect isSaved
    if (!archiveInfo.userSettings.isSaved && archiveInfo.userSettings.isSeeding)
      archiveInfo.userSettings.isSeeding = false

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