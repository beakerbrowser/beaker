import yo from 'yo-yo'
import {findParent, pushUrl} from '../../lib/fg/event-handlers'

// globals
// =

var expandedFolders = {}
var lastClickedFolder = false // used in 'new' interface
var lastClickedNode = false // used to highlight the nav
var lastClickedUrl = false // used to highlight the save btn

// set a handler to click out of the new-file poup
document.body.addEventListener('click', e => {
  var popup = document.getElementById('new-file-popup')
  if (popup.children.length === 0) return
  if (!findParent(e.target, node => node === popup)) {
    destroyNewFilePopup()
  }
})

// exported api
// =

export default function rFilesList (archive, {selectedPath, dirtyFiles, isArchivesListCollapsed, onCollapseToggle}) {
  const hasActiveFile = !!lastClickedNode
  const activeFileIsDirty = hasActiveFile && dirtyFiles[lastClickedUrl]
  if (!archive || !archive.fileTree.rootNode) {
    return ''
  }

  return yo`
    <div class="files-sidebar">
      <div class="header">
        ${isArchivesListCollapsed
          ? yo`<div class="btn-bar">
                <button class="btn collapse" title="Expand Archives List" onclick=${onCollapseToggle}>
                  <i class="fa fa-caret-square-o-right"></i>
                </button>
              </div>`
          : ''}

        <div class="project-title">
          <a class="title" href=${'beaker://editor/' + archive.url.slice('dat://'.length)} onclick=${pushUrl}>
            ${archive.niceName}
          </a>
          ${rReadOnly(archive)}
        </div>

        <div class="btn-bar">
          <button class="btn" title="New File" onclick=${e => onNewFile(e, archive)}>
            <i class="fa fa-plus"></i>
          </button>
        </div>
      </div>
      <div class="files-list">
        ${rChildren(archive, archive.fileTree.rootNode.children, 0, dirtyFiles, selectedPath)}
      </div>
    </div>
  `
}

// renderers
// =

function redraw (archive, dirtyFiles, selectedPath) {
  yo.update(document.querySelector('.files-list'), yo`
    <div class="files-list">
      ${rChildren(archive, archive.fileTree.rootNode.children, 0, dirtyFiles, selectedPath)}
    </div>
  `)
}

function rReadOnly (archive) {
  if (!archive || archive.info.isOwner) {
    return ''
  }

  return yo`
    <span class="tooltip">
      <i class="tooltip-link fa fa-eye"></i>
      <div class="tooltip-content">
        You're viewing a read-only version.
        <a href="#" onclick=${e => onFork(e, archive)}>Fork to create an editable copy</a>.
      </div>
    </span>`
}

function rChildren (archive, children, depth, dirtyFiles, selectedPath) {
  return Object.keys(children)
    .map(key => children[key])
    .sort(treeSorter)
    .map(node => rNode(archive, node, depth, dirtyFiles, selectedPath))
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.type == 'directory' && b.entry.type != 'directory')
    return -1
  if (a.entry.type != 'directory' && b.entry.type == 'directory')
    return 1
  // by name
  return normalizePath(a.entry.name).localeCompare(normalizePath(b.entry.name))
}

function rNode (archive, node, depth, dirtyFiles, selectedPath) {
  if (node.entry.type === 'directory') {
    return rDirectory(archive, node, depth, dirtyFiles, selectedPath)
  }
  if (node.entry.type === 'file') {
    return rFile(archive, node, depth, dirtyFiles, selectedPath)
  }
  return ''
}

function rDirectory (archive, node, depth, dirtyFiles, selectedPath) {
  let icon = 'right'
  let children = ''
  const directoryPadding = 10 + (depth * 10)

  const cls = isSelected(archive, node, selectedPath) ? 'selected' : ''

  if (expandedFolders[node.entry.name]) {
    children = yo`
      <div class="subtree">
        ${rChildren(archive, node.children, depth + 1, dirtyFiles, selectedPath)}
      </div>`
    icon = 'down'
  }

  return yo`
    <div>
      <div
        class="item folder ${cls}"
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archive, node, dirtyFiles, selectedPath)}
        style=${'padding-left: ' + directoryPadding + 'px'}>
        <i class="fa fa-caret-${icon}"></i>
        ${node.niceName}
      </div>
      ${children}
    </div>
  `
}

