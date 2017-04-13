import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import * as bkrPopup from '../com/editor-bkr-popup'
import {findParent, pushUrl} from '../../lib/fg/event-handlers'

// globals
// =

var expandedFolders = {}

// exported api
// =

export function update (archive, selectedPath, models, dirtyFiles) {
  yo.update(document.querySelector('.files-sidebar'), rFilesList(archive, selectedPath, models, dirtyFiles))
}

// renderers
// =

function rFilesList (archive, selectedPath, models, dirtyFiles) {
  if (!archive || !archive.fileTree.rootNode) {
    return yo`<nav class="files-sidebar"></nav>`
  }

  const isOwner = archive.info.isOwner
  const cls = isOwner ? 'editable' : 'readonly'
  return yo`
    <nav class="files-sidebar ${cls}">
      <div class="files-header">Open Files</div>
      <div class="files-list open-files">
        ${rModels(archive, models, dirtyFiles, selectedPath)}
      </div>
      <div class="files-header">Folders</div>
      <div class="files-list folders">
        ${rChildren(archive, archive.fileTree.rootNode.children, 0, selectedPath)}
        ${isOwner ? yo`<div class="item action" onclick=${onNewFile}>+ New file</div>` : ''}
      </div>
      <div class="footer">
        <button class="bkr" onclick=${e => onShowBkr(archive)}>Use CLI</button>
        <span class="archive-size">${prettyBytes(archive.info.size)}</span>
      </div>
    </nav>
  `
}

function redraw (archive, selectedPath) {
  const isOwner = archive.info.isOwner
  yo.update(document.querySelector('.folders'), yo`
    <div class="files-list folders">
      ${rChildren(archive, archive.fileTree.rootNode.children, 0, selectedPath)}
      ${isOwner ? yo`<div class="item action" onclick=${onNewFile}>+ New file</div>` : ''}
    </div>
  `)
}

function rModels (archive, models, dirtyFiles, selectedPath) {
  return Object.keys(models)
    .map(url => {
      var model = models[url]
      if (!model.isFullyOpen) {
        return ''
      }
      var path = normalizePath(url.slice(archive.url.length))
      var name = path.split('/').pop()
      if (name.startsWith('buffer~~')) name = 'untitled'
      var cls = path === selectedPath ? 'selected' : ''
      const xIcon = dirtyFiles[url]
        ? yo`<i class="dirty fa fa-circle"></i>`
        : yo`<i class="dirty fa fa-times"></i>`
      return yo`
        <div
          class="item model ${cls}"
          data-url=${url}
          data-path=${path}
          title=${name}
          onclick=${e => onClickFile(e, archive, path)}>
          <a onclick=${e => onCloseFile(e, archive, path)}>${xIcon}</a>
          ${name}
        </div>
      `
    })
}

function rChildren (archive, children, depth, selectedPath) {
  return Object.keys(children)
    .map(key => children[key])
    .sort(treeSorter)
    .map(node => rNode(archive, node, depth, selectedPath))
}

function treeSorter (a, b) {
  // unsaved buffers at top
  if (a.entry.name.startsWith('buffer~~')) return -1
  if (b.entry.name.startsWith('buffer~~')) return 1
  // directories next
  if (a.entry.isDirectory() && !b.entry.isDirectory())
    return -1
  if (!a.entry.isDirectory() && b.entry.isDirectory())
    return 1
  // by name
  return normalizePath(a.entry.name).localeCompare(normalizePath(b.entry.name))
}

function rNode (archive, node, depth, selectedPath) {
  if (node.entry.isDirectory()) {
    return rDirectory(archive, node, depth, selectedPath)
  }
  if (node.entry.isFile()) {
    return rFile(archive, node, depth, selectedPath)
  }
  return ''
}

function rDirectory (archive, node, depth, selectedPath) {
  let icon = 'right'
  let children = ''
  const directoryPadding = 10 + (depth * 10)

  const cls = isSelected(archive, node, selectedPath) ? 'selected' : ''

  if (expandedFolders[node.entry.name]) {
    children = yo`
      <div class="subtree">
        ${rChildren(archive, node.children, depth + 1, selectedPath)}
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
        onclick=${e => onClickDirectory(e, archive, node, selectedPath)}
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

function rFile (archive, node, depth, selectedPath) {
  const cls = isSelected(archive, node, selectedPath) ? 'selected' : ''
  const padding = depth === 0 ? 20 : 25 + (depth * 5);

  return yo`
    <div
      class="item file ${cls}"
      data-url=${getUrl(archive, node)}
      data-path=${normalizePath(node.entry.name)}
      title=${node.niceName}
      onclick=${e => onClickFile(e, archive, node)}
      ondblclick=${e => onDblClickFile(e, archive, node)}
      oncontextmenu=${onContextMenu}
      contextmenu="file"
      style=${'padding-left: ' + padding + 'px'}>
      ${node.niceName}
    </div>
  `
}

// event handlers
// =

function onClickDirectory (e, archive, node, selectedPath) {
  var path = normalizePath(node.entry.name)

  // toggle expanded
  expandedFolders[node.entry.name] = !expandedFolders[node.entry.name]
  redraw(archive, selectedPath)

  // dispatch an app event
  var evt = new Event('open-folder')
  evt.detail = { archive, path, node }
  window.dispatchEvent(evt)
}

function onClickFile (e, archive, node) {
  var path = typeof node === 'string' ? node : normalizePath(node.entry.name)

  // dispatch an app event
  var evt = new Event('open-file')
  evt.detail = { archive, path, fullyOpen: false }
  window.dispatchEvent(evt)
}

function onDblClickFile (e, archive, node) {
  var path = typeof node === 'string' ? node : normalizePath(node.entry.name)

  // dispatch an app event
  var evt = new Event('open-file')
  evt.detail = { archive, path, fullyOpen: true }
  window.dispatchEvent(evt)
}

function onCloseFile (e, archive, node) {
  e.stopPropagation()
  var path = typeof node === 'string' ? node : normalizePath(node.entry.name)

  // dispatch an app event
  var evt = new Event('close-file')
  evt.detail = { archive, path }
  window.dispatchEvent(evt)
}

function onNewFile (e) {
  window.dispatchEvent(new Event('new-file'))
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
  return (selectedPath === normalizePath(node.entry.name))
}

function normalizePath (path) {
  if (path.startsWith('/')) return path.slice(1)
  return path
}

function getUrl (archive, node) {
  return archive.url + '/' + normalizePath(node.entry.name)
}

function onShowBkr (archive) {
  bkrPopup.create(archive)
}
