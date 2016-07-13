import * as yo from 'yo-yo'
import EE from 'events'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'

// FIX - weird bug, prependListener is expected but missing?
EE.prototype.prependListener = EE.prototype.on

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
  var selectedArchive = archives[selectedArchiveIndex]
  console.log(selectedArchiveInfo)

  // render downloads
  var downloadsRows = archives.map((archive, index) => {
    // is the selected archive?
    var isSelected = index === selectedArchiveIndex

    // status column
    var status = ''
    if (archive.isDownloading)
      status = 'Downloading'
    else if (archive.isSharing)
      status = 'Sharing'

    // render row
    return yo`<div class=${"fl-row"+(isSelected?' selected':'')} onclick=${onClick(index)}>
      <div class="fl-name">${archive.name||'Untitled'}</div>
      <div class="fl-author">${archive.author ? archive.author.name : ''}</div>
      <div class="fl-updated">${archive.mtime ? ucfirst(niceDate(archive.mtime)) : '--'}</div>
      <div class="fl-version">${archive.version || '--'}</div>
      <div class="fl-size">${archive.size ? prettyBytes(archive.size) : '--'}</div>
      <div class="fl-status">${status}</div>
    </div>`
  })
  // render archive details, if selected
  var downloadDetails = ''
  if (selectedArchiveInfo) {
    var version = selectedArchiveInfo.versionHistory.current
    downloadDetails = yo`
      <div class="download-details">
        <div class="dd-bar">
          <div class="dd-name">${selectedArchive.name||'Untitled'}</div>
          ${version ? yo`<div class="dd-version">v${version}</div>` : ''}
          <div class="dd-link">
            <span class="icon icon-link"></span>
            <a href="dat://${selectedArchive.key}/">dat://${selectedArchive.key}/</a>
          </div>
          <div><span class="icon icon-down-thin"></span> 0 kB/s</div>
          <div><span class="icon icon-up-thin"></span> 0 kB/s</div>
        </div>
        <div class="files-list">
          <div class="fl-rows">
            ${selectedArchiveInfo.entries.map(entry => {
              return yo`<div class="fl-row">
                <div class="fl-name"><a href="dat://${selectedArchive.key}/${entry.name}">${entry.name}</a></div>
                <div class="fl-updated">${entry.mtime ? niceDate(entry.mtime) : ''}</div>
                <div class="fl-size">${entry.length ? prettyBytes(entry.length) : ''}</div>
                <div class="fl-progress"><progress value="100" max="100">100 %</progress></div>
              </div>`
            })}
          </div>
        </div>
      </div>
    </div>`
  }

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="downloads">
      <div class="files-list">
        <div class="fl-head">
          <div class="fl-name">Name</div>
          <div class="fl-author">Author</div>
          <div class="fl-updated">Last Updated</div>
          <div class="fl-version">Version</div>
          <div class="fl-size">Size</div>
          <div class="fl-status">Status</div>
        </div>
        <div class="fl-rows">
          ${downloadsRows}
        </div>
      </div>
      ${downloadDetails}
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