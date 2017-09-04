/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import * as toast from './toast'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder'

// exported api
// =

// opts:
//  - hideDate: show the date on the files (bool)
//  - baseUrl: override the base URL of file links (string)
export default function render (archiveInfo, opts = {}) {
  return yo`
    <div>
      ${rFilesList(archiveInfo, opts)}
    </div>
  `
}

function rFilesList (archiveInfo, opts) {
  if (!archiveInfo || !archiveInfo.fileTree.rootNode) {
    return yo`
      <div>
        <div class="files-list"></div>
      </div>
    `
  }

  var hasFiles = Object.keys(archiveInfo.fileTree.rootNode.children).length > 0
  return yo`
    <div class="files-list ${!hasFiles ? 'empty' : ''}">
      ${rChildren(archiveInfo, archiveInfo.fileTree.rootNode.children, 0, opts)}
    </div>
  `
}

// rendering
// =

function redraw (archiveInfo, opts = {}) {
  yo.update(document.querySelector('.files-list'), rFilesList(archiveInfo, opts))
}

function rChildren (archiveInfo, children, depth = 0, opts = {}) {
  children = Object.keys(children).map(key => children[key])

  if (children.length === 0 && depth === 0) {
    return yo`
      <div class="item empty"><em>No files</em></div>
    `
  }

  return children
    .sort(treeSorter)
    .map(node => rNode(archiveInfo, node, depth, opts))
}

function treeSorter (a, b) {
  // directories at top
  if (a.entry.isDirectory() && !b.entry.isDirectory()) { return -1 }
  if (!a.entry.isDirectory() && b.entry.isDirectory()) { return 1 }
  // by name
  return a.entry.name.localeCompare(b.entry.name)
}

function rNode (archiveInfo, node, depth, opts) {
  if (node.entry.isDirectory()) {
    return rDirectory(archiveInfo, node, depth, opts)
  }
  if (node.entry.isFile()) {
    return rFile(archiveInfo, node, depth, opts)
  }
  return ''
}

function rDirectory (archiveInfo, node, depth, opts) {
  let icon = 'folder'
  let children = ''
  const directoryPadding = 20 + (depth * 20)
  const caretPosition = directoryPadding - 15

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(archiveInfo, node.children, depth + 1, opts)}
      </div>`
    icon = 'folder-open'
  }

  return yo`
    <div>
      <div
        class="item folder ${hasChildren ? '' : 'empty'}"
        title=${node.niceName}
        onclick=${e => onClickDirectory(e, archiveInfo, node, opts)}
        style=${'padding-left: ' + directoryPadding + 'px'}>

        <div class="caret" style="left: ${caretPosition}px; ${node.isExpanded ? 'transform: rotate(90deg);' : ''}">▶︎</div>

        <div class="name">
          ${renderFolderIcon()}
          ${node.niceName}
        </div>
      </div>
      ${children}
    </div>
  `
}

function rFile (archiveInfo, node, depth, opts) {
  const padding = 15 + (depth * 15)

  return yo`
    <div
      class="item file"
      title=${node.niceName}
      style=${'padding-left: ' + padding + 'px'}>
      <div class="name">
        ${renderFileOIcon()}
        <a href=${join(opts.baseUrl || archiveInfo.url, node.entry.name)}>
          ${node.niceName}
        </a>
      </div>
      <div class="size">${prettyBytes(node.entry.size)}</div>
      ${!opts.hideDate ? yo`<div class="updated">${niceDate(+node.entry.mtime)}</div>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickDirectory (e, archiveInfo, node, opts = {}) {
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await archiveInfo.fileTree.readFolder(node)
  }
  redraw(archiveInfo, opts)
}

// helpers
// =

function join (a, b) {
  if (!a.endsWith('/') && !b.startsWith('/')) {
    return a + '/' + b
  }
  if (a.endsWith('/') && b.startsWith('/')) {
    return a + b.slice(1)
  }
  return a + b
}
