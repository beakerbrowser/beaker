/*
This uses the datInternalAPI API, which is exposed by webview-preload to all archives loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import { render as renderArchivesList } from '../com/archives-list'

// globals
// =

var archives
var isViewActive = false

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
  isViewActive = true
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
  isViewActive = false
}

// rendering
// =

function render () {
  if (!isViewActive) {
    return
  }

  // content
  var content = (window.datInternalAPI)
    ? renderArchivesList(archives, { renderEmpty, onToggleServeArchive, onDeleteArchive, onUndoDeletions })
    : renderNotSupported()

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archives">
      <div class="ll-heading">
        Files
        <span class="btn-group">
          <button class="btn" onclick=${onClickCreateArchive}>New Archive</button><button class="btn" onclick=${onClickImportFolder}>Import Folder</button>
        </span>
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${content}
    </div>
  </div>`)
}

function renderEmpty () {
  return yo`<div class="archives-empty">
      <div class="archives-empty-banner">
        <div class="icon icon-info-circled"></div>
        <div>
          Share files on the network by creating archives.
          <a class="icon icon-popup" href="https://beakerbrowser.com/docs/" target="_blank"> Learn More</a>
        </div>
      </div>
    </div>
  </div>`
}

function renderNotSupported () {
  return yo`<div class="archives-listing">
    <div class="ll-empty">The DAT Plugin must be enabled to use this feature.</div>
  </div>`
}

// event handlers
// =

function onClickCreateArchive (e) {
  datInternalAPI.createNewArchive().then(key => {
    window.location = 'beaker:archive/' + key
  })
}

function onClickImportFolder (e) {
  co(function* () {
    var paths = yield beakerBrowser.showOpenDialog({
      title: 'Choose a folder to import',
      buttonLabel: 'Import',
      properties: ['openDirectory', 'showHiddenFiles']
    })
    if (paths && paths[0]) {
      var key = yield datInternalAPI.createNewArchive({ importFrom: paths[0] })
      window.location = 'beaker:archive/' + key
    }
  })
}

function onUpdateArchive (update) {
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