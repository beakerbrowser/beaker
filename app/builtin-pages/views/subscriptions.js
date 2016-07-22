import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'
import collect from 'stream-collector'

const FETCH_AMT = 20

// globals
// =

// update feed
var feed = []
var isFeedEnded = false

// list of archives
var archives = []
var archiveNames = {} // map of key->name


// exported API
// =

export function setup () {  
}

export function show () {
  // fetch archives
  beaker.dat.subscribedArchives((err, list) => {
    archives = list
    archives.forEach(a => archiveNames[a.key] = a.name)
    render()
  })

  // fetch stream
  fetchStreamNext()
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

function fetchStreamNext () {
  var lastKey = feed.length ? feed[feed.length - 1].key : undefined
  collect(beaker.dat.subscribedFeedStream({ limit: FETCH_AMT, lt: lastKey, reverse: true }), (err, values) =>{
    console.log(values)
    if (values.length)
      feed = feed.concat(values)
    if (values.length < FETCH_AMT)
      isFeedEnded = true
    render()
  })
}

// rendering
// =

function render () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="subscriptions">

      <div class="feed">

        ${feed.map(entry => {
          entry = entry.value

          if (!entry.version)
            return

          var dateEl = (entry.date) ? niceDate(entry.date) : undefined
          return yo`<div class="feed-entry">                
            <a class="fe-site" href="dat://${entry.archiveKey}">${archiveNames[entry.archiveKey]}</a>
            <div class="fe-message">published</div>
            <div class="fe-version">${entry.version ? entry.version : ''}</div>
            <div class="fe-date">${entry.date ? niceDate(entry.date) : ''}</div>
          </div>`
        })}

        ${!isFeedEnded ? yo`<button class="btn btn-default btn-large feed-loadmore" onclick=${fetchStreamNext}>Load More</button>` : ''}

      </div>

      <div class="list">
        <div class="list-inner">
          <div>Watching</div>
          ${archives.map(archive => yo`<a href="dat://${archive.key}">
            <img class="favicon" src="beaker-favicon:dat://${archive.key}" />
            ${archive.name}
          </a>`)}
        </div>
      </div>
    </div>
  </div>`)
}

// event handlers
// =
