/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import renderFilesList from './files-list'
import {niceDate} from '../../lib/time'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder'

// exported api
// =

// - opts.filesListView: boolean (default false). If true, will use com/files-list for archives
export default function render (root, opts = {}) {
  return rFilesColumnsView(root, [], opts)
}

function rFilesColumnsView (root, activePath, opts) {
  if (!root) {
    return yo`<div class="files-columns-view"></div>`
  }

  return yo`
    <div class="files-columns-view ${root.isEmpty ? 'empty' : ''}">
      ${rColumn(root, root, activePath, 0, opts)}
      ${activePath.map((node, i) => rColumn(root, node, activePath, i+1, opts))}
    </div>
  `
}

// rendering
// =

function redraw (root, activePath, opts = {}) {
  yo.update(document.querySelector('.files-columns-view'), rFilesColumnsView(root, activePath, opts))
}

function rColumn (root, node, activePath, depth, opts = {}) {
  if (opts.filesListView && node.type === 'archive') {
    return renderFilesList(node, opts)
  }

  if (node.isEmpty) {
    return yo`
      <div class="column empty"><em>No files</em></div>
    `
  }

  return yo`
    <div class="column">
      ${node.children.map(childNode => rNode(root, childNode, activePath, depth, opts))}
    </div>
  `
}

function rNode (root, node, activePath, depth, opts) {
  const isActive = activePath.reduce((agg, activeNode) => agg || activeNode === node, false)
  return yo`
    <div
      class="item ${node.type} ${isActive ? 'active' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, root, node, activePath, depth, opts)}>
      ${node.isContainer
        ? yo`<div class="name">
            ${renderFolderIcon()}
            ${node.name}
          </div>`
        : yo`<div class="name">
            ${renderFileOIcon()}
            <a href=${node.url}>
              ${node.name}
            </a>
          </div>`}
      ${node.size ? yo`<div class="size">${prettyBytes(node.size)}</div>` : ''}
      ${node.mtime ? yo`<div class="updated">${niceDate(+node.mtime)}</div>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickNode (e, root, node, activePath, depth, opts = {}) {
  activePath.length = depth // truncate all nodes with equal or greater depth
  activePath.push(node) // add (or readd) this node
  await node.readData()
  redraw(root, activePath, opts)
}
