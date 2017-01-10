/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import Archive from '../model/archive'
import md from '../../lib/fg/markdown'
import { pushUrl } from '../../lib/fg/event-handlers'
import dragDrop from '../../lib/fg/drag-drop'
import { throttle } from '../../lib/functions'
import { shortenHash } from '../../lib/strings'
import { archiveFiles, onDragDrop, onClickSelectFiles } from '../com/files-list'
import toggleable from '../com/toggleable'
import * as editArchiveModal from '../com/modals/edit-site'
import * as forkDatModal from '../com/modals/fork-dat'
import * as helpTour from '../com/help-tour'
import { archiveHistoryList, archiveHistoryMeta } from '../com/archive-history-list'

// globals
// =

var isViewActive = false
var archiveKey
var archive
var archiveError = false
var currentForkModal = null // currently visible fork modal: we need a reference to trigger rendering on download

// exported API
// =

export function setup () {
}

export function show (isSameView) {
  // navigation within the active view?
  if (isSameView && archiveKey === parseKeyFromURL()) {
    // just adjust current view
    setCurrentNodeByPath()
    setSiteInfoOverride()
    render()
    return
  }

  co(function * () {
    // start loading
    isViewActive = true
    archiveKey = parseKeyFromURL()
    if (!archiveKey) return
    setSiteInfoOverride()

    // render loading state
    document.title = 'Loading...'
    render()

    // load
    archive = new Archive()
    yield archive.fetchInfo(archiveKey)
    setCurrentNodeByPath()
    archive.on('changed', render)

    // render loaded state
    render()
    if (archive.info.isOwner) {
      dragDrop('.window', onDragDrop)
    }

    // now that it has loaded, redirect to dat:// if this was a timeout view
    if (window.location.hash === '#timeout') {
      var destURL = 'dat://' + /^archive\/(.*)/.exec(window.location.pathname)[1]
      console.log('Archive found! Redirecting to', destURL)
      window.location = destURL
      return
    }

    // run the tour if this is the owner's first time
    // TODO
    // const tourSeenSetting = 'has-seen-viewdat-tour'
    // var hasSeenTour = false
    // try { hasSeenTour = yield datInternalAPI.getGlobalSetting(tourSeenSetting) }
    // catch (e) {}
    // if (!hasSeenTour) {
    //   helpTour.startViewDatTour(archive.info.isOwner, render, true)
    //   yield datInternalAPI.setGlobalSetting(tourSeenSetting, true)
    // }
  }).catch(err => {
    // render the error state
    console.warn('Failed to fetch archive info', err)
    archiveError = err
    render()
  })
}

export function hide (isSameView) {
  if (isSameView && archiveKey === parseKeyFromURL()) {
    // do nothing, it's a navigation within the current archive's folder structure
    return
  }
  isViewActive = false
  archiveKey = null
  if (archive) archive.destroy()
  archive = null
  archiveError = false
  window.locationbar.clearSiteInfoOverride()
}

// rendering
// =

function render () {
  if (!isViewActive) {
    return
  }

  if (archiveError) {
    renderError()
  } else if (archive) {
    if (window.location.hash === '#history') {
      renderArchiveHistory()
    } else {
      renderArchive()
    }
  } else {
    renderLoading()
  }

  if (currentForkModal) {
    currentForkModal.rerender()
  }
}

