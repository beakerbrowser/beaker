import * as yo from 'yo-yo'
import co from 'co'
import prettyBytes from 'pretty-bytes'
import { niceDate } from '../../lib/time'
import { pluralize } from '../../lib/strings'
import { pushUrl } from '../../lib/fg/event-handlers'

// globals
// =

var hideDotfiles = true

// exported api
//

export function archiveFiles (archive) {
  return ''
  const archiveKey = archive.info.key
  const tree = archive.files.currentNode
  var numFiles = 0, numHidden = 0

  // helper to render the entries
  function renderNode (node) {
    var els = []
    const entry = node.entry
    var isDotfile = entry.name && (entry.name.charAt(0) == '.' || entry.path == 'dat.json')
    numFiles++

    // hide dotfiles
    if (isDotfile) {
      numHidden++
      if (hideDotfiles) {
        return ''
      }
    }

    // type-specific rendering
    var link
    if (entry.type == 'directory') {
      link = yo`
        <a class="name"
          href="beaker:library/${archiveKey}/${entry.path}"
          title=${entry.name}
          onclick=${pushUrl}>
          <i class="fa fa-folder-o"></i>
          <span>${entry.name}</span>
        </a>`
    } else {
      link = yo`
        <a class="name"
          href="dat://${archiveKey}/${entry.path}"
          title=${entry.name}>
          <i class="fa fa-file-o"></i>
          <span>${entry.name}</span>
        </a>`
    }

    // download state
    var status, downloadEl
    if (entry.downloadedBlocks == entry.blocks) {
      status = 'downloaded'
    } else if (entry.isDownloading || entry.downloadedBlocs > 0) {
      status = 'downloading'
      var progress = Math.round(entry.downloadedBlocks / entry.blocks * 100)
      downloadEl = yo`<div class="fl-download"><progress value=${progress} max="100"></progress></div>`
    } else {
      status = 'not-downloaded'
    }

    // render self
    let mtime = entry.mtime ? niceDate(entry.mtime) : ''
    return yo`
      <li class=${`files-list-item ${entry.type} ${(isDotfile?'dotfile':'')} ${status}`}>
        ${downloadEl}
        ${link}
        <span class="size">(${prettyBytes(entry.length || 0)})</span>
        <span class="updated" title=${mtime}>${mtime}</span>
      </li>`
  }

  // helper to render the 'up' link
  function renderParent () {
    const entry = tree.parent.entry
    return yo`
      <li class="files-list-item">
        <a class="name"
           href="beaker:library/${archiveKey}/${entry.path}"
           title="Parent directory"
           onclick=${pushUrl}>
           parent
        </a>
      </li>`
  }

  // helper to render the footer
  function renderFooter () {
    const entry = tree.entry

    // render
    var hideLabel = hideDotfiles ? 'show' : 'hide'
    var hideToggle = (numHidden > 0) ? yo`<span>, ${numHidden} hidden (<a onclick=${onToggleHidden}>${hideLabel}</a>)</span>` : ''
    return yo`<div class="fl-footer">
      <div class="fl-name overflower">${numFiles} ${pluralize(numFiles, 'file')}${hideToggle}</div>
      <div class="fl-updated"></div>
      <div class="fl-size">${prettyBytes(entry.length||0)}</div>
    </div>`
  }

  function renderFileAdder () {
    if (archive.info.isOwner) {
      return yo`
        <button class="button btn archive-add-files" onclick=${() => onClickSelectFiles(archive)}>
          Upload files
        </button>`
    }
    return ''
  }

  // render
  const toObj = key => tree.children[key]
  var files = (tree.children)
    ? Object.keys(tree.children).map(toObj).sort(treeSorter).map(child => renderNode(child)).filter(Boolean)
    : []

  if (tree.parent)
    files.unshift(renderParent())

  if (files.length) {
    return yo`
      <ul class="files-list">
        ${files}
      </ul>`
  }
  return yo`<p>No files.</p>`
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.type == 'directory' && b.entry.type != 'directory')
    return -1
  if (a.entry.type != 'directory' && b.entry.type == 'directory')
    return 1

  if (a.entry.type != 'directory') {
    // files: downloaded above downloading above not-downloaded
    if ((a.entry.downloadedBlocks == a.entry.blocks) && (b.entry.downloadedBlocks < b.entry.blocks))
      return -1
    if ((a.entry.downloadedBlocks < a.entry.blocks) && (b.entry.downloadedBlocks == b.entry.blocks))
      return 1
    if ((a.entry.downloadedBlocks > 0) && (b.entry.downloadedBlocks == 0))
      return -1
    if ((a.entry.downloadedBlocks == 0) && (b.entry.downloadedBlocks > 0))
      return 1
  }

  // by name
  return a.entry.name.localeCompare(b.entry.name)
}


// event handlers
// =

export function onClickSelectFiles (archive) {
  co(function * () {
    var paths = yield beakerBrowser.showOpenDialog({
      title: 'Choose a folder to import',
      buttonLabel: 'Import',
      properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
    })
    if (paths) {
      addFiles(archive, paths)
    }
  })
}

// TODO is this needed anymore?
function onChooseFiles (e) {
  var filesInput = document.querySelector('input[type="file"]')
  var files = Array.from(filesInput.files)
  filesInput.value = '' // clear the input
  addFiles(files)
}

export function addFiles (archive, files) {
  files.forEach(file => {
    // file-picker gies a string, while drag/drop gives { path: string }
    var src = (typeof file === 'string') ? file : file.path
    var dst = archive.files.currentNode.entry.path

    // send to backend
    DatArchive.importFromFilesystem({
      srcPath: src,
      dst: archive.url + dst
    }).catch(console.warn.bind(console, 'Error writing file:'))
  })
}

function onToggleHidden () {
  hideDotfiles = !hideDotfiles
  window.dispatchEvent(new Event('render'))
}