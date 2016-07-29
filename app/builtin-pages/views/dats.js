import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { renderArchives, entriesListToTree } from '../com/files-list'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'
import multicb from 'multicb'

// globals
// =

// list of archives
var archives = []

// event emitter
var archivesEvents


// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'My Dat Sites'
  // fetch archives
  beaker.dat.ownedArchives((err, subscribed) => {
    archives = subscribed
    archives.sort(archiveSortFn)
    console.log(archives)
    render()
  })

  // start event stream and register events
  if (!archivesEvents) {
    archivesEvents = emitStream(beaker.dat.archivesEventStream())
    archivesEvents.on('update-archive', onUpdateArchive)
    archivesEvents.on('update-peers', onUpdatePeers)
  }
}

export function hide () {
  archives = null
}

// internal methods
// =

function archiveSortFn (a, b) {
  return b.mtime - a.mtime
}

// rendering
// =

function render () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="dats">
      <div class="sf-actions">
        <button class="btn btn-default" onclick=${onClickNewDat}>New Dat Site</button>
      </div>
      ${renderArchives(archives, { showHead: true, onToggleSharing, renderEmpty })}
    </div>
  </div>`)
}

function renderEmpty () {
  return yo`<div class="fl-row archive"><div class="fl-name">You have not created any sites yet!</div></div>`
}

// event handlers
// =

function onClickNewDat (e) {
  beaker.dat.createNewArchive((err, key) => {
    window.location = 'view-dat://'+key
  })
}

function onToggleSharing (archive) {
  if (archive.isSharing) {
    beaker.dat.unswarm(archive.key)
    render()
  } else {
    beaker.dat.swarm(archive.key)
    render()
  }
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
    } else {
      // add to list
      archives.push(update)
    }
    render()
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