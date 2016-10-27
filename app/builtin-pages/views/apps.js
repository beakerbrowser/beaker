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
  document.title = 'Applications'
  co(function * () {
    archivesList = new ArchivesList()
    yield archivesList.setup({
      filter: { isOwner: true }
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
      <div class="ll-heading">
        Installed Apps
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
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
