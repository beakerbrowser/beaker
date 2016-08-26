/*
This uses the datInternalAPI API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import Remarkable from 'remarkable'
import prettyBytes from 'pretty-bytes'
import { create as createModal } from '../com/modal'
import { fileEntries, entriesListToTree } from '../com/files-list'
import { niceDate } from '../../lib/time'
import { ucfirst, pluralize } from '../../lib/strings'

// globals
// =

var siteKey
var siteName
var siteInfo
var siteEntriesTree
var siteError = false

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

// exported API
// =

export function setup () {
  if (!window.datInternalAPI)
    return console.warn('Dat plugin is required for the Site page.')
}

export function show () {
  siteKey = (new URL(window.location)).pathname.slice(5)
  document.title = 'Loading... - Site Editor'
  co(function*(){
    // load site
    try {
      yield fetchArchiveInfo()
    } catch (e) {}

    // render
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  // toolbar buttons
  var editDetailsBtn = (siteInfo.isOwner)
    ? yo`<a title="Edit Details">Edit</a>`
    : ''
  var openSiteBtn = yo`<a class="btn" title="View Site" href=${'dat://'+siteKey} target="_blank"><span class="icon icon-popup"></span> View Site</a>`
  var copyLinkBtn = yo`<button class="btn" title="Copy Link" onclick=${onCopyLink}><span class="icon icon-link"></span> Copy Link</button>`
  var openFolderBtn = yo`<button class="btn" title="Open Folder"><span class="icon icon-folder"></span> Open Folder</button>`
  var exportFilesBtn = yo`<button class="btn" title="Export .Zip"><span class="icon icon-export"></span> Export Files</button>`

  // readme
  var readmeEl
  if (siteInfo.readme) {
    readmeEl = yo`<div class="section site-readme"></div>`
    readmeEl.innerHTML = `
      <div class="section-header"><span class="icon icon-book-open"> README.md</div>
      <div class="section-body markdown">${md.render(siteInfo.readme)}</div>
    `
  }

  // render view
  var dash = yo`<span></span>`
  dash.innerHTML = '&mdash;'
  var mtime = siteInfo.mtime ? ucfirst(niceDate(siteInfo.mtime)) : '--'
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="site">
      <div class="section">
        <div class="site-heading">
          <div><strong>${siteName}</strong></div>
          <div>${siteInfo.description} ${dash} ${editDetailsBtn}</div>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <div class="btn-group">${openSiteBtn}${copyLinkBtn}</div>
            ${exportFilesBtn}
          </div>
        </div>
      </div>
      <div class="section">
        <div class="section-header"><span class="icon icon-flow-cascade"></span> Files</div>
        <div class="section-body">
          ${fileEntries(siteEntriesTree, { showHead: false, showRoot: false, onToggleNodeExpanded, siteKey })}
          ${''/* TODO needed? <div class="site-summary">
            <span>Updated: ${mtime}</span>
            <span>Size: ${siteInfo.size ? prettyBytes(siteInfo.size) : '0 B'}</span>
          </div>*/}
          <div class="site-help">
            ${ siteInfo.isOwner
              ? yo`<div><span class="icon icon-info-circled"></span> To import files, drag their icons onto this page, or <a href="#" onclick=${onClickSelectFiles}>Select them manually.</a></div>`
              : yo`<div><span class="icon icon-info-circled"></span> This is somebody else's site. It's in read-only mode.</div>` }
          </div>
        </div>
      </div>
      ${readmeEl}
    </div>
  </div>`)
}

// event handlers
// =

function onCopyLink () {
  // TODO
}

function onToggleNodeExpanded (node) {
  node.isOpen = !node.isOpen
  render()
}

function onClickSelectFiles () {

}

// helpers
// =

function fetchArchiveInfo() {
  return co(function* () {
    console.log('Looking up', siteKey)

    // run request
    siteInfo = yield datInternalAPI.getArchiveInfo(siteKey)
    siteEntriesTree = entriesListToTree(siteInfo)
    siteName = (siteInfo.name || siteInfo.short_name || 'Untitled')
    document.title = siteName + ' - Site Editor'

    console.log(siteName, siteInfo)
  }).catch(err => {
    console.warn('Failed to fetch archive info', err)
    siteError = err
  })
}
