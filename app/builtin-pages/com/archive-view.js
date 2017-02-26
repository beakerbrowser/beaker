import * as yo from 'yo-yo'
import { createArchiveFlow, editArchiveFlow } from '../com/modals/edit-site'
import { forkArchiveFlow } from '../com/modals/fork-dat'
import { archiveAbout } from '../com/archive-about'
import { archiveFiles, onClickSelectFiles } from '../com/archive-files'
import { archiveHistory } from '../com/archive-history'
import { writeToClipboard } from '../../lib/fg/event-handlers'

// globals
// =

var currentView = 'about'
if (window.location.hash === '#files') {
  currentView = 'files'
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
      <h2 class="title">
        <a href=${'dat://'+archive.info.key} title=${archive.niceName}>${archive.niceName}</a>
      </h2>

      <a href=${'dat://' + archive.info.key} title=${archive.niceName} class="dat-url">
        dat://${archive.info.key}
      </a>
      <button class="btn" aria-label="Copy to clipboard" onclick=${writeToClipboard('dat://' + archive.info.key)}>
        <i class="fa fa-clipboard"></i>
      </button>
      <a href=${archive.info.key} target="_blank" class="btn">
        <i class="fa fa-external-link"></i>
      </a>

        <p class="archive-desc">${rDescription(archive)}<br />${rEditBtn(archive)} ${rForkBtn(archive)} ${rSaveBtn(archive)} ${rReadOnly(archive)}</p>
      ${rSubnav(archive)}
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

function rEditBtn (archive) {
  if (archive.info.isOwner) {
    return yo`<a onclick=${() => editArchiveFlow(archive)}><span class="icon icon-pencil"></span> Edit</a>`
  }
  return yo`<span class="disabled-a"><span class="icon icon-pencil"></span> Edit</span>`
}

function rForkBtn (archive) {
  return yo`<a onclick=${() => forkArchiveFlow(archive)}><span class="icon icon-flow-branch"></span> Fork</a>`
}

function rSaveBtn (archive) {
  if (archive.isSaved) {
    return yo`<a onclick=${() => archive.toggleSaved()}>
      <span class="icon icon-trash"></span> Delete
    </a>`
  }
  return yo`<a onclick=${() => archive.toggleSaved()}>
    <span class="icon icon-floppy"></span> Save
  </a>`
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