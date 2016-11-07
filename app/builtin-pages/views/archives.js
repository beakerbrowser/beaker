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
      filter: { isSaved: true }
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

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archives">
      <div class="page-toolbar">
        <button class="btn btn-green" onclick=${onClickCreateArchive}><span class="icon icon-book"></span> New</button>
      </div>
      ${renderArchivesList(archivesList, { renderEmpty, render })}
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

// event handlers
// =

function onClickCreateArchive (e) {
  datInternalAPI.createNewArchive({ saveClaim: 'beaker:archives' }).then(key => {
    window.location = 'beaker:archive/' + key
  })
}

function onClickImportFolder (e) {
  co(function* () {
    var paths = yield beakerBrowser.showOpenDialog({
      title: 'Choose files and folders to import',
      buttonLabel: 'Import',
      properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
    })
    if (paths && paths.length) {
      var key = yield datInternalAPI.createNewArchive({ importFiles: paths, saveClaim: 'beaker:archives' })
      window.location = 'beaker:archive/' + key
    }
  })
}
