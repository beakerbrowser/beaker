/*
This uses the beakerDownloads API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import emitStream from 'emit-stream'
import prettyBytes from 'pretty-bytes'
import { ucfirst } from '../../lib/strings'

// globals
// =

var downloads

// exported API
// =

export function setup () {
  var dlEvents = emitStream(beakerDownloads.eventsStream())
  dlEvents.on('new-download', onNewDownload)
  dlEvents.on('updated', onUpdate)
  dlEvents.on('done', onUpdate)
}

export function show () {
  document.title = 'Downloads'
  co(function* () {
    downloads = yield beakerDownloads.getDownloads()
    render()
  })
}

export function hide () {
  downloads = null
}

// rendering
// =

function render () {
  var downloadEls = downloads.map(d => {
    var progress, actions
    if (d.state == 'progressing') {
      // progress
      let speed = (d.isPaused) ? 'Paused' : (prettyBytes(d.downloadSpeed) + '/s')
      progress = yo`<div class="download-item-progress">
        <progress value=${d.receivedBytes} max=${d.totalBytes}></progress>
        <small>${prettyBytes(d.receivedBytes) + ' / ' + prettyBytes(d.totalBytes)}</small>
        <small>${speed}</small>
      </div>`

      // actions
      actions = yo`<div>
        ${d.isPaused
          ? yo`<button class="btn" onclick=${e => onResume(e, d)}>resume</button>`
          : yo`<button class="btn" onclick=${e => onPause(e, d)}>pause</button>`}
        <button class="btn" onclick=${e => onCancel(e, d)}>cancel</button>
      </div>`
    } else if (d.state == 'completed') {
      // actions
      if (!d.fileNotFound) {
        actions = yo`<div class="bumpdown">
          <button class="btn" onclick=${e => onOpen(e, d)}>open file</button>
          <button class="btn" onclick=${e => onShow(e, d)}>show in folder</button>
        </div>`
      } else {
        actions = yo`<div>File not found (moved or deleted)</div>`
      }
    } else {
      // progress
      progress = yo`<div class="download-item-progress">
        ${ucfirst(d.state)}
      </div>`
    }

    // render download
    return yo`<div class="download-item">
      <div class="download-item-name">
        <strong><img src="beaker-favicon:"> ${d.name}</strong>
        ${d.state !== 'progressing'
          ? yo`<a onclick=${e => onRemove(e, d)}><span class="icon icon-cancel"></span></a>`
          : '' }
      </div>
      <div class="download-item-url"><a href=${d.url} target="_blank">${d.url}</a></div>
      ${progress}
      ${actions}
    </div>`
  }).reverse()

  // empty state
  if (downloadEls.length === 0) {
    downloadEls = yo`<div class="downloads-empty">No active or recent downloads.</div>`
  }

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="downloads">
      <div class="ll-heading">
        Downloads
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
        </div>
      ${downloadEls}
    </div>
  </div>`)
}

// event handlers
// =

function onNewDownload() {
  // do a little animation
  // TODO
}

function onUpdate (download) {
  if (!downloads)
    return

  // patch data each time we get an update
  var target = downloads.find(d => d.id == download.id)
  if (target) {
    // patch item
    for (var k in download)
      target[k] = download[k]
  } else
    downloads.push(download)
  render()
}

function onPause (e, download) {
  beakerDownloads.pause(download.id)
}

function onResume (e, download) {
  beakerDownloads.resume(download.id)
}

function onCancel (e, download) {
  beakerDownloads.cancel(download.id)
}

function onShow (e, download) {
  beakerDownloads.showInFolder(download.id)
    .catch(err => {
      download.fileNotFound = true
      render()
    })
}

function onOpen (e, download) {
  beakerDownloads.open(download.id)
    .catch(err => {
      download.fileNotFound = true
      render()
    })
}

function onRemove (e, download) {
  beakerDownloads.remove(download.id)
  downloads.splice(downloads.indexOf(download), 1)
  render()
}