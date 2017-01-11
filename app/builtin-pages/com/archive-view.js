import * as yo from 'yo-yo'
import { createArchiveFlow } from '../com/modals/edit-site'
import { archiveAbout } from '../com/archive-about'
import { archiveFiles, onDragDrop, onClickSelectFiles } from '../com/archive-files'
import { archiveHistory } from '../com/archive-history'

// globals
// =

var currentView = 'about'

// exported api
// =

export function render (archive, opts = {}) {
  if (opts.viewError) return renderError(opts.viewError)
  if (!archive) return renderEmpty()
  return renderArchive(archive, opts)
}

function renderEmpty () {
  return yo`<div class="archive-view">
    <div class="archive-empty-banner">
      <h2>No site selected.</h2>
      <p>Share files, pages, and applications. <a onclick=${createArchiveFlow}>New site</a>.</p>
    </div>
  </div>`
}

function renderError (error) {
  return yo`<div class="archive">
    <div class="archive-error">
      <div class="archive-error-banner">
        <div class="icon icon-attention"></div>
        <div>The archive failed to load. ${error.toString()}. Sorry for the inconvenience.</div>
      </div>
      <div class="archive-error-narclink">
        <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report Issue</a>
        | 
        <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Request Help</a>
      </div>
    </div>
  </div>`
}

function renderArchive (archive, opts) {
  return yo`
    <div class="archive-view">
      <div class="archive-header">
        <h2><a href=${'dat://'+archive.info.key} title=${archive.niceName}>${archive.niceName}</a></h2>
        <p class="archive-desc">${rDescription(archive)}<br />${rEditBtn(archive)} ${rForkBtn(archive)} ${rSaveBtn(archive)}</p>
      </div>
      ${rSubnav(archive)}
      ${rView(archive)}
    </div>
  `
}

function rDescription (archive) {
  return (archive.info.description)
    ? yo`<span>${archive.info.description}</span>`
    : yo`<em>no description</em>`
}

function rEditBtn (archive) {
  return yo`<a href="#" style="margin-right: 10px"><span class="icon icon-pencil"></span> Edit</a>`
}

function rForkBtn (archive) {
  return yo`<a href="#" style="margin-right: 10px"><span class="icon icon-flow-branch"></span> Fork</a>`
}

function rSaveBtn (archive) {
  return yo`<a href="#" style="margin-right: 10px"><span class="icon icon-floppy"></span> Save</a>`
}

function rSubnav (archive) {
  function item (name, label) {
    var cls = name === currentView ? 'active' : ''
    return yo`<a class=${cls} onclick=${() => setCurrentView(name)}>${label}</a>`
  }
  return yo`<div class="archive-subnav">
    ${item('about', 'About')}
    ${item('files', 'Files')}
    ${item('history', 'History')}
  </div>`
}

function rView (archive) {
  switch (currentView) {
  case 'about': return archiveAbout(archive)
  case 'files': return archiveFiles(archive)
  case 'history': return archiveHistory(archive)
  }
}

// event handlers
// =

function setCurrentView (view) {
  currentView = view
  window.dispatchEvent(new Event('render'))
}