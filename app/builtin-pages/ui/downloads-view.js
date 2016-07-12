import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import prettyBytes from 'pretty-bytes'

// globals
// =

// list of archives
var archives = []

// currently-selected archive index
var selectedArchiveIndex = -1

// currently-selected archive's info
var selectedArchiveInfo

// event-stream for changes to the archive-list
var archivesEventStream


// exported API
// =

export function setup () {
}

export function show () {
  // fetch archives
  beaker.dat.archives((err, list) => {
    archives = list
    console.log(archives)
    render()
  })

  // start archives event stream
  // TODO
}

export function hide () {
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
    downloadDetails = yo`
      <div class="download-details">
        <div class="dd-bar">
          <div class="dd-name">${selectedArchive.name||'Untitled'}</div>
          <div class="dd-version">v${selectedArchiveInfo.versionHistory.current}</div>
          <div class="dd-link">
            <span class="icon icon-link"></span>
            <a target="blank" href="dat://${selectedArchive.key}/">dat://${selectedArchive.key}/</a>
          </div>
          <div><span class="icon icon-down-thin"></span> 0 kB/s</div>
          <div><span class="icon icon-up-thin"></span> 0 kB/s</div>
        </div>
        <div class="files-list">
          <div class="fl-rows">
            ${selectedArchiveInfo.entries.map(entry => {
              return yo`<div class="fl-row">
                <div class="fl-name">${entry.name}</div>
                <div class="fl-updated">${entry.mtime ? niceDate(entry.mtime) : ''}</div>
                <div class="fl-progress"><progress value="100" max="100">100 %</progress></div>
                <div class="fl-size">${entry.length ? prettyBytes(entry.length) : ''}</div>
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
