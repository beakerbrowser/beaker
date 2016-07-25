import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { archiveEntries, entriesListToTree } from '../com/files-list'
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

// event emitter
var archivesEvents


// exported API
// =

export function setup () {  
  // start event stream and register events
  archivesEvents = emitStream(beaker.dat.archivesEventStream())
  // archivesEvents.on('update-archive', onUpdateArchive)
}

export function show () {
  fetchArchiveInfo(() => {
    // setup drag/drop
    if (archiveInfo.isOwner) {
      dragDrop('body', onDragDrop)
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
  var m = archiveInfo.manifest
  var v = archiveInfo.versionHistory
  var name = m.name || m.short_name || 'Untitled'

  // set page title
  document.title = name

  // optional els
  var nameEl = archiveInfo.isApp ? yo`<a href=${'dat://'+archiveInfo.key}>${name} <small class="icon icon-popup"> open app</small></a>` : name
  var versionEl = v.current ? yo`<div class="view-dat-version">v${v.current}</div>` : ''
  var ownerEl = ''
  if (archiveInfo.isOwner)
    ownerEl = yo`<div class="vdh-owner"><strong><span class="icon icon-pencil"></span> owner</strong></div>`
  var authorEl = ''
  if (m.author) {
    if (m.homepage_url)
      authorEl = yo`<div class="vdh-author">by <a href=${m.homepage_url} title=${m.author}>${m.author}</a></div>`
    else
      authorEl = yo`<div class="vdh-author">by ${m.author}</div>`
  }
  var descriptionEl = (m.description) ? yo`<div class="view-dat-desc"><p>${m.description}</p></div>` : ''
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
      <div class="vdu-instructions">Drag your files onto this page, or <a href="#" onclick=${onClickSelectFiles}>Select them manually.</a></div>
      <input type="file" multiple id="vdu-filepicker" onchange=${onChooseFiles}>
    </div>`
  }

  // stateful btns
  var subscribeBtn
  if (!archiveInfo.isOwner) {
    subscribeBtn = yo`<button class="btn btn-default subscribe-btn" onclick=${onToggleSubscribed}><span class="icon icon-eye"></span> Watch</button>`
    if (archiveInfo.isSubscribed) {
      subscribeBtn.classList.add('pressed')
    }
  }

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
          <div>Shared Folder</div>
          ${ownerEl}
          <div class="flex-spacer"></div>
          <div class="vd-actions">
            ${subscribeBtn}
          </div>
        </div>
        ${descriptionEl}
        ${uploadEl}
        <div class="view-dat-content">
          <div class="vdc-header">
            ${versionEl}
            <div class="flex-spacer"></div>
            <button class="btn btn-default btn-mini" onclick=${onClickOpenInExplorer}>
              <span class="icon icon-layout"></span> Open in Explorer
            </button>
            <button class="btn btn-default btn-mini" onclick=${onClickDownloadZip}>
              <span class="icon icon-install"></span> Download Zip
            </button>
          </div>
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

// internal methods
// =

function fetchArchiveInfo(cb) {
  beaker.dat.archiveInfo(archiveKey, (err, ai) => {
    console.log(ai)
    archiveInfo = ai
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