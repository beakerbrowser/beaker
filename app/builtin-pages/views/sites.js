/*
This uses the datInternalAPI API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import { render as renderSitesList } from '../com/sites-list'

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
    ? renderSitesList(archives, { renderEmpty })
    : renderNotSupported()

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="sites">
      <div class="ll-heading">
        Your Sites
        <button class="btn" onclick=${onClickNewDat}>New Site</button>
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

function onClickNewDat (e) {
  datInternalAPI.createNewArchive().then(key => {
    window.location = 'view-dat://' + key + '#new' // include the #new to trigger the edit modal
  })
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

// helpers
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}