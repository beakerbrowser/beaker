import * as yo from 'yo-yo'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { archiveEntries, entriesListToTree } from '../com/files-list'
import tabs from '../com/tabs'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'
import Remarkable from 'remarkable'


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
  // fetch archive data
  beaker.dat.archiveInfo(archiveKey, (err, ai) => {
    console.log(ai)
    archiveInfo = ai
    archiveEntriesTree = entriesListToTree(archiveInfo)

    // TODO: sort

    render()
  })

  // TODO
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
  var nameEl = archiveInfo.isApp ? yo`<a href=${'dat://'+archiveInfo.key} target="_blank">${name} <small class="icon icon-popup"></small></a>` : name
  var versionEl = v.current ? yo`<div class="view-dat-version">v${v.current}</div>` : ''
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

  // stateful btns
  var subscribeBtn = yo`<button class="btn btn-default subscribe-btn" onclick=${onToggleSubscribed}><span class="icon icon-eye"></span> Watch</button>`
  if (archiveInfo.isSubscribed) {
    subscribeBtn.classList.add('pressed')
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
          <div class="flex-spacer"></div>
          <div class="vd-actions">
            ${subscribeBtn}
          </div>
        </div>
        ${descriptionEl}   
        <div class="view-dat-content">
          <div class="vdc-header">
            ${versionEl}
            <div class="flex-spacer"></div>
            <button class="btn btn-default btn-mini"><span class="icon icon-install"></span> Download Zip</button>
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

function getPermDesc (perm) {
  switch (perm) {
    case 'fs':
      return 'Read and write files in a sandboxed folder.'
  }
}

// event handlers
// =

function onClick (archiveIndex) {
  return e => selectArchive(archiveIndex)
}

function onToggleNodeExpanded (node) {
  node.isOpen = !node.isOpen
  render()
}

function onToggleSubscribed () {
  var newState = !archiveInfo.isSubscribed
  beaker.dat.subscribe(archiveKey, newState, err => {
    if (err)
      return console.warn(err)
    archiveInfo.isSubscribed = newState
    render()
  })
}

function onUpdateArchive (update) {
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