/*
This uses the beakerBrowser API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'
import prettyBytes from 'pretty-bytes'
import emitStream from 'emit-stream'
import dragDrop from 'drag-drop'
import Remarkable from 'remarkable'
import pump from 'pump'
import path from 'path'
import { pushUrl } from '../../lib/fg/event-handlers'
import { niceDate } from '../../lib/time'
import { ucfirst } from '../../lib/strings'
import { archiveEntries, entriesListToTree, calculateTreeSizeAndProgress } from '../com/files-list'
import toggleable from '../com/toggleable'
import HypercoreStats from '../com/hypercore-stats'
import * as editArchiveModal from '../com/modals/edit-site'
import * as helpTour from '../com/help-tour'

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

var isViewActive = false
var archiveKey
var archiveInfo
var archiveEntriesTree
var archiveCurrentNode = null
var archiveError = false
var hideDotfiles = true
var hypercoreStats

// event emitter
var archivesEvents

// exported API
// =

export function setup () {
  // wire up events
  archivesEvents = emitStream(datInternalAPI.archivesEventStream())
  archivesEvents.on('update-archive', onUpdateArchive)
  archivesEvents.on('update-listing', onUpdateListing)
  archivesEvents.on('download', onDownload)
}

export function show () {
  isViewActive = true
  archiveKey = /^archive\/([0-9a-f]+)/.exec(window.location.pathname)[1]
  document.title = 'Loading...'
  render() // render loading state
  co(function* () {
    try {
      yield fetchArchiveInfo()
    } catch (e) {}

    // now that it has loaded, redirect to dat:// if this was a timeout view
    if (window.location.hash == '#timeout') {
      var destURL = 'dat://'+window.location.host + window.location.pathname
      console.log('Archive found! Redirecting to', destURL)
      window.location = destURL
      return
    }

    // render
    hypercoreStats = new HypercoreStats(archivesEvents, { archiveInfo })
    render()
    if (archiveInfo.isOwner) {
      dragDrop('.window', onDragDrop)
    }

    // run the tour if this is the owner's first time
    if (archiveInfo.isOwner) {
      var hasSeenTour = false
      try { hasSeenTour = yield datInternalAPI.getGlobalSetting('has-seen-viewdat-owner-tour') }
      catch (e) {}
      if (!hasSeenTour) {
        helpTour.startViewDatTour(true)
        yield datInternalAPI.setGlobalSetting('has-seen-viewdat-owner-tour', true)
      }
    }
  })
}

export function hide () {
  isViewActive = false
  archiveKey = null
  archiveInfo = null
  archiveEntriesTree = null
  archiveCurrentNode = null
  archiveError = false
  hypercoreStats.destroy()
  hypercoreStats = null
}

// rendering
// =

function render () {
  if (!isViewActive) {
    return
  }

  if (archiveInfo) {
    renderArchive()
  } else if (archiveError) {
    renderError()
  } else {
    renderLoading()
  }
}

function renderArchive () {
  const name = archiveInfo.title || 'Untitled' 
  const url = 'dat://'+archiveInfo.key

  // set page title
  document.title = name

  // optional els
  // var authorEl = ''
  // if (archiveInfo.author) {
  //   if (archiveInfo.homepage_url)
  //     authorEl = yo`<div class="dat-author">by <a href=${archiveInfo.homepage_url} title=${archiveInfo.author}>${archiveInfo.author}</a></div>`
  //   else
  //     authorEl = yo`<div class="dat-author">by ${archiveInfo.author}</div>`
  // }

  // toolbar buttons
  var ownerEl = (archiveInfo.isOwner)
    ? yo`<span><span class="icon icon-pencil"></span> Owner</span>`
    : ''
  var serveBtn = (archiveInfo.userSettings.isServing)
    ? yo`<a id="share-btn" class="btn btn-primary glowing" title="Sharing" onclick=${onToggleServing}><span class="icon icon-share"></span> Sharing</span>`
    : yo`<a id="share-btn" class="btn" title="Share" onclick=${onToggleServing}><span class="icon icon-share"></span> Share</a>`
  var copyLinkBtn = yo`<button id="copy-link-btn" class="btn" title="Copy Link" onclick=${onCopyLink}><span class="icon icon-link"></span> Copy Link</button>`
  var exportZipFileBtn = yo`<a class="btn" title="Export as .Zip File" href="/?as=zip"><span class="icon icon-export"></span> Export .Zip</a>`
  var saveArchiveBtn = (archiveInfo.userSettings.isSaved)
    ? yo`<a class="btn" title="Delete" onclick=${onToggleSave}><span class="icon icon-trash"></span> Delete</a>`
    : yo`<a class="btn" title="Save" onclick=${onToggleSave}><span class="icon icon-floppy"></span> Save</a>`
  var addFilesBtn = (archiveInfo.isOwner)
    ? yo`<a id="add-files-btn" class="btn" title="Add Files" onclick=${onClickSelectFiles}><span class="icon icon-plus"></span> Add Files</a>`
    : ''

  // manifest edit btn (a pain to construct so it's separate)
  var editBtn
  if (archiveInfo.isOwner) {
    editBtn = yo`<span><span></span> <a id="edit-dat-btn" onclick=${onEditArchive}>Edit</a></span>`
    editBtn.childNodes[0].innerHTML = '&mdash;'
  }

  // description
  var descriptEl = (archiveInfo.description)
    ? yo`<span>${archiveInfo.description}</span>`
    : yo`<em>No description</em>`


  // readme
  var readmeEl
  if (archiveInfo.readme) {
    readmeEl = yo`<div class="markdown"></div>`
    readmeEl.innerHTML = md.render(archiveInfo.readme)
  }

  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="ll-heading">
        <a href="beaker:archives" onclick=${pushUrl}>Files <span class="icon icon-right-open"></span></a>
        ${name}
        <span class="btn-group">
          ${serveBtn}
        </span>
        <span class="btn-group">
          ${copyLinkBtn}${exportZipFileBtn}${saveArchiveBtn}
        </span>
        <span class="btn-group">
          ${addFilesBtn}
        </span>
        <small id="owner-label" class="ll-heading-group">
          ${ archiveInfo.isOwner 
            ? yo`<span><span class="icon icon-pencil"></span> owner</span>`
            : 'read-only' }
        </small>
        <small class="ll-heading-right">
          <a onclick=${e => helpTour.startViewDatTour(archiveInfo.isOwner)}><span class="icon icon-address"></span> Tour</a>
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>

      <div class="archive-summary">
        <div>${descriptEl} ${editBtn}</div>
        <div class="flex-spacer"></div>
        ${ hypercoreStats.render() }
      </div>
      ${archiveEntries(archiveCurrentNode, {
        onOpenFolder,
        onDownloadNode,
        onToggleHidden,
        archiveKey,
        hideDotfiles
      })}
      ${readmeEl}
      <input class="hidden-file-adder" type="file" multiple onchange=${onChooseFiles} />
    </div>
  </div>`)
}

function renderError () {
  // render view
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="archive">
      <div class="ll-heading">
        <a href="beaker:archives" onclick=${pushUrl}>Files <span class="icon icon-right-open"></span></a>
        Error
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      <div class="error">
        <div class="e-banner">
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
        <a href="beaker:archives" onclick=${pushUrl}>Files <span class="icon icon-right-open"></span></a>
        Loading...
        <small class="ll-heading-right">
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      <div class="loading">
        <div class="l-banner">
          <div class="spinner"></div>
          <div>Searching the network for this archive. Please wait...</div>
        </div>
        <div class="l-tips">
          <p><strong>Try:</strong></p>
          <ul>
            <li>Checking your connection</li>
            <li>Checking your firewall settings</li>
          </ul>
          <p>
            If you are the author of this archive, make sure it's being hosted on the network.
            <a href="https://beakerbrowser.com/docs/guides/cloud-hosting.html" target="_blank">More Help</a>
          </p>
        </div>
      </div>
    </div>
  </div>`)
}

// internal methods
// =

function fetchArchiveInfo (cb) {
  return co(function* () {
    // run request
    archiveInfo = yield datInternalAPI.getArchiveInfo(archiveKey)
    if (archiveInfo) {
      archiveEntriesTree = entriesListToTree(archiveInfo)
      calculateTreeSizeAndProgress(archiveInfo, archiveEntriesTree)
    }
    console.log(archiveInfo)
    console.log(archiveEntriesTree)
    setCurrentNodeByPath()
    cb && cb()
  }).catch(err => {
    console.warn('Failed to fetch archive info', err)
    archiveError = err
  })
}

function setCurrentNodeByPath () {
  archiveCurrentNode = archiveEntriesTree
  var nodepath = window.location.pathname.slice(1)
  if (!nodepath)
    return // at root

  // descend to the correct node (or as far as possible)
  var names = nodepath.split('/')
  for (var i=0; i < names.length; i++) {
    var child = archiveCurrentNode.children[names[i]]
    if (!child || child.entry.type != 'directory')
      return // child dir not found, stop here
    archiveCurrentNode = child
  }
}

// event handlers: archive editor 
// =

function onEditArchive (isNew) {
  isNew = isNew === true
  editArchiveModal.create(
    isNew ? {} : archiveInfo,
    { isNew, title: 'Edit Details', onSubmit: onSubmitEditArchive }
  )
}

function onSubmitEditArchive ({ title, description }) {
  // send write to the backend
  datInternalAPI.updateArchiveManifest(archiveInfo.key, { title, description })
    .catch(console.warn.bind(console, 'Failed to update manifest'))
}

// event handlers: files uploader 
// =

function onClickSelectFiles (e) {
  e.preventDefault()
  document.querySelector('input[type="file"]').click()
}

function onChooseFiles (e) {
  var filesInput = document.querySelector('input[type="file"]')
  var files = Array.from(filesInput.files)
  filesInput.value = '' // clear the input
  addFiles(files)
}

function onDragDrop (files) {
  addFiles(files)
}

function addFiles (files) {
  files.forEach(file => {
    // calculate destination
    // - drag/drop gives `fullPath`, while file-picker just gives `name`
    // - in drag/drop case, because you can drag in folders, it may give a subfoldered target
    var dst = path.join(archiveCurrentNode.entry.path, file.fullPath||file.name)

    // send to backend
    datInternalAPI.writeArchiveFileFromPath(archiveInfo.key, { src: file.path, dst })
      .catch(console.warn.bind(console, 'Error writing file:'))
  })
}

// event handlers: toolbar
// =

function onClickCreateArchive (e) {
  editSiteModal.create({}, { title: 'New Files Archive', onSubmit: opts => {
    datInternalAPI.createNewArchive(opts).then(key => {
      window.location = 'dat://' + key
    })
  }})
}

function onToggleSave () {
  archiveInfo.userSettings.isSaved = !archiveInfo.userSettings.isSaved

  // isServing must reflect isSaved
  if (!archiveInfo.userSettings.isSaved && archiveInfo.userSettings.isServing)
    archiveInfo.userSettings.isServing = false

  datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
  render()
}

function onToggleServing () {
  archiveInfo.userSettings.isServing = !archiveInfo.userSettings.isServing

  // isSaved must reflect isServing
  if (archiveInfo.userSettings.isServing && !archiveInfo.userSettings.isSaved)
    archiveInfo.userSettings.isSaved = true

  datInternalAPI.setArchiveUserSettings(archiveInfo.key, archiveInfo.userSettings)
  render()
}

function onCopyLink () {
  var textarea = yo`<textarea>${'dat://'+archiveInfo.key}</textarea>`
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function onOpenFolder (e, entry) {
  e.preventDefault()
  window.history.pushState(null, '', 'view-dat://'+archiveInfo.key+'/'+entry.path)
  setCurrentNodeByPath()
  render()
}


function onToggleSharing () {
  return co(function*() {
    if (archiveInfo.isSharing)
      yield datInternalAPI.unswarm(archiveInfo.key)
    else
      yield datInternalAPI.swarm(archiveInfo.key)
    render()
  })
}

// TODO
// this is disabled for now.
// adds complexity, and I'm not sure it's needed yet.
// -prf
// function onClickClone (e) {
//   beaker.dat.clone(archiveInfo.key, (err, newKey) => {
//     if (err)
//       return console.warn(err) // TODO inform user
//     window.location = 'view-dat://'+newKey
//   })
// }

// event handlers: files listing 
// =

function onDownloadNode (e, node) {
  e.preventDefault()

  // recursively start downloads
  co(function *() {
    yield startDownload(node)
    render()
  })

  function* startDownload (n) {
    // do nothing if already downloaded
    if (n.entry.downloadedBlocks == n.entry.blocks)
      return Promise.resolve()

    // render progress starting
    n.entry.isDownloading = true
    render()

    if (n.entry.type == 'file') {
      // download entry
      yield datInternalAPI.downloadArchiveEntry(archiveInfo.key, n.entry.path)
    } else if (n.entry.type == 'directory') {
      // recurse to children
      yield Object.keys(n.children).map(k => startDownload(n.children[k]))
    }

    // render done
    n.entry.isDownloading = false
    render()

    return Promise.resolve()
  }
}

function onToggleHidden () {
  hideDotfiles = !hideDotfiles
  render()
}

// event handlers: archive events
// =

function onUpdateArchive (update) {
  if (archiveInfo && update.key == archiveInfo.key) {
    // patch the archive
    for (var k in update)
      archiveInfo[k] = update[k]
    render()
  }
}

function onUpdateListing (update) {
  if (archiveInfo && update.key == archiveInfo.key) {
    // simplest solution is just to refetch the entries
    fetchArchiveInfo(render)
  }
}

function onDownload (update) {
  if (archiveInfo && update.key == archiveInfo.key && update.feed == 'content') {
    // increment root's downloaded blocks
    archiveEntriesTree.entry.downloadedBlocks++

    // find the file and folders this update belongs to and increment their downloaded blocks
    for (var i=0; i < archiveInfo.entries.length; i++) {
      var entry = archiveInfo.entries[i]
      var index = update.index - entry.content.blockOffset
      if (index >= 0 && index < entry.blocks)
        entry.downloadedBlocks++ // update the entry
    }

    // render update
    render()
  }
}