function renderArchiveHistory () {
  const name = archive.info.title || 'Untitled'

  // set page title
  document.title = name

  // created-by
  var createdByEl = (archive.info.createdBy)
    ? yo`<span class="archive-created-by">
        <span class="icon icon-code"></span> Created by <a href=${archive.info.createdBy.url}>${archive.info.createdBy.title || shortenHash(archive.info.createdBy.url)}</a>
      </span>`
    : ''

  // description
  var descriptEl = archiveHistoryMeta(archive.info)

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="archive-heading">
        <div class="archive-name"><a href=${'dat://' + archive.info.key} title=${name}>${name}</a></div>
        <div class="archive-ctrls">
          ${createdByEl}
          <span id="owner-label">${archive.info.isOwner ? 'Owner' : 'Read-only'}</span>
        </div>
        <div class="archive-ctrls at-center"></div>
        <div class="page-toolbar">
          <div class="tabs">
            <a href=${'beaker:archive/' + archive.info.key} onclick=${pushUrl}>Current</a>
            <a class="current" href=${'beaker:archive/' + archive.info.key + '#history'} onclick=${pushUrl}>History</a>
          </div>
        </div>
      </div>
      <div class="archive-desc">${descriptEl}</div>
      <div class="archive-histories links-list">
        ${archiveHistoryList(archive.info)}
      </div>
    </div>
  </div>`)
}

function renderArchive () {
  const name = archive.info.title || 'Untitled'
  const wasDeleted = archive.info.isOwner && !archive.isSaved // TODO add definition for non-owner

  // set page title
  document.title = name

  // ctrls
  var forkBtn = yo`<a id="fork-btn" class="btn" title="Fork" onclick=${onClickFork}><span class="icon icon-flow-branch"></span> Fork</a>`
  var hostBtn = (archive.isHosting)
    ? yo`<a id="host-btn" class="btn pressed" title="Hosting" onclick=${onToggleHosting}><span class="icon icon-check"></span> Hosting</span>`
    : yo`<a id="host-btn" class="btn" title="Host" onclick=${onToggleHosting}><span class="icon icon-upload-cloud"></span> Host</a>`
  var openFolderBtn = yo`<a id="open-in-finder-btn" onclick=${onOpenInFinder}><span class="icon icon-popup"></span> Open in Finder</a>`
  var toggleSavedBtn = archive.isSaved
    ? yo`<a id="delete-btn" title="Delete Archive" onclick=${onToggleSave}><span class="icon icon-trash"></span> Delete Archive</a>`
    : yo`<a id="save-btn" title="Save Archive" onclick=${onToggleSave}><span class="icon icon-floppy"></span> Save Archive</a>`
  var dropdownBtn = toggleable(yo`<div class="dropdown-btn-container">
    <a class="toggleable btn"><span class="icon icon-down-open"></span></a>
    <div class="dropdown-btn-list">
      ${openFolderBtn}
      <hr>
      ${toggleSavedBtn}
      <hr>
      <a onclick=${e => helpTour.startViewDatTour(archive.info.isOwner, render)}><span class="icon icon-address"></span> Tour</a>
      <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
    </div>
  </div>`)

  // undo delete btn
  var undoDeleteBtn
  if (wasDeleted) {
    undoDeleteBtn = yo`<span class="archive-deleted">
      <span class="icon icon-trash"></span> Deleted
      (<a title="Undo Delete" onclick=${onToggleSave}>Undo</a>)
    </span>`
  }

  // fork-of
  var forkOfEl = archive.forkOf
    ? yo`<div class="archive-fork-of">
        <span class="icon icon-flow-branch"></span> Fork of <a href=${archive.forkOf}>${shortenHash(archive.forkOf)}</a>
      </div>`
    : ''

  // created-by
  var createdByEl = (archive.info.createdBy)
    ? yo`<span class="archive-created-by">
        <span class="icon icon-code"></span> Created by <a href=${archive.info.createdBy.url}>${archive.info.createdBy.title || shortenHash(archive.info.createdBy.url)}</a>
      </span>`
    : ''

  // description
  var descriptEl = (archive.info.description)
    ? yo`<span>${archive.info.description}</span>`
    : yo`<em>no description</em>`

  // manifest edit btn (a pain to construct so it's separate)
  var editBtn
  if (archive.info.isOwner) {
    editBtn = yo`<span><span></span> <a id="edit-dat-btn" onclick=${onEditArchive}>Edit</a></span>`
    editBtn.childNodes[0].innerHTML = '&mdash;'
  }

  // readme
  var readmeEl
  if (archive.info.readme) {
    readmeEl = yo`<div class="markdown"></div>`
    readmeEl.innerHTML = md.render(archive.info.readme)
  }

  // file adder el
  var addFilesEl
  if (archive.info.isOwner) {
    addFilesEl = yo`<div class="archive-add-files">
      <div class="instructions">To add files, drag their icons onto this page, or <a onclick=${onClickSelectFiles}>Select them manually.</a></div>
    </div>`
  }

  // progress bar for the entire dat
  var progressEl
  if (!archive.info.isOwner) {
    progressEl = yo`<div class="archive-progress"><progress value=${archive.files.progress} max="100"></progress></div>`
  }

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="archive-heading">
        <div class="archive-name"><a href=${'dat://'+archive.info.key} title=${name}>${name}</a></div>
        <div class="archive-ctrls">
          ${createdByEl}
          ${forkOfEl}
          <span id="owner-label">${ archive.info.isOwner ? 'Owner' : 'Read-only' }</span>
        </div>
        ${ wasDeleted
          ? yo`<div class="archive-ctrls at-center">${undoDeleteBtn}</div>`
          : yo`<div class="archive-ctrls at-center">${forkBtn} ${hostBtn} ${dropdownBtn}</div>` }
        <div class="page-toolbar">
          <div class="tabs">
            <a class="current" href=${'beaker:archive/' + archive.info.key} onclick=${pushUrl}>Current</a>
            <a class="" href=${'beaker:archive/' + archive.info.key + '#history'} onclick=${pushUrl}>History</a>
          </div>
        </div>
      </div>
      <div class="archive-desc">${descriptEl} ${editBtn}</div>
      ${addFilesEl}
      ${progressEl}
      ${archiveFiles(archive.files.currentNode, {onOpenFolder, archiveKey})}
      ${readmeEl}
    </div>
  </div>`)
}

