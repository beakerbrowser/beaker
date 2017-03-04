import * as yo from 'yo-yo'
import { archiveFiles, onClickSelectFiles, addFiles } from '../com/archive-files'
import { archiveHistory } from '../com/archive-history'
import { writeToClipboard } from '../../lib/fg/event-handlers'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'
import { shortenHash } from '../../lib/strings'
import { pushUrl } from '../../lib/fg/event-handlers'

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
      <p>Share files, pages, and websites. <a class="link" onclick=${createArchive}>Create new archive</a>.</p>
    </div>
  </div>`
}

function renderError (error) {
  return yo`
    <div class="archive-view">
      <div class="message error archive-error">
        <div>
          <i class="fa fa-exclamation-triangle"></i>
          <span>Error: ${error.toString()}</span>

          <p>
            The archive failed to load. Sorry for the inconvenience.
          </p>
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
        ${rProvinence(archive)}
      </p>

      ${rMetadata(archive)}
      ${rToolbar(archive)}

      ${rView(archive)}
    </div>
  `
}

function rDescription (archive) {
  return (archive.info.description)
    ? yo`<span>${archive.info.description}</span>`
    : yo`<em>no description</em>`
}

function rProvinence (archive) {
  var els = []

  if (archive.forkOf) {
    els.push(yo`
      <p>
        <i class="fa fa-code-fork"></i>
        <span>Fork of</span>
        <a href=${viewUrl(archive.forkOf)} onclick=${pushUrl}>${shortenHash(archive.forkOf)}</a>
      </p>`
    )
  }

  if (archive.createdBy) {
    els.push(yo`
      <p>
        <i class="fa fa-code"></i>
        <a href=${viewUrl(archive.info.createdBy.url)} onclick=${pushUrl}>
          Created by ${archive.info.createdBy.title || shortenHash(archive.info.createdBy.url)}
        </a>
      </p>`
    )
  }

  return els
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
        ${''/*TODO do we need meta size? not currently given by the APIs<span>
          (${prettyBytes(archive.info.metaSize)} metadata)
        </span>*/}
      </div>
    </div>`
}

function rEditBtn (archive) {
  if (archive.info.isOwner) {
    return yo`
      <a class="edit" onclick=${() => editArchive(archive)}>
        <i class="fa fa-pencil"></i>
        Edit
      </a>`
  }
  return ''
}

function rToolbar (archive) {
  var inactiveView = currentView === 'files' ? 'history' : 'files'
  var addFilesBtn = ''

  if (archive.info.isOwner) {
    addFilesBtn = yo`
      <button class="btn" onclick=${() => onClickSelectFlies(archive)}>
        <i class="fa fa-plus"></i>
        <span>Add files</span>
      </button>`
  }

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

        ${addFilesBtn}
      </div>
    </div>`
}

function rForkBtn (archive) {
  return yo`
    <a onclick=${() => forkArchive(archive)}>
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
    <a onclick=${() => archive.toggleSaved()}>
      <i class="fa fa-save"></i>
      Save to library
    </a>`
}

function rReadOnly (archive) {
  if (archive.info.isOwner) return ''
  return yo`
    <span class="readonly">
      <i class="fa fa-eye-slash"></i>
      read-only
    </span>`
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

async function createArchive () {
  var archive = await DatArchive.create()
  window.history.pushState(null, '', viewUrl(archive.url))
}

function editArchive (archive) {
  archive.updateManifest()
}

async function forkArchive (archive) {
  var fork = await DatArchive.fork(archive)
  window.history.pushState(null, '', viewUrl(fork.url))
}

function showMenu () {
  var el = document.querySelector('.dropdown-items')
  document.querySelector('.dropdown-items').classList.add('visible')
  document.querySelector('.dropdown button').addEventListener('click', e => e.stopPropagation())
  document.body.addEventListener('click', hideMenu, {once: true, capture: true})
}

function hideMenu () {
  document.querySelector('.dropdown-items').classList.remove('visible')
  document.querySelector('.dropdown button').removeEventListener('click', e => e.stopPropagation())
}

function closeMenu () {
  // document.body.removeEventListener('keydown')
}

function viewUrl (url) {
  if (url.startsWith('dat://')) {
    return 'beaker:library/' + url.slice('dat://'.length)
  }
}
