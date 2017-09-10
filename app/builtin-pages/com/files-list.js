/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {niceDate} from '../../lib/time'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder-color'
import renderFilesListHeader from './files-list-header'
import renderFilesListSidebar from './files-list-sidebar'

// exported api
// =

// opts:
//  - hideDate: show the date on the files (bool)
//  - baseUrl: override the base URL of file links (string)
export default function render (root, opts = {}) {
  return rFilesList(root, null, opts)
}

function rFilesList (root, selectedNode, opts) {
  if (!root) {
    return yo`<div class="files-list-view"></div>`
  }

  return yo`
    <div class="files-list-view">
      <div class="files-list ${root.isEmpty ? 'empty' : ''}">
        ${renderFilesListHeader(root)}
        ${rChildren(root, root.children, selectedNode, 0, opts)}
      </div>
      ${renderFilesListSidebar(selectedNode || root)}
    </div>
  `
}

// rendering
// =

function redraw (root, selectedNode, opts = {}) {
  yo.update(document.querySelector('.files-list-view'), rFilesList(root, selectedNode, opts))
}

function rChildren (root, children, selectedNode, depth, opts = {}) {
  if (children.length === 0 && depth === 0) {
    return yo`
      <div class="item empty"><em>No files</em></div>
    `
  }

  return children.map(childNode => rNode(root, childNode, selectedNode, depth, opts))
}

function rNode (root, node, selectedNode, depth, opts) {
  if (node.isContainer) {
    return rDirectory(root, node, selectedNode, depth, opts)
  } else {
    return rFile(root, node, selectedNode, depth, opts)
  }
}

function rDirectory (root, node, selectedNode, depth, opts) {
  const isSelected = node === selectedNode
  let children = ''
  const directoryPadding = 20 + (depth * 20)
  const caretPosition = directoryPadding - 15

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(root, node.children, selectedNode, depth + 1, opts)}
      </div>`
  }

  return yo`
    <div>
      <div
        class="item folder ${isSelected ? 'selected' : ''}"
        title=${node.name}
        onclick=${e => onClickNode(e, root, node, selectedNode, depth, opts)}
        ondblclick=${e => onDblClickNode(e, node)}
        style=${'padding-left: ' + directoryPadding + 'px'}>
        <div
          class="caret"
          onclick=${e => onClickDirectoryCaret(e, root, node, selectedNode, opts)}
          style="left: ${caretPosition}px; ${node.isExpanded ? 'transform: rotate(90deg);' : ''}"
        >▶︎</div>
        <div class="name">
          ${renderFolderIcon()}
          ${node.name}
        </div>
      </div>
      ${children}
    </div>
  `
}

function rFile (root, node, selectedNode, depth, opts) {
  const isSelected = node === selectedNode
  const padding = 20 + (depth * 20)

  return yo`
    <div
      class="item file ${isSelected ? 'selected' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, root, node, selectedNode, depth, opts)}
      ondblclick=${e => onDblClickNode(e, node)}
      style=${'padding-left: ' + padding + 'px'}>
      <div class="name">
        <img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUJJREFUeNqkk8FKw0AQhmcmyb0HTR7A4hPUS1B8haIetPh4Ei9tUqQn6aUPIra9hRYUTKiCzbiTJpsssdXSgWFnJjsf/85ukJnhaTR6+16vW5xlwFA3yRAIERBxcdXtuvoLcxUMooj/sjiOuR+GQR0gTnXa63SmfA7T2TxfJRd7CAJwXRfOff+uH0WPdY12KTRPbEukKhdoBUYiWCyX4HkeXPj+bTgcOqp8owElgshWjpqeZZv6absNz+MxyIzuez0BXxsKSgm2TbmC0ogYPtIEzjqd3DWY2TxC1WAZALHP1ReslEPR5B4f6bgBkBlsM2b+td5QsK8ZAMuiAwF0IECuEYB3bMctgGLyjmMZE272o7mWACqk0z+PUN+XA9IkmajneZlt3u9OBfJnpmk60SW5X/V4TlTc2mN276rvRYIfAQYABXymGHKpbU8AAAAASUVORK5CYII="/>
        ${node.name}
      </div>
      <div class="size">${prettyBytes(node.size)}</div>
      ${!opts.hideDate ? yo`<div class="updated">${niceDate(+node.mtime)}</div>` : ''}
    </div>
  `
}

// event handlers
// =

async function onClickNode (e, root, node, selectedNode, depth, opts = {}) {
  e.preventDefault()
  e.stopPropagation()

  // update state
  selectedNode = node

  // render
  redraw(root, selectedNode, opts)

  // read data if needed, and redraw
  if (node.type === 'file') {
    await node.readData()
    redraw(root, selectedNode, opts)
  }
}

function onDblClickNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  // open in a new window
  if (node.url) {
    window.open(node.url)
  }
}

async function onClickDirectoryCaret (e, root, node, selectedNode, opts = {}) {
  e.preventDefault()
  e.stopPropagation()
  node.isExpanded = !node.isExpanded
  if (node.isExpanded) {
    await node.readData()
  }
  redraw(root, selectedNode, opts)
}
