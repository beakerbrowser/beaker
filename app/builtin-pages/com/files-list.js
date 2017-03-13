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

export default function rFilesList (archive, {selectedPath, dirtyFiles}) {
  const hasActiveFile = !!lastClickedNode
  const activeFileIsDirty = hasActiveFile && dirtyFiles[lastClickedUrl]
  return yo`
    <div class="files-sidebar">
      <div class="header">
        <div class="project-title"><a href=${'beaker:library/' + archive.url.slice('dat://'.length)} onclick=${pushUrl}>${archive.info.title}</a></div>

        <div class="btn-bar">
          <button class="btn" title="New File" onclick=${onNewFile}>
            <i class="fa fa-plus"></i>
          </button>

          <button class="btn" title="Save Active File" onclick=${onSaveFile} ${!activeFileIsDirty ? 'disabled' : ''}>
            <i class="fa fa-floppy-o"></i>
          </button>

          <button class="btn" title="Open Active File" onclick=${e => onOpenInNewWindow(e, archive)} ${!hasActiveFile ? 'disabled' : ''}>
            <i class="fa fa-external-link"></i>
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
  return a.entry.name.localeCompare(b.entry.name)
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
  const isChanged = dirtyFiles[getUrl(archive, node)] ? '*' : ''
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

function onOpenInNewWindow (e, archive) {
  e.preventDefault()
  e.stopPropagation()
  beakerBrowser.openUrl(lastClickedUrl)
}

function onNewFile () {
  // initial value
  var value = ''
  if (lastClickedFolder) {
    value = lastClickedFolder + '/'
  }

  // render interface
  yo.update(document.getElementById('new-file-popup'), 
    yo`<div id="new-file-popup">
      <form class="new-file-form" onsubmit=${onSubmitNewFile}>
        <label>
          Name<br>
          <input type="text" name="name" />
        </label>
        <button class="btn" type="submit">Create</button>
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

function onSaveFile (e) {
  // dispatch an app event
  var evt = new Event('save-file')
  evt.detail = { path: lastClickedNode, url: lastClickedUrl }
  window.dispatchEvent(evt)
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