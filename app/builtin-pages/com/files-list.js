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
export default function render (root, opts = {}) {
  return rFilesList(root, opts)
}

function rFilesList (root, opts) {
  if (!root) {
    return yo`<div class="files-list"></div>`
  }

  return yo`
    <div class="files-list ${root.isEmpty ? 'empty' : ''}">
      ${rChildren(root, root.children, 0, opts)}
    </div>
  `
}

// rendering
// =

function redraw (root, opts = {}) {
  yo.update(document.querySelector('.files-list'), rFilesList(root, opts))
}

function rChildren (root, children, depth = 0, opts = {}) {
  if (children.length === 0 && depth === 0) {
    return yo`
      <div class="item empty"><em>No files</em></div>
    `
  }

  return children.map(childNode => rNode(root, childNode, depth, opts))
}

function rNode (root, node, depth, opts) {
  if (node.isContainer) {
    return rDirectory(root, node, depth, opts)
  } else {
    return rFile(root, node, depth, opts)
  }
}

function rDirectory (root, node, depth, opts) {
  let icon = 'folder'
  let children = ''
  const directoryPadding = 20 + (depth * 20)
  const caretPosition = directoryPadding - 15

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(root, node.children, depth + 1, opts)}
      </div>`
    icon = 'folder-open'
  }

  return yo`
    <div>
      <div
        class="item folder"
        title=${node.name}
        onclick=${e => onClickDirectory(e, root, node, opts)}
        style=${'padding-left: ' + directoryPadding + 'px'}>

        <div class="caret" style="left: ${caretPosition}px; ${node.isExpanded ? 'transform: rotate(90deg);' : ''}">▶︎</div>

        <div class="name">
          ${renderFolderIcon()}
          ${node.name}
        </div>
      </div>
      ${children}
    </div>
  `
}

function rFile (root, node, depth, opts) {
  const padding = 15 + (depth * 15)

  return yo`
    <div
      class="item file"
      title=${node.name}
      style=${'padding-left: ' + padding + 'px'}>
      <div class="name">
        ${renderFileOIcon()}
        <a href=${node.url}>
          ${node.name}
        </a>
      </div>
      <div class="size">${prettyBytes(node.size)}</div>
      ${!opts.hideDate ? yo`<div class="updated">${niceDate(+node.mtime)}</div>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickDirectory (e, root, node, opts = {}) {
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await node.readData()
  }
  redraw(root, opts)
}
