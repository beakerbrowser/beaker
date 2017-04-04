import yo from 'yo-yo'
import {findParent, pushUrl} from '../../lib/fg/event-handlers'

// globals
// =

var expandedFolders = {}
var lastClickedFolder = false // used in 'new' interface
var lastClickedNode = false // used to highlight the nav
var lastClickedUrl = false // used to highlight the save btn

// exported api
// =

export default function rFilesList (archive, {selectedPath, dirtyFiles}) {
  const hasActiveFile = !!lastClickedNode
  const activeFileIsDirty = hasActiveFile && dirtyFiles[lastClickedUrl]
  if (!archive || !archive.fileTree.rootNode) {
    return ''
  }

  return yo`
    <div class="files-sidebar">
      <div class="header">
        <div
          class="project-title"
          data-path=""
          data-url=${archive.url}
          contextmenu="archive"
          oncontextmenu=${onContextMenu}
        >
          <a class="title" href=${'beaker://editor/' + archive.url.slice('dat://'.length)} onclick=${pushUrl}>
            ${archive.niceName}
          </a>
        </div>

        <div class="btn-bar">
          ${archive.info.isOwner
            ? yo`
              <button class="btn" title="New File" onclick=${e => onNewFile(e, archive)}>
                <i class="fa fa-plus"></i>
              </button>`
            : rReadOnly(archive)}
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
  return yo`
    <span class="tooltip">
      <i class="tooltip-link fa fa-eye"></i>
      <div class="tooltip-content">
        You${"'"}re viewing a read-only version.
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
  // unsaved buffers at top
  if (a.entry.name.startsWith('buffer~~')) return -1
  if (b.entry.name.startsWith('buffer~~')) return 1
  // directories next
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
        data-url=${getUrl(archive, node)}
        data-path=${normalizePath(node.entry.name)}
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archive, node, dirtyFiles, selectedPath)}
        oncontextmenu=${onContextMenu}
        contextmenu="directory"
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
      data-url=${getUrl(archive, node)}
      data-path=${normalizePath(node.entry.name)}
      title=${node.niceName}
      onclick=${e => onClickFile(e, archive, node)}
      oncontextmenu=${onContextMenu}
      contextmenu="file"
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

function onNewFile (e) {
  window.dispatchEvent(new Event('new-file'))
}

async function onFork (e, archive) {
  e.preventDefault()
  var newArchive = await DatArchive.fork(archive)
  window.location = 'beaker://editor/' + newArchive.url.slice('dat://'.length)
}

function onContextMenu (e) {
  var itemEl = findParent(e.target, el => !!el.dataset.url)
  if (!itemEl) {
    return
  }
  var evt = new Event('set-context-target')
  evt.detail = {url: itemEl.dataset.url, path: itemEl.dataset.path}
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