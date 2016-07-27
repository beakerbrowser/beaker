import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { archiveEntries, entriesListToTree } from '../com/files-list'
import toggleable from '../com/toggleable'
import HypercoreStats from '../com/hypercore-stats'
import tabs from '../com/tabs'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'
import Remarkable from 'remarkable'
import dragDrop from 'drag-drop'
import fileReader from 'filereader-stream'
import pump from 'pump'

// globals
// =

var md = new Remarkable({
  html:         false,        // Enable HTML tags in source
  xhtmlOut:     false,        // Use '/' to close single tags (<br />)
  breaks:       false,        // Convert '\n' in paragraphs into <br>
  langPrefix:   'language-',  // CSS language prefix for fenced blocks
  linkify:      true,         // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer:  false,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed
  highlight: (str, lang) => { return ''; }
})

var archiveKey = (new URL(window.location)).host
var archiveInfo
var archiveEntriesTree
var archiveError = false

// event emitter
var archivesEvents

// stats tracker
var hypercoreStats


// exported API
// =

export function setup () {  
  // start event stream and register events
  archivesEvents = emitStream(beaker.dat.archivesEventStream())
  archivesEvents.on('update-archive', onUpdateArchive)
  archivesEvents.on('update-listing', onUpdateListing)
}

export function show () {
  // render loading state
  render()

  // get data
  fetchArchiveInfo(() => {
    if (archiveInfo) {
      // setup drag/drop
     if (archiveInfo.isOwner) {
        dragDrop('body', onDragDrop)
      }
      // setup stats
      hypercoreStats = new HypercoreStats(archivesEvents, { peers: archiveInfo.peers })
    }
    // render
    render()
  })
}

export function hide () {
}


// rendering
// =

function render () {
  if (archiveInfo)
    renderArchive()
  else if (archiveError)
    renderError()
  else
    renderLoading()
}

function renderArchive () {
  var name = archiveInfo.name || archiveInfo.short_name || 'Untitled'

  // set page title
  document.title = name

  // optional els
  var nameEl = archiveInfo.isApp ? yo`<a href=${'dat://'+archiveInfo.key}>${name}</a>` : name
  var ownerEl = ''
  if (archiveInfo.isOwner)
    ownerEl = yo`<div class="vdh-owner"><strong><span class="icon icon-pencil"></span> owner</strong></div>`
  var authorEl = ''
  if (archiveInfo.author) {
    if (archiveInfo.homepage_url)
      authorEl = yo`<div class="vdh-author">by <a href=${archiveInfo.homepage_url} title=${archiveInfo.author}>${archiveInfo.author}</a></div>`
    else
      authorEl = yo`<div class="vdh-author">by ${archiveInfo.author}</div>`
  }
  var descriptionEl = (archiveInfo.description) ? yo`<div class="view-dat-desc"><p>${archiveInfo.description}</p></div>` : ''
  var readmeEl
  if (archiveInfo.readme) {
    readmeEl = yo`<div class="vdc-readme"></div>`
    readmeEl.innerHTML = `
      <div class="vdc-header"><span class="icon icon-book-open"> README.md</div>
      <div class="vdc-readme-inner markdown">${md.render(archiveInfo.readme)}</div>
    `
  }
  var uploadEl
  if (archiveInfo.isOwner) {
    uploadEl = yo`<div class="view-dat-upload">
      <div class="vdu-instructions">To add files, drag their icons onto this page, or <a href="#" onclick=${onClickSelectFiles}>Select them manually.</a></div>
      <input type="file" multiple id="vdu-filepicker" onchange=${onChooseFiles}>
    </div>`
  }

  // stateful btns
  var subscribeBtn
  // TODO disabled for now, while we decide if it's needed -prf
  // if (!archiveInfo.isOwner) {
  //   subscribeBtn = yo`<button class="btn btn-default btn-mini subscribe-btn" onclick=${onToggleSubscribed}><span class="icon icon-eye"></span> Watch</button>`
  //   if (archiveInfo.isSubscribed) {
  //     subscribeBtn.classList.add('pressed')
  //   }
  // }

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="view-dat">
      <div class="view-dat-main">
        <div class="view-dat-header">
          <div class="vdh-title">
            <img class="favicon" src=${'beaker-favicon:dat://'+archiveInfo.key} />
            ${nameEl}
          </div>
          ${authorEl}
          <div class="flex-spacer"></div>
          <div class="vd-actions">
            ${subscribeBtn}
            ${toggleable((onToggle, isOpen) => yo`<div class="dropdown-btn-container">
              <div class="btn-group">
                <button class="btn btn-default btn-mini" onclick=${onClickOpenInExplorer}>
                  <span class="icon icon-layout"></span> Open in Explorer
                </button>
                <button class="btn btn-default btn-mini ${isOpen ? 'active' : ''}" onclick=${onToggle}><span class="icon icon-down-dir"></span></button>
              </div>
              ${isOpen
                ? yo`<div class="dropdown-btn-list" onmouseleave=${onToggle}>
                  <div onclick=${onClickDownloadZip}><span class="icon icon-floppy"></span> Save As .Zip File</div>
                </div>`
                : ''}
            </div>`)}
          </div>
        </div>
        ${descriptionEl}
        <div class="view-dat-content">
          <div class="vdc-header">
            <div class="view-dat-version"><span class="icon icon-flow-branch"></span> Files</div>
            <div class="flex-spacer"></div>
            ${ownerEl}
            ${hypercoreStats.render()}
          </div>
          ${uploadEl}
          ${archiveEntries(archiveEntriesTree, { showHead: false, showRoot: false, onToggleNodeExpanded })}
          ${readmeEl}
        </div>
      </div>
      ${''/*<div class="view-dat-side">
        <div class="feed">
          ${v.index.concat().reverse().map(id => {
            var l = v.log[id]
            var dateEl = (l.date) ? niceDate(l.date) : undefined
            return yo`<div class="feed-entry">
              <div class="fe-version">${l.version || ''}</div> 
              <div class="fe-message">${l.message||''}</div>
              <div class="fe-date">${l.date ? niceDate(l.date) : ''}</div>
            </div>`
          })}
        </div>
      </div>*/}
    </div>
  </div>`)
}

function renderError () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="error">
      <div class="e-banner">
        <div class="icon icon-attention"></div>
        <div>The site failed to load. ${archiveError.toString()}. Sorry for the inconvenience.</div>
      </div>
    </div>
  </div>`)
}

