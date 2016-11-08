/*
This uses the datInternalAPI API, which is exposed by webview-preload to all archives loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import ArchivesList from '../model/archives-list'
import { render as renderArchivesList } from '../com/archives-list'
import { pushUrl } from '../../lib/fg/event-handlers'
import { ucfirst } from '../../lib/strings'

// globals
// =

var archivesList
var isViewActive = false
var filter

// exported API
// =

export function setup () {
}

export function show () {
  isViewActive = true
  filter = (window.location.pathname.endsWith('/downloaded')) ? 'downloaded' : 'owned'
  document.title = ucfirst(filter) + ' Sites'
  co(function * () {
    archivesList = new ArchivesList()
    yield archivesList.setup({
      filter: { isSaved: true, isOwner: (filter === 'owned') }
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
        <div class="tabs">
          <a class=${(filter === 'owned') ? 'current' : ''} href="beaker:archives" onclick=${pushUrl}>Your Sites</a>
          <a class=${(filter === 'downloaded') ? 'current' : ''} href="beaker:archives/downloaded" onclick=${pushUrl}>Downloaded</a>
        </div>
      </div>
      ${renderArchivesList(archivesList, { renderEmpty, render })}
    </div>
  </div>`)
}

function renderEmpty () {
  return yo`<div class="archives-empty">
    ${(filter === 'owned')
      ? yo`<div class="archives-empty-banner" onclick=${onClickCreateArchive}>
          Share files, docs, and applications. <strong>Click here</strong> to get started.
        </div>`
      : 'Sites that you download will appear here.' }
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
