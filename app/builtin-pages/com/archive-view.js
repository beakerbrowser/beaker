import * as yo from 'yo-yo'
import co from 'co'
import { createArchiveFlow, editArchiveFlow } from '../com/modals/edit-site'
import { forkArchiveFlow } from '../com/modals/fork-dat'
import { archiveFiles, onClickSelectFiles, addFiles } from '../com/archive-files'
import { archiveHistory } from '../com/archive-history'
import { writeToClipboard } from '../../lib/fg/event-handlers'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'

// globals
// =

var currentView = 'files'
if (window.location.hash === '#history') {
  currentView = 'history'
}

// exported api
// =

export function render (archive, opts = {}) {
  if (opts.viewError) return renderError(opts.viewError)
  if (opts.viewIsLoading) return renderLoading()
  if (!archive) return renderEmpty()
  return renderArchive(archive, opts)
}

function renderEmpty () {
  return yo`<div class="archive-view">
    <div class="archive-empty-banner">
      <h2>Library</h2>
      <p>Share files, pages, and applications. <a onclick=${createArchiveFlow}>New site</a>.</p>
    </div>
  </div>`
}

function renderError (error) {
  return yo`<div class="archive-view">
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

function renderLoading () {
  return yo`<div class="archive-view">
    <div class="archive-loading">
      <div class="archive-loading-banner">
        <div class="spinner"></div>
        <div>Searching the network for this site. Please wait...</div>
      </div>
      <div class="archive-loading-tips">
        <p><strong>Try:</strong></p>
        <ul>
          <li>Checking your connection</li>
          <li>Checking your firewall settings</li>
        </ul>
        <p>
          Having trouble? <a href="https://groups.google.com/forum/#!forum/beaker-browser" target="_blank">Ask for help</a> or <a href="https://github.com/beakerbrowser/beaker/issues" target="_blank">Report a bug</a>.
        </p>
      </div>
    </div>
  </div>`
}

function renderArchive (archive, opts) {
  return yo`
    <div class="archive-view">
      <div class="archive-view-header">
        <h2 class="title">
          <a href=${'dat://'+archive.info.key} title=${archive.niceName}>${archive.niceName}</a>
        </h2>

        ${rMenu(archive)}
      </div>

      <p class="archive-desc">
        ${rDescription(archive)}
        ${rReadOnly(archive)}
      </p>

      ${rMetadata(archive)}
      ${rToolbar(archive)}

      ${rView(archive)}
      <div class="archive-tip">
        <div>Tip: click the <span class="icon icon-flash"></span> in the site${"'"}s URL bar to turn on live-reloading. Great for development!</div>
        <div>Power users: Use the <a href="https://github.com/beakerbrowser/bkr" title="bkr" target="_blank">bkr cli</a> to checkout, develop, and publish sites.</div>
      </div>
    </div>
  `
}

function rDescription (archive) {
  return (archive.info.description)
    ? yo`<span>${archive.info.description}</span>`
    : yo`<em>no description</em>`
}

function rMetadata (archive) {
  return yo`
    <div class="archive-metadata">
     <div class="history">
        <i class="fa fa-history"></i>
        <a onclick=${() => setCurrentView('history')}>Updated ${niceDate(archive.info.mtime)}</a>
      </div>
      <div class="size">
        <i class="fa fa-info-circle"></i>
        <span>
          ${prettyBytes(archive.info.size)}
        </span>
        <span>
          (${prettyBytes(archive.info.metaSize)} metadata)
        </span>
      </div>
    </div>`
}

function rEditBtn (archive) {
  if (archive.info.isOwner) {
    return yo`
      <a class="edit" onclick=${() => editArchiveFlow(archive)}>
        <i class="fa fa-pencil"></i>
        Edit
      </a>`
  }
  return ''
}

function rToolbar (archive) {
  var inactiveView = currentView === 'files' ? 'history' : 'files'

  if (archive.info.isOwner) {
    return yo`
      <div class="archive-toolbar">
        <a class="view-link" onclick=${() => setCurrentView(inactiveView)}>View ${inactiveView}</a>
        <div class="btn-bar">
          <button class="btn" onclick=${writeToClipboard('dat://' + archive.info.key)}>
            <i class="fa fa-clipboard"></i>
            <span>Copy URL</span>
          </button>
          <a class="btn" href=${'dat://' + archive.info.key} target="_blank">
            <i class="fa fa-external-link"></i>
            <span>Open</span>
          </a>
          <button class="btn" onclick=${() => onClickSelectFiles(archive)}>
            <i class="fa fa-plus"></i>
            <span>Add files</span>
          </button>
        </div>
      </div>`
  }
}

function rForkBtn (archive) {
  return yo`
    <a onclick=${() => forkArchiveFlow(archive)}>
      <i class="fa fa-code-fork"></i>
      Fork
    </a>`
}

function rSaveBtn (archive) {
  if (archive.isSaved) {
    return yo`
      <a onclick=${() => archive.toggleSaved()}>
        <i class="fa fa-trash"></i>
        Remove from library
      </a>`
  }
  return yo`
    <button onclick=${() => archive.toggleSaved()}>
      <i class="fa fa-save"></i>
      Save to library
    </button>`
}

function rReadOnly (archive) {
  if (archive.info.isOwner) return ''
  return yo`<span class="thin muted">Read-only</span>`
}

function rSubnav (archive) {
  function item (name, label) {
    var cls = name === currentView ? 'active' : ''
    return yo`<a class=${cls} onclick=${() => setCurrentView(name)}>${label}</a>`
  }
  return yo`<div class="archive-subnav">
    ${item('files', 'Files')}
    ${item('history', 'History')}
  </div>`
}

function rView (archive) {
  switch (currentView) {
  case 'files': return archiveFiles(archive)
  case 'history': return archiveHistory(archive)
  }
}

function rMenu (archive) {
  return yo`
    <div class="archive-view-menu dropdown">
      <button onclick=${showMenu}>
        <i class="fa fa-chevron-down"></i>
      </button>
      ${rMenuItems(archive)}
   </div>`
}

function rMenuItems (archive) {
  return yo`
    <ul class="dropdown-items">
      <li>${rEditBtn(archive)}</li>
      <li>${rForkBtn(archive)}</li>
      <li>${rSaveBtn(archive)}</li>
    </ul>`
}

// event handlers
// =

function setCurrentView (view) {
  currentView = view
  window.dispatchEvent(new Event('render'))
}

function showMenu () {
  var el = document.querySelector('.dropdown-items')
  document.querySelector('.dropdown-items').classList.add('visible')
  document.querySelector('.dropdown').addEventListener('click', e => e.stopPropagation())
  document.body.addEventListener('click', hideMenu)
}

function hideMenu () {
  document.querySelector('.dropdown-items').classList.remove('visible')
  document.querySelector('.dropdown').removeEventListener('click', e => e.stopPropagation())
  document.body.removeEventListener('click', hideMenu)
}

function closeMenu () {
  // document.body.removeEventListener('keydown')
}
