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
  const archiveKey = archive.key
  var numFiles = 0, numHidden = 0

  // helper to render the entries
  function renderEntry (entry) {
    var els = []
    var isDotfile = entry.key && (entry.key.charAt(0) == '.' || entry.path == 'dat.json')
    numFiles++
    var name = entry.key
    var path = trimLeadingSlash(entry.name)

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
          href="beaker:library/${archiveKey}/${path}"
          title=${name}
          onclick=${pushUrl}>
          <i class="fa fa-folder"></i>
          <span>${name}</span>
        </a>`
    } else {
      link = yo`
        <a class="name"
          href="dat://${archiveKey}/${path}"
          title=${name}>
          <i class="fa fa-file-o"></i>
          <span>${name}</span>
        </a>`
    }

    // download state
    var status = (entry.downloadedBlocks == entry.blocks) ? 'downloaded' : 'not-downloaded'

    // render self
    let mtime = entry.mtime ? niceDate(entry.mtime) : ''
    return yo`
      <li class=${`files-list-item ${entry.type} ${(isDotfile?'dotfile':'')} ${status}`}>
        ${link}
        ${entry.type != 'directory' ? yo`<span class="size">(${prettyBytes(entry.length || 0)})</span>` : ''}
        <span class="updated" title=${mtime}>${mtime}</span>
      </li>`
  }

  // helper to render the 'up' link
  function renderParent () {
    return yo`
      <li class="files-list-item">
        <a class="name"
           href="beaker:library/${archiveKey}/${parentPath(archive.path)}"
           title="Parent directory"
           onclick=${pushUrl}>
           parent
        </a>
      </li>`
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
  const toObj = key => { var file = archive.files[key]; file.key = key; return file }
  var files = Object.keys(archive.files).map(toObj).sort(filesSorter).map(child => renderEntry(child)).filter(Boolean)
  if (archive.path !== '/') {
    files.unshift(renderParent())
  }

  if (files.length) {
    return yo`
      <ul class="files-list">
        ${files}
      </ul>`
  }
  return yo`<p>No files.</p>`
}

function filesSorter (a, b) {
  // directories at top
  if (a.type == 'directory' && b.type != 'directory')
    return -1
  if (a.type != 'directory' && b.type == 'directory')
    return 1

  if (a.type != 'directory') {
    // files: downloaded above downloading above not-downloaded
    if ((a.downloadedBlocks == a.blocks) && (b.downloadedBlocks < b.blocks))
      return -1
    if ((a.downloadedBlocks < a.blocks) && (b.downloadedBlocks == b.blocks))
      return 1
    if ((a.downloadedBlocks > 0) && (b.downloadedBlocks == 0))
      return -1
    if ((a.downloadedBlocks == 0) && (b.downloadedBlocks > 0))
      return 1
  }

  // by name
  return a.name.localeCompare(b.name)
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
    var dst = archive.path

    // send to backend
    DatArchive.importFromFilesystem({
      srcPath: src,
      dst: archive.url + dst
    }).catch(console.warn.bind(console, 'Error writing file:'))
  })
}

function trimLeadingSlash (str) {
  return str.replace(/^(\/)*/, '')
}

function parentPath (str) {
  return str.split('/').slice(0, -1).join('/')
}

function onToggleHidden () {
  hideDotfiles = !hideDotfiles
  window.dispatchEvent(new Event('render'))
}