function rFile (archive, node, depth, dirtyFiles, selectedPath) {
  const cls = isSelected(archive, node, selectedPath) ? 'selected' : ''
  const isChanged = dirtyFiles[getUrl(archive, node)] ? yo`<i class="dirty fa fa-circle"></i>` : ''
  const padding = depth === 0 ? 20 : 25 + (depth * 5);

  return yo`
    <div
      class="item file ${cls}"
      title=${node.niceName}
      onclick=${e => onClickFile(e, archive, node)}
      style=${'padding-left: ' + padding + 'px'}>
      ${node.niceName}${isChanged}
    </div>
  `
}

// event handlers
// =

function onClickDirectory (e, archive, node, dirtyFiles, selectedPath) {
  var path = normalizePath(node.entry.name)

  // track the click
  lastClickedFolder = path
  lastClickedNode = path
  lastClickedUrl = getUrl(archive, node)

  // toggle expanded
  expandedFolders[node.entry.name] = !expandedFolders[node.entry.name]
  redraw(archive, dirtyFiles, selectedPath)

  // dispatch an app event
  var evt = new Event('open-folder')
  evt.detail = { archive, path, node }
  window.dispatchEvent(evt)
}

function onClickFile (e, archive, node) {
  var path = normalizePath(node.entry.name)

  // track the click
  lastClickedFolder = path.split('/').slice(0, -1).join('/')
  lastClickedNode = path
  lastClickedUrl = getUrl(archive, node)

  // dispatch an app event
  var evt = new Event('open-file')
  evt.detail = { archive, path, node }
  window.dispatchEvent(evt)
}

function onNewFile (e, archive) {
  // initial value
  var value = ''
  if (lastClickedFolder) {
    value = lastClickedFolder + '/'
  }

  // render interface
  yo.update(document.getElementById('new-file-popup'),
    yo`<div id="new-file-popup">
      <form class="new-file-form" onsubmit=${onSubmitNewFile}>
        <div class="new">
          <label>
            New File<br>
            <input type="text" name="name" />
          </label>
          <button class="btn" type="submit">Create</button>
        </div>
        <hr />
        <div class="upload">
          <button class="btn" onclick=${e => onImportFiles(e, archive)}><i class="fa fa-upload"></i> Import files</button>Destination folder: /${lastClickedFolder||''}
        </div>
      </form>
    </div>`
  )
  var input = document.querySelector('#new-file-popup input')
  input.value = value
  input.focus()
}

function onSubmitNewFile (e) {
  e.preventDefault()
  lastClickedNode = null // clear so that our new file gets highlighted
  lastClickedUrl = null
  destroyNewFilePopup()

  // dispatch an app event
  var evt = new Event('new-file')
  evt.detail = { path: normalizePath(e.target.name.value) }
  window.dispatchEvent(evt)
}

async function onImportFiles (e, archive) {
  e.preventDefault()
  lastClickedNode = null // clear so that our new file gets highlighted
  lastClickedUrl = null
  destroyNewFilePopup()

  // pick files
  var files = await beakerBrowser.showOpenDialog({
    title: 'Choose a folder or files to import',
    buttonLabel: 'Import',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles']
  })
  if (!files) {
    return
  }

  files.forEach(file => {
    // file-picker gives a string, while drag/drop gives { path: string }
    var src = (typeof file === 'string') ? file : file.path
    var dst = `/${lastClickedFolder || ''}`

    // send to backend
    DatArchive.importFromFilesystem({
      srcPath: src,
      dst: archive.url + dst,
      inplaceImport: false
    }).catch(console.warn.bind(console, 'Error writing file:'))
  })
}

async function onFork (e, archive) {
  e.preventDefault()
  var newArchive = await DatArchive.fork(archive)
  window.location = 'beaker://editor/' + newArchive.url.slice('dat://'.length)
}

// internal helpers
// =

function isSelected (archive, node, selectedPath) {
  // if nothing is selected, then nothing should be highlighted
  if (!selectedPath) return false
  // check for the last clicked node first, so that we can highlight recently-clicked folders
  if (lastClickedNode) {
    return (lastClickedNode === normalizePath(node.entry.name))
  }
  return (selectedPath === normalizePath(node.entry.name))
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}

function getUrl (archive, node) {
  return archive.url + '/' + normalizePath(node.entry.name)
}

function destroyNewFilePopup () {
  var popup = document.getElementById('new-file-popup')
  popup.removeChild(popup.firstChild)
}