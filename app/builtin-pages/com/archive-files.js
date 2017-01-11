import * as yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import toggleable from './toggleable'
import { niceDate } from '../../lib/time'
import { pluralize } from '../../lib/strings'

// globals
// =

var hideDotfiles = true

// exported api
//

export function archiveFiles (tree, opts={}) {
  const archiveKey = opts.archiveKey || tree.entry.key
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
      link = yo`<a class="fl-name-link" 
          href="beaker:archive/${archiveKey}/${entry.path}"
          title=${entry.name}
          onclick=${e => opts.onOpenFolder(e, entry)}><span class="icon icon-folder"></span> ${entry.name}</a>`
    } else {
      link = yo`<a class="fl-name-link" 
          href="dat://${archiveKey}/${entry.path}"
          title=${entry.name}><span class="icon icon-doc-text"></span> ${entry.name}</a>`
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
    return yo`<div class=${`fl-row ${entry.type} ${(isDotfile?'dotfile':'')} ${status}`}>
      ${downloadEl}
      <div class="fl-name overflower">${link}</div>
      <div class="fl-updated" title=${mtime}>${mtime}</div>
      <div class="fl-size">${prettyBytes(entry.length||0)}</div>
    </div>`
  }

  // helper to render the 'up' link
  function renderParent () {
    const entry = tree.parent.entry
    return yo`<div class="fl-row updog">
      <div class="fl-name overflower"><a class="fl-name-link" href="beaker:archive/${archiveKey}/${entry.path}" title="Parent directory" onclick=${e => opts.onOpenFolder(e, entry)}>parent</a></div>
      <div class="fl-size"></div>
    </div>`
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

  // render
  const toObj = key => tree.children[key]
  var rows = (tree.children)
    ? Object.keys(tree.children).map(toObj).sort(treeSorter).map(child => renderNode(child))
    : []
  if (tree.parent)
    rows.unshift(renderParent())
  return yo`<div class="files-list ${rows.length===0?'empty':''}">
    <div class="fl-rows">${rows}</div>
    ${renderFooter()}
    <input class="hidden-file-adder" type="file" multiple onchange=${onChooseFiles} />
  </div>`
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

export function onDragDrop (files) {
  addFiles(files)
}

export function onClickSelectFiles (e) {
  e.preventDefault()
  co(function * () {
    var paths = yield beakerBrowser.showOpenDialog({
      title: 'Choose a folder to import',
      buttonLabel: 'Import',
      properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
    })
    if (paths) {
      addFiles(paths)
    }
  })
}

function onChooseFiles (e) {
  var filesInput = document.querySelector('input[type="file"]')
  var files = Array.from(filesInput.files)
  filesInput.value = '' // clear the input
  addFiles(files)
}

function addFiles (files) {
  files.forEach(file => {
    // file-picker gies a string, while drag/drop gives { path: string }
    var src = (typeof file === 'string') ? file : file.path
    var dst = archive.files.currentNode.entry.path

    // send to backend
    datInternalAPI.writeArchiveFileFromPath(archiveInfo.key, { src, dst })
      .catch(console.warn.bind(console, 'Error writing file:'))
  })
}

function onToggleHidden () {
  hideDotfiles = !hideDotfiles
  window.dispatchEvent(new Event('render'))
}