function renderLoading () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="loading">
      <div class="l-banner">
        <div class="spinner"></div>
        <div>Searching the Dat Network for this site. Please wait...</div>
      </div>
    </div>
  </div>`)
}

// internal methods
// =

function fetchArchiveInfo(cb) {
  beaker.dat.archiveInfo(archiveKey, (err, ai) => {
    console.log(ai)
    archiveError = err
    archiveInfo = ai
    if (archiveInfo)
      archiveEntriesTree = entriesListToTree(archiveInfo)
    cb()
  })
}

function addFiles (files) {
  var i = 0
  loop()
  function loop () {
    if (i === files.length) {
      // re-render
      console.log('added files', files)
      fetchArchiveInfo(render)
      return
    }
    var file = files[i++]
    var stream = fileReader(file)
    var entry = { name: (file.fullPath||file.name).replace(/^\//, ''), mtime: Date.now(), ctime: Date.now() }
    pump(
      stream,
      beaker.dat.createFileWriteStream(archiveKey, entry),
      err => {
        if (err) {
          console.error('Error writing file', entry, err)
          // TODO inform user!
        }
        loop()
      }
    )
  }
}

// event handlers
// =

function onClickDownloadZip () {
  window.open('view-dat://'+archiveKey+'?as=zip')
}

function onClickOpenInExplorer () {
  beaker.dat.openInExplorer(archiveKey)
}

function onToggleNodeExpanded (node) {
  node.isOpen = !node.isOpen
  render()
}

function onToggleSubscribed () {
  var newState = !archiveInfo.isSubscribed
  beaker.dat.subscribe(archiveKey, newState, err => {
    if (err)
      return console.warn(err) // TODO inform user
    archiveInfo.isSubscribed = newState
    render()
  })
}

// TODO
// this is disabled for now.
// adds complexity, and I'm not sure it's needed yet.
// -prf
// function onClickClone (e) {
//   beaker.dat.clone(archiveKey, (err, newKey) => {
//     if (err)
//       return console.warn(err) // TODO inform user
//     window.location = 'view-dat://'+newKey
//   })
// }

function onDragDrop (files) {
  addFiles(files)
}

function onClickSelectFiles (e) {
  e.preventDefault()
  document.querySelector('#vdu-filepicker').click()
}

function onChooseFiles (e) {
  var filesInput = document.querySelector('#vdu-filepicker')
  var files = Array.from(filesInput.files)
  console.log(files)
  filesInput.value = '' // clear the input
  addFiles(files)
}

function onUpdateArchive (update) {
  if (update.key == archiveKey && archiveInfo) {
    // patch the archive
    for (var k in update)
      archiveInfo[k] = update[k]
    render()
  }
}

function onUpdateListing (update) {
  if (update.key == archiveKey) {
    // simplest solution is just to refetch the entries
    fetchArchiveInfo(render)
  }
}