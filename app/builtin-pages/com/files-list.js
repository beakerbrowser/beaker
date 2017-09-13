/* globals beakerBrowser DatArchive Event */

import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import {niceDate} from '../../lib/time'
import {writeToClipboard} from '../../lib/fg/event-handlers'
import renderFileOIcon from '../icon/file-o'
import renderFolderIcon from '../icon/folder-color'
import renderFilesListSidebar from './files-list-sidebar'

// exported api
// =

// opts:
//  - hideDate: show the date on the files (bool)
//  - baseUrl: override the base URL of file links (string)
//  - expandedNodes: paths of nodes that should be expanded (Set of strings)
export default function render (root, opts = {}) {
  opts.expandedNodes = opts.expandedNodes || new Set()
  return rFilesList(root, null, opts)
}

function rFilesList (root, selectedNode, opts) {
  if (!root) {
    return yo`<div class="files-list-view"></div>`
  }

  return yo`
    <div class="files-list-view">
      <div
        class="files-list ${root.isEmpty ? 'empty' : ''}"
        onclick=${e => onClickNode(e, root, null, selectedNode, 0, opts)}
        oncontextmenu=${e => onContextMenu(e, root, null, selectedNode, 0, opts)}
      >
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

  const isExpanded = opts.expandedNodes.has(node._path)
  if (isExpanded) {
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
        oncontextmenu=${e => onContextMenu(e, root, node, selectedNode, depth, opts)}
        ondblclick=${e => onDblClickNode(e, node)}
        style=${'padding-left: ' + directoryPadding + 'px'}>
        <div
          class="caret"
          ondblclick=${e => e.stopPropagation()}
          onclick=${e => onClickDirectoryCaret(e, root, node, selectedNode, opts)}
          style="left: ${caretPosition}px; ${isExpanded ? 'transform: rotate(90deg);' : ''}"
        >▶︎</div>

        <img class="icon folder" src="beaker://assets/icon/folder-color.png"/>

        ${node.isRenaming
          ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, root, node, opts)} /></div>`
          : yo`<div class="name">${node.name}</div>`}
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
      oncontextmenu=${e => onContextMenu(e, root, node, selectedNode, depth, opts)}
      ondblclick=${e => onDblClickNode(e, node)}
      style=${'padding-left: ' + padding + 'px'}>

      <img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUJJREFUeNqkk8FKw0AQhmcmyb0HTR7A4hPUS1B8haIetPh4Ei9tUqQn6aUPIra9hRYUTKiCzbiTJpsssdXSgWFnJjsf/85ukJnhaTR6+16vW5xlwFA3yRAIERBxcdXtuvoLcxUMooj/sjiOuR+GQR0gTnXa63SmfA7T2TxfJRd7CAJwXRfOff+uH0WPdY12KTRPbEukKhdoBUYiWCyX4HkeXPj+bTgcOqp8owElgshWjpqeZZv6absNz+MxyIzuez0BXxsKSgm2TbmC0ogYPtIEzjqd3DWY2TxC1WAZALHP1ReslEPR5B4f6bgBkBlsM2b+td5QsK8ZAMuiAwF0IECuEYB3bMctgGLyjmMZE272o7mWACqk0z+PUN+XA9IkmajneZlt3u9OBfJnpmk60SW5X/V4TlTc2mN276rvRYIfAQYABXymGHKpbU8AAAAASUVORK5CYII="/>

      ${node.isRenaming
        ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, root, node, opts)} /></div>`
        : yo`<div class="name">${node.name}</div>`}
    </div>
  `
}

// helpers
// =

async function selectNode (root, newNode, selectedNode, opts) {
  // reset old node
  if (selectedNode) {
    selectedNode.isRenaming = false
  }

  // update state
  selectedNode = newNode

  // render
  redraw(root, selectedNode, opts)

  // read data if needed, and redraw
  if (selectedNode && selectedNode.type === 'file') {
    await selectedNode.readData()
    redraw(root, selectedNode, opts)
  }
}

async function refreshAllNodes (node, opts) {
  await node.readData()
  if (node.hasChildren) {
    const children = node.children
    for (var k in children) {
      if (opts.expandedNodes.has(children[k]._path)) {
        await refreshAllNodes(children[k], opts)
      }
    }
  }
}

// event handlers
// =

async function onClickNode (e, root, node, selectedNode, depth, opts) {
  if (e) {
    e.preventDefault()
    e.stopPropagation()
  }
  selectNode(root, node, selectedNode, opts)
}

async function onContextMenu (e, root, node, selectedNode, depth, opts) {
  e.preventDefault()
  e.stopPropagation()

  // select first
  await onClickNode(null, root, node, selectedNode, depth, opts)
  // wait a frame to let rendering occur (I know, I'm a hack)
  await new Promise(resolve => setTimeout(resolve, 33))

  // now run the menu
  var menu
  const enabled = (node || root).isEditable
  if (node && node.type === 'file') {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: 'Rename', id: 'rename', enabled},
      {label: 'Delete file', id: 'delete', enabled}
    ]
  } else if (node && node.type === 'folder') {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: `New folder in "${node.name}"`, id: 'new-folder', enabled},
      {label: `Import files to "${node.name}"`, id: 'import', enabled},
      {label: 'Rename', id: 'rename', enabled},
      {label: 'Delete folder', id: 'delete', enabled}
    ]
  } else {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: 'New folder', id: 'new-folder', enabled},
      {label: 'Import files', id: 'import', enabled}
    ]
  }
  menu.push({type: 'separator'})
  menu.push({type: 'submenu', label: 'New...', submenu: [
    {label: 'Application', id: 'new-application'},
    {label: 'Code module', id: 'new-module'},
    {label: 'Dataset', id: 'new-dataset'},
    {label: 'Documents folder', id: 'new-document'},
    {label: 'Music folder', id: 'new-music'},
    {label: 'Photos folder', id: 'new-photo'},
    {label: 'Videos folder', id: 'new-video'},
    {label: 'Website', id: 'new-website'}
  ]})
  const action = await beakerBrowser.showContextMenu(menu)

  // now run the action
  node = node || root
  switch (action) {
    case 'open': return window.open(node.url)
    case 'copy-url': return writeToClipboard(node.url)
    case 'rename':
    {
      node.isRenaming = true
      node.renameValue = node.name
      if (selectedNode !== node) selectNode(root, node, selectedNode, opts)
      else redraw(root, selectedNode, opts)
      let input = document.querySelector('.files-list-view input')
      if (input) {
        input.focus()
        input.select()
      }
      return
    }
    case null: return
    default:
      if (action && action.startsWith('new')) {
        let archive = await DatArchive.create({prompt: true, type: action.slice('new-'.length)})
        window.location.pathname = archive.url.slice('dat://'.length)
      } else {
        alert('Todo, sorry!') // TODO
      }
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

async function onClickDirectoryCaret (e, root, node, selectedNode, opts) {
  e.preventDefault()
  e.stopPropagation()
  if (opts.expandedNodes.has(node._path)) {
    opts.expandedNodes.delete(node._path)
  } else {
    opts.expandedNodes.add(node._path)
    await node.readData()
  }
  redraw(root, selectedNode, opts)
}

async function onKeyupRename (e, root, node, opts) {
  node.renameValue = e.target.value

  if (e.code === 'Escape') {
    node.isRenaming = false
    redraw(root, node, opts)
  }
  if (e.code === 'Enter') {
    node.isRenaming = false
    // do rename
    await node.rename(node.renameValue)
    // reload the tree
    await refreshAllNodes(root, opts)
    // redraw with no selected node 
    redraw(root, null, opts)    
  }
}