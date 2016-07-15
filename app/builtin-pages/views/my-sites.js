import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'

// globals
// =

// list of archives
var archives = []

// currently-selected archive index
var selectedArchiveIndex = -1

// currently-selected archive's info
var selectedArchiveInfo

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
  beaker.dat.archives((err, list) => {
    archives = list
    console.log(archives)
    render()
  })

  // TODO
}

export function hide () {
  archives = null
}

// internal methods
// =

function selectArchive (archiveIndex) {
  // update selection and render change
  selectedArchiveIndex = archiveIndex
  selectedArchiveInfo = null
  render()

  // fetch archive info
  var archive = archives[archiveIndex]
  beaker.dat.archiveInfo(archive.key, (err, info) => {
    if (err)
      console.warn(err)
    selectedArchiveInfo = info
    render()
  })
}

// rendering
// =

function render () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div style="padding: 10px; background: yellow; border: 1px solid; color: #775618"><span class="icon icon-attention"></span> This page is a placeholder. It has not been implemented yet.</div>
    <div class="apps">
      <div class="apps-list">

        <div class="al-row">
          <div class="al-top">
            <span class="al-title">
              <img class="favicon" src=${'beaker-favicon:https://news.ycombinator.com'} />
              Hacker News
            </span>
            <span>
              <a href="#">Details</a>
            </span>
          </div>
          <div class="al-bottom">
            <span>1.0.0</span>
            <span style="flex: 1">by <a href="#">YCombinator</a></span>
            <span>Updating <progress value="70" max="100">70 %</progress></span>
          </div>
        </div>

        <div class="al-row">
          <div class="al-top">
            <span class="al-title">
              <img class="favicon" src=${'beaker-favicon:https://www.reddit.com'} />
              Bacon Narwhal
            </span>
            <span>
              <a href="#">Details</a>
            </span>
          </div>
          <div class="al-bottom">
            <span>3.4.0</span>
            <span style="flex: 1">by <a href="#">Reddit</a></span>
            <span>Updated Monday</span>
          </div>
        </div>

        <div class="al-row">
          <div class="al-top">
            <span class="al-title">
              <img class="favicon" src=${'beaker-favicon:https://imgur.com'} />
              Imgur .dat
            </span>
            <span>
              <a href="#">Details</a>
            </span>
          </div>
          <div class="al-bottom">
            <span>0.0.8</span>
            <span style="flex: 1">by <a href="#">Imgur</a></span>
            <span>Updated July 1</span>
          </div>
        </div>

      </div>
    </div>
  </div>`)
}

// event handlers
// =

function onClick (archiveIndex) {
  return e => selectArchive(archiveIndex)
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