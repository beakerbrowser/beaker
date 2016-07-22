import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { renderArchives, entriesListToTree } from '../com/files-list'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'

// globals
// =

// list of archives
var archives = []

// event emitter
var archivesEvents


// exported API
// =

export function setup () {  
  // start event stream and register events
  archivesEvents = emitStream(beaker.dat.archivesEventStream())
  archivesEvents.on('update-archive', onUpdateArchive)
}

export function show () {
  // fetch archives
  beaker.dat.subscribedArchives((err, list) => {
    archives = list
    console.log(archives)
    render()
  })

  // TODO
}

export function hide () {
  archives = null
}

// rendering
// =

function render () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="subscriptions">
      <h4>Watched Folders</h4>
      ${renderArchives(archives, { showHead: true })}
    </div>
  </div>`)
}

// event handlers
// =

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