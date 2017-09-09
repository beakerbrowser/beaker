/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import renderFilesList from './files-list'
import {niceDate} from '../../lib/time'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder-color'
import renderGlobeIcon from '../icon/globe'
import renderTrashIcon from '../icon/trash'
import renderBoxIcon from '../icon/box'
import renderPhotosIcon from '../icon/photos'
import renderVideosIcon from '../icon/videos'

// exported api
// =

// - opts.filesListView: boolean (default false). If true, will use com/files-list for archives
export default function render (root, opts = {}) {
  return rFilesColumnsView(root, [], opts)
}

function rFilesColumnsView (root, selectedPath, opts) {
  if (!root) {
    return yo`<div class="files-columns-view"></div>`
  }

  console.log(root)

  return yo`
    <div class="files-columns-view ${root.isEmpty ? 'empty' : ''}">
      ${rColumn(root, root, selectedPath, 0, opts)}
      ${selectedPath.map((node, i) => rColumn(root, node, selectedPath, i+1, opts))}
    </div>
  `
}

// rendering
// =

function redraw (root, selectedPath, opts = {}) {
  yo.update(document.querySelector('.files-columns-view'), rFilesColumnsView(root, selectedPath, opts))
}

function rColumn (root, node, selectedPath, depth, opts = {}) {
  if (opts.filesListView && node.type === 'archive') {
    return renderFilesList(node, opts)
  }

  if (node.isEmpty) {
    return ''
  }

  return yo`
    <div class="column">
      ${node.children.map(childNode => rNode(root, childNode, selectedPath, depth, opts))}
    </div>
  `
}

function rNode (root, node, selectedPath, depth, opts) {
  const isHighlighted = selectedPath.reduce((agg, activeNode) => agg || activeNode === node, false)
  const isSelected = isHighlighted && selectedPath.length - 1 === depth
  let icon = ''
  switch (node.constructor.name) {
    case 'FSVirtualFolder_User':
      // TODO handle user profile vs just a profile
      icon = yo`<i class="fa fa-home"></i>`
      break
    case 'FSVirtualFolder_Network':
      icon = renderGlobeIcon()
      break
    case 'FSVirtualFolder_Trash':
      icon = renderTrashIcon()
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

  return yo`
    <div
      class="item ${node.type} ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, root, node, selectedPath, depth, opts)}>
      ${icon}
      <div class="name">${node.name}</div>
      ${node.size ? yo`<div class="size">${prettyBytes(node.size)}</div>` : ''}
      ${node.mtime ? yo`<div class="updated">${niceDate(+node.mtime)}</div>` : ''}
      ${node.isContainer ? yo`<span class="caret right">▶</span>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickNode (e, root, node, selectedPath, depth, opts = {}) {
  // update state
  selectedPath.length = depth // truncate all nodes with equal or greater depth
  selectedPath.push(node) // add (or readd) this node
  await node.readData()

  // render
  redraw(root, selectedPath, opts)

  // scroll to the rightmost point
  const container = document.querySelector('.files-columns-view')
  container.scrollLeft = container.scrollWidth
}