function renderError () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="ll-heading">
        ${archiveKey.slice(0,8)}...
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      <div class="archive-error">
        <div class="archive-error-banner">
          <div class="icon icon-attention"></div>
          <div>The archive failed to load. ${archiveError.toString()}. Sorry for the inconvenience.</div>
        </div>
      </div>
    </div>
  </div>`)
}

function renderLoading () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="ll-heading">
        Loading...
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      <div class="archive-loading">
        <div class="archive-loading-banner">
          <div class="spinner"></div>
          <div>Searching the network for this archive. Please wait...</div>
        </div>
        <div class="archive-loading-tips">
          <p><strong>Try:</strong></p>
          <ul>
            <li>Checking your connection</li>
            <li>Checking your firewall settings</li>
          </ul>
          <p>
            If you are the author of this archive, make sure ${"it's"} being hosted on the network.
            <a href="https://beakerbrowser.com/docs/guides/cloud-hosting.html" target="_blank">More Help</a>
          </p>
        </div>
      </div>
    </div>
  </div>`)
}

// internal methods
// =

function parseKeyFromURL () {
  try {
    // extract
    return /^archive\/([0-9a-f]{64})/.exec(window.location.pathname)[1]
  } catch (e) {
    // the archiveKey is invalid, figure out why
    // was the dat:// included?
    if (window.location.pathname.startsWith('archive/dat://')) {
      // redirect to remove that
      window.location = 'beaker:archive/' + window.location.pathname.slice('archive/dat://'.length)
      return
    }

    // try a dns lookup
    let name = /^archive\/([^/]+)/.exec(window.location.pathname)[1]
    datInternalAPI.resolveName(name, (err, key) => {
      if (err) {
        archiveError = new Error('Invalid Dat URL')
        render()
      } else {
        // redirect
        window.location = 'beaker:archive/' + key
      }
    })
  }
}

// override the site info in the navbar
function setSiteInfoOverride () {
  var subpath = window.location.pathname.split('/').slice(2).join('/') // drop 'archive/{name}', take the rest
  window.locationbar.setSiteInfoOverride({
    title: 'Dat Viewer',
    url: 'dat://' + archiveKey + '/' + subpath + window.location.hash
  })
}

// use the current url's path to set the current rendered node
function setCurrentNodeByPath () {
  var names = window.location.pathname.split('/').slice(2) // drop 'archive/{name}', take the rest
  archive.files.setCurrentNodeByPath(names)
}

// event handlers: archive editor
// =

function onEditArchive (isNew) {
  isNew = isNew === true
  editArchiveModal.create(
    isNew ? {} : archive.info,
    { isNew, title: 'Edit Details', onSubmit: onSubmitEditArchive }
  )
}

function onSubmitEditArchive ({ title, description }) {
  archive.updateManifest({ title, description })
}

// event handlers: toolbar
// =

function onToggleSave () {
  archive.toggleSaved()
}

function onToggleHosting () {
  archive.toggleHosting()
}

function onOpenFolder (e, entry) {
  e.preventDefault()
  window.history.pushState(null, '', 'beaker:archive/' + archive.info.key + '/' + entry.path)
}

function onOpenInFinder () {
  archive.openInExplorer()
}

function onClickFork (e) {
  // create fork modal
  currentForkModal = forkDatModal.create(archive.info, {
    isDownloading: archive.isHosting,
    onClickDownload: onDownloadForkArchive,
    onSubmit: onSubmitForkArchive
  })
  currentForkModal.addEventListener('close', () => currentForkModal = null, { once: true })
}

function onDownloadForkArchive () {
  if (currentForkModal) {
    // download the entire tree
    archive.files.download()
    currentForkModal.rerender()
  }
}

function onSubmitForkArchive ({ title, description }) {
  // what do you do when you see a fork in the code?
  datInternalAPI.forkArchive(archiveKey, { title, description, origin: 'beaker:archives' }).then(newKey => {
    // you take it
    window.location = 'beaker:archive/' + newKey
  }).catch(err => {
    console.error(err) // TODO alert user
  })
}