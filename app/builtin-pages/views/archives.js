/*
This uses the datInternalAPI API, which is exposed by webview-preload to all archives loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import ArchivesList from '../model/archives-list'
import { render as renderArchivesList } from '../com/archives-list'

// globals
// =

var archivesList
var isViewActive = false

// exported API
// =

export function setup () {
}

export function show () {
  isViewActive = true
  document.title = 'Your Archives'
  co(function * () {
    archivesList = new ArchivesList()
    yield archivesList.setup({
      filter: a => a.isOwner // owned archives only
    })
    archivesList.on('changed', render)
    render()
  })
}

export function hide () {
  isViewActive = false
  archivesList.destroy()
  archivesList = null
}

// rendering
// =

function render () {
  if (!isViewActive) {
    return
  }

  // content
  var content = (window.datInternalAPI)
    ? renderArchivesList(archivesList, { renderEmpty, render })
    : renderNotSupported()

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archives">
      <div class="ll-heading">
        Dat Archives
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
