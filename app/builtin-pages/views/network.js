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
  archivesList = new ArchivesList({listenNetwork: true})
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
        <h1>Your network</h1>
        ${archivesList.archives.map(rArchive)}
      </div>
    </main>
  `)
}

function rArchive (archiveInfo) {
  return yo`
    <div class="archive">
      <div class="peer-history">
        <canvas
          id="history-${archiveInfo.key}"
          width="300" height="40"
          onload=${el => renderCanvas(el, archiveInfo)}
          onmousemove=${e => onCanvasMouseMove(e, archiveInfo)}
          onmouseleave=${e => onCanvasMouseLeave(e, archiveInfo)}
        ></canvas>
      </div>
      <div class="info">
        <div class="title"><a href=${archiveInfo.url} class="link">${niceName(archiveInfo)}</a></div>
        <div class="status">${archiveInfo.peers} active peers</div>
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
