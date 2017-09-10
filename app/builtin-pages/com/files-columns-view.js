/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import renderFilesList from './files-list'
import {niceDate} from '../../lib/time'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder-color'
import renderGlobeIcon from '../icon/globe'
import renderTrashIcon from '../icon/trash'
import renderTrashGrayscaleIcon from '../icon/trash-grayscale'
import renderBoxIcon from '../icon/box'
import renderPhotosIcon from '../icon/photos'
import renderVideosIcon from '../icon/videos'
import renderHomeIcon from '../icon/home'
import renderHomeGrayscaleIcon from '../icon/home-grayscale'

// exported api
// =

// - opts.filesListView: boolean (default false). If true, will use com/files-list for archives
// - opts.selectedPath: array of beaker-virtual-fs objects. The currently selected node(s)
export default function render (root, opts = {}) {
  opts.selectedPath = opts.selectedPath || []
  return rFilesColumnsView(root, opts)
}

function rFilesColumnsView (root, opts) {
  if (!root) {
    return yo`<div class="files-columns-view"></div>`
  }

  console.log(root)

  return yo`
    <div class="files-columns-view ${root.isEmpty ? 'empty' : ''}">
      ${rBreadcrumbs(root, opts.selectedPath)}
      ${rColumn(root, root, 0, opts)}
      ${opts.selectedPath.map((node, i) => rColumn(root, node, i+1, opts))}
    </div>
  `
}

// rendering
// =

function redraw (root, opts = {}) {
  yo.update(document.querySelector('.files-columns-view'), rFilesColumnsView(root, opts))
}

function rIcon (node, grayscale=false) {
  let icon = ''
  switch (node.constructor.name) {
    case 'FSVirtualFolder_User':
      // TODO handle user profile vs just a profile
      icon = grayscale ? renderHomeGrayscaleIcon() : renderHomeIcon()
      break
    case 'FSVirtualFolder_Network':
      icon = renderGlobeIcon()
      break
    case 'FSVirtualFolder_Trash':
      icon = grayscale ? renderTrashGrayscaleIcon() : renderTrashIcon()
      break
    case 'FSVirtualFolder_TypeFilter':
      if (node._type === 'module') icon = renderBoxIcon()
      else if (node._type === 'photo') icon = yo`<img class="icon photos" src="beaker://assets/icon/photos.png"/>`
      else if (node._type === 'video') icon = renderVideosIcon()
      break
    default:
      icon = node.isContainer ? renderFolderIcon() : renderFileOIcon()
      icon = renderFolderIcon()
  }
  return icon
}

function rBreadcrumbs (root, selectedPath) {
  return yo`<div class="breadcrumbs">${selectedPath.map(rBreadcrumb)}</div>`
}

function rBreadcrumb (node) {
  return yo`
    <div class="breadcrumb">
      ${rIcon(node)}
      ${node.name}
    </div>
  `
}

function rColumn (root, node, depth, opts = {}) {
  if (opts.filesListView && node.type === 'archive') {
    return renderFilesList(node, opts)
  }

  if (node.isEmpty) {
    return yo`<div class="column"></div>`
  }

  return yo`
    <div class="column ${depth === 0 ? 'first' : ''}">
      ${node.children.map(childNode => rNode(root, childNode, depth, opts))}
    </div>
  `
}

function rNode (root, node, depth, opts) {
  const isHighlighted = opts.selectedPath.reduce((agg, activeNode) => agg || activeNode === node, false)
  const isSelected = isHighlighted && opts.selectedPath.length - 1 === depth
  return yo`
    <div
      class="item ${node.type} ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, root, node, depth, opts)}
      ondblclick=${e => onDblClickNode(e, node)}>
      ${rIcon(node, !depth)}
      <div class="name">${node.name}</div>
      ${node.isContainer ? yo`<span class="caret right">▶</span>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickNode (e, root, node, depth, opts = {}) {
  // update state
  opts.selectedPath.length = depth // truncate all nodes with equal or greater depth
  opts.selectedPath.push(node) // add (or readd) this node
  await node.readData()

  // emit an update
  if (opts.onSelection) {
    opts.onSelection(opts.selectedPath)
  }

  // render
  redraw(root, opts)

  // scroll to the rightmost point
  const container = document.querySelector('.files-columns-view')
  container.scrollLeft = container.scrollWidth
}

function onDblClickNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  // open in a new window
  if (node.url) {
    window.open(node.url)
  }
}
