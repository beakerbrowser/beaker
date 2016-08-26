/*
This uses the datInternalAPI API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import { render as renderSitesList } from '../com/sites-list'
import { create as createModal } from '../com/modal'

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
      archives = yield datInternalAPI.getOwnedArchives()
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
    ? renderSitesList(archives, { showHead: false, onToggleSharing, renderEmpty })
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
  return yo`<div class="sl-row archive"><div class="sl-name">You have not created any sites yet!</div></div>`
}

function renderNotSupported () {
  return yo`<div class="sites-listing">
    <div class="sl-row archive"><div class="sl-name">The DAT Plugin must be enabled to use this feature.</div></div>
  </div>`
}

// event handlers
// =

function onClickNewDat (e) {
  var el = createModal(({ close }) => {
    return yo`<div class="edit-site-modal">
      <h2>New Site</h2>
      <div class="esm-section">
        <form onsubmit=${onsubmit}>
          <div class="form-group">
            <input name="name" class="form-control" placeholder="Title" tabindex="1" />
          </div>
          <div class="form-group">
            <input name="desc" class="form-control" placeholder="Description" tabindex="2" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn" tabindex="3">OK</button>
            <a onclick=${close}>Cancel</a>
          </div>
        </form>
      </div>
      <div class="esm-info">
        Use Sites to share Files and WebPages.
        <a href="beaker:help/creating-sites" target="_blank">Learn More.</a>
      </div>
    </div>`

    function onsubmit (e) {
      e.preventDefault()
      var form = e.target
      var key = datInternalAPI.createNewArchive({
        name: form.name.value,
        description: form.desc.value
      })
      window.location = 'view-dat://'+key
    }
  })
  el.querySelector('input').focus()
}

function onToggleSharing (archive) {
  if (archive.isSharing)
    datInternalAPI.unswarm(archive.key)
  else
    datInternalAPI.swarm(archive.key)
  render()
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