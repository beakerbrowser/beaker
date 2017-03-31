import * as yo from 'yo-yo'
import {ArchivesList} from 'builtin-pages-lib'
import {pluralize} from '../../lib/strings'
import sparkline from '../../lib/fg/sparkline'

// globals
// =

var archivesList

setup()
async function setup () {
  // load archives
  archivesList = new ArchivesList()
  await archivesList.setup({isSaved: true})
  update()

  // setup handlers
  archivesList.addEventListener('changed', update)
}

// rendering
// =

function update () {
  yo.update(document.querySelector('main'), yo`
    <main>
      <div class="archives-list">
        ${archivesList.archives.map(rArchive)}
      </div>
    </main>
  `)
}

function rArchive (archiveInfo) {
  console.log(archiveInfo)
  return yo`
    <div class="archive">
      <div class="info">
        <div class="title"><i class="fa fa-folder-o"></i> ${niceName(archiveInfo)}</div>
        <div class="description">${niceDesc(archiveInfo)}</div>
      </div>
      <div class="peers">
        ${archiveInfo.peers}
      </div>
      <div class="peer-history">
        <canvas id="history-${archiveInfo.key}" width="300" height="35" onload=${el => onCanvasLoad(el, archiveInfo)}></canvas>
      </div>
    </div>
  `
}

// event handlers
// =

function onCanvasLoad (canvas, archiveInfo) {
  sparkline(canvas, archiveInfo.peerHistory)
}

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return archiveInfo.description || yo`<em>No description</em>`
}
