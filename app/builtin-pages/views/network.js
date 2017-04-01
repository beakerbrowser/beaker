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

  // render canvas regularly
  setInterval(() => {
    archivesList.archives.forEach(archiveInfo => {
      var canvas = document.querySelector(`#history-${archiveInfo.key}`)
      renderCanvas(canvas, archiveInfo)
    })
  }, 5e3)

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
  return yo`
    <div class="archive">
      <div class="info">
        <div class="title"><i class="fa fa-folder-o"></i> ${niceName(archiveInfo)}</div>
        <div class="description">${niceDesc(archiveInfo)}</div>
      </div>
      <div class="peer-history">
        <canvas
          id="history-${archiveInfo.key}"
          width="300" height="35"
          onload=${el => renderCanvas(el, archiveInfo)}
          onmousemove=${e => onCanvasMouseMove(e, archiveInfo)}
          onmouseleave=${e => onCanvasMouseLeave(e, archiveInfo)}
        ></canvas>
      </div>
      <div class="peers">
        ${archiveInfo.peers}
      </div>
    </div>
  `
}

function renderCanvas (canvas, archiveInfo) {
  sparkline(canvas, archiveInfo.peerHistory)
}

// event handlers
// =

function onCanvasMouseMove (e, archiveInfo) {
  e.target.mouseX = e.layerX
  sparkline(e.target, archiveInfo.peerHistory)
}

function onCanvasMouseLeave (e, archiveInfo) {
  delete e.target.mouseX
  sparkline(e.target, archiveInfo.peerHistory)
}

// helpers
// =

function niceName (archiveInfo) {
  return (archiveInfo.title || '').trim() || 'Untitled'
}

function niceDesc (archiveInfo) {
  return archiveInfo.description || yo`<em>No description</em>`
}
