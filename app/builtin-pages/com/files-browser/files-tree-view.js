/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import {join as joinPath} from 'path'
import {FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import {DAT_VALID_PATH_REGEX} from '../../../lib/const'

// exported api
// =

export default function render (filesBrowser, root) {
  return yo`
    <div
      class="files-tree-view ${root.isEmpty ? 'empty' : ''}"
      onclick=${e => onClickNode(e, filesBrowser, root)}
      oncontextmenu=${e => onContextMenu(e, filesBrowser, root)}
    >
      <div
        class="droptarget"
        ondragover=${onDragOver}
        ondragenter=${e => onDragEnter(e, filesBrowser, root)}
        ondragleave=${onDragLeave}
        ondrop=${e => onDrop(e, filesBrowser, root)}
      >
        ${rChildren(filesBrowser, root.children)}
      </div>
    </div>
  `
}

// rendering
// =


function rChildren (filesBrowser, children, depth = 0) {
  if (children.length === 0 && depth === 0) {
    return yo`
      <div class="item empty"><em>No files</em></div>
    `
  }

  return children.map(childNode => rNode(filesBrowser, childNode, depth))
}

function rNode (filesBrowser, node, depth) {
  if (node.isContainer) {
    return rDirectory(filesBrowser, node, depth)
  } else {
    return rFile(filesBrowser, node, depth)
  }
}

function rDirectory (filesBrowser, node, depth) {
  const isSelected = filesBrowser.isSelected(node)
  const isExpanded = filesBrowser.isExpanded(node)
  let children = ''
  const directoryPadding = 20 + (depth * 20)
  const caretPosition = directoryPadding - 15

  if (isExpanded) {
    children = yo`
      <div class="subtree">
        ${rChildren(filesBrowser, node.children, depth + 1)}
      </div>
    `
  }

  return yo`
    <div
      class="droptarget"
      ondragover=${onDragOver}
      ondragenter=${e => onDragEnter(e, filesBrowser, node)}
      ondragleave=${onDragLeave}
      ondrop=${e => onDrop(e, filesBrowser, node)}
    >
      <div
        class="item folder ${isSelected ? 'selected' : ''}"
        title=${node.name}
        draggable="true"
        onclick=${e => onClickNode(e, filesBrowser, node)}
        oncontextmenu=${e => onContextMenu(e, filesBrowser, node)}
        ondblclick=${e => onDblClickNode(e, filesBrowser, node)}
        ondragstart=${e => onDragStart(e, filesBrowser, node)}
        style=${'padding-left: ' + directoryPadding + 'px'}
      >
        <div
          class="caret"
          ondblclick=${e => e.stopPropagation()}
          onclick=${e => onClickDirectoryCaret(e, filesBrowser, node)}
          style="left: ${caretPosition}px; ${isExpanded ? 'transform: rotate(90deg);' : ''}"
        >▶︎</div>

        <img class="icon folder" src="beaker://assets/icon/folder-color.png"/>

        ${node.isRenaming
          ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
          : yo`<div class="name">${node.name}</div>`}
      </div>
      ${children}
    </div>
  `
}

function rFile (filesBrowser, node, depth) {
  const isSelected = filesBrowser.isSelected(node)
  const padding = 20 + (depth * 20)

  return yo`
    <div
      class="item file ${isSelected ? 'selected' : ''}"
      title=${node.name}
      draggable="true"
      onclick=${e => onClickNode(e, filesBrowser, node)}
      oncontextmenu=${e => onContextMenu(e, filesBrowser, node)}
      ondblclick=${e => onDblClickNode(e, filesBrowser, node)}
      ondragstart=${e => onDragStart(e, filesBrowser, node)}
      style=${'padding-left: ' + padding + 'px'}
    >

      <img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUJJREFUeNqkk8FKw0AQhmcmyb0HTR7A4hPUS1B8haIetPh4Ei9tUqQn6aUPIra9hRYUTKiCzbiTJpsssdXSgWFnJjsf/85ukJnhaTR6+16vW5xlwFA3yRAIERBxcdXtuvoLcxUMooj/sjiOuR+GQR0gTnXa63SmfA7T2TxfJRd7CAJwXRfOff+uH0WPdY12KTRPbEukKhdoBUYiWCyX4HkeXPj+bTgcOqp8owElgshWjpqeZZv6absNz+MxyIzuez0BXxsKSgm2TbmC0ogYPtIEzjqd3DWY2TxC1WAZALHP1ReslEPR5B4f6bgBkBlsM2b+td5QsK8ZAMuiAwF0IECuEYB3bMctgGLyjmMZE272o7mWACqk0z+PUN+XA9IkmajneZlt3u9OBfJnpmk60SW5X/V4TlTc2mN276rvRYIfAQYABXymGHKpbU8AAAAASUVORK5CYII="/>

      ${node.isRenaming
        ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
        : yo`<div class="name">${node.name}</div>`}
    </div>
  `
}

// helpers
// =

async function enterRenameMode (filesBrowser, node) {
  await filesBrowser.selectOne(node) // select the node
  node.isRenaming = true
  node.renameValue = node.name
  filesBrowser.rerender()
  let input = filesBrowser.lastRenderedElement.querySelector('input')
  if (input) {
    input.focus()
    input.select()
  }
}

// event handlers
// =

async function onClickNode (e, filesBrowser, node) {
  if (e) {
    e.preventDefault()
    e.stopPropagation()

    // dont do anything if this was a click on an input field (renaming)
    if (e.target.tagName === 'INPUT') {
      return
    }
  }
  // TODO multi selection
  await filesBrowser.selectOne(node)
}

async function onContextMenu (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  // select first
  await onClickNode(null, filesBrowser, node)
  // HACK wait a frame to let rendering occur -prf
  await new Promise(resolve => setTimeout(resolve, 33))

  // now run the menu
  var menu
  const enabled = node.isEditable && node._path !== '/dat.json'
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
  menu.push({
    type: 'submenu',
    label: 'New archive...',
    submenu: [
      {label: 'Application', id: 'new-application'},
      {label: 'Code module', id: 'new-module'},
      {label: 'Dataset', id: 'new-dataset'},
      {label: 'Documents', id: 'new-documents'},
      {label: 'Music', id: 'new-music'},
      {label: 'Photos', id: 'new-photos'},
      {label: 'Videos', id: 'new-videos'},
      {label: 'Website', id: 'new-website'}
    ]
  })
  const action = await beaker.browser.showContextMenu(menu)

  // now run the action
  switch (action) {
    case 'open': return window.open(node.url)
    case 'copy-url': return writeToClipboard(node.url)
    case 'rename': return enterRenameMode(filesBrowser, node)
    case 'delete':
      if (confirm(`Are you sure you want to delete "${node.name}"?`)) {
        await node.delete()
        await filesBrowser.reloadTree()
        filesBrowser.unselectAll()
        filesBrowser.rerender()
      }
      return
    case 'new-folder':
    {
      // create a new virtual node
      let parentPath = node._path || '/'
      let newFolderNode = new FSArchiveFolder_BeingCreated(node._archiveInfo, node._archive, parentPath)
      node._files.push(newFolderNode)

      // put it into rename mode
      enterRenameMode(filesBrowser, newFolderNode)
      return
    }
    case 'import':
    {
      let files = await beaker.browser.showOpenDialog({
        title: 'Import files to this archive',
        buttonLabel: 'Import',
        properties: ['openFile', 'openDirectory', 'multiSelections']
      })
      if (files) {
        await Promise.all(files.map(src => DatArchive.importFromFilesystem({
          src,
          dst: node.url,
          ignore: ['dat.json'],
          inplaceImport: false
        })))
        await filesBrowser.reloadTree()
        filesBrowser.rerender()
      }
      return
    }
    case null: return
    default:
      if (action && action.startsWith('new')) {
        let archive = await DatArchive.create({prompt: true, type: action.slice('new-'.length)})
        window.location.pathname = archive.url.slice('dat://'.length)
      }
  }
}

function onDblClickNode (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  // open in a new window
  if (node.url) {
    window.open(node.url)
  }
}

async function onClickDirectoryCaret (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()
  if (filesBrowser.isExpanded(node)) {
    filesBrowser.collapse(node)
  } else {
    filesBrowser.expand(node)
    await node.readData()
  }
  filesBrowser.rerender()
}

async function onKeyupRename (e, filesBrowser, node) {
  node.renameValue = e.target.value

  if (e.code === 'Enter') {
    // validate the name
    if (!DAT_VALID_PATH_REGEX.test(node.renameValue) || node.renameValue.includes('/')) {
      return
    }
    // protect the manifest
    if (node._path === '/dat.json') {
      return
    }
    let newpath = (node._path ? node._path.split('/').slice(0, -1).join('/') : '') + '/' + node.renameValue
    if (newpath === '/dat.json') {
      return
    }
    // do rename
    await node.rename(node.renameValue)
    await filesBrowser.reloadTree()
    filesBrowser.unselectAll()
    filesBrowser.rerender()
  }
  if (e.code === 'Escape') {
    if (node instanceof FSArchiveFolder_BeingCreated) {
      // if this was a new folder, reload the tree to remove that temp node
      await filesBrowser.reloadTree()
    } else {
      node.isRenaming = false
    }
    filesBrowser.rerender()
  }
}

function onDragStart (e, filesBrowser, node) {
  // select node
  filesBrowser.selectOne(node)

  // start drag
  e.dataTransfer.setData('text/uri-list', node.url)
  e.dataTransfer.dropEffect = 'copy'
  filesBrowser.setCurrentlyDraggedNode(node)
}

async function onDragEnter (e, filesBrowser, node) {
  // add dragover class
  const target = findParent(e.target, 'droptarget')
  if (!target) return
  target.classList.add('dragover')

  // expand on prolonged hover
  if (filesBrowser.isExpanded(node)) return

  // wait a moment
  await new Promise(resolve => setTimeout(resolve, 500))

  // still selected and not expanded?
  if (!target.classList.contains('dragover')) return
  if (filesBrowser.isExpanded(node)) return

  // expand
  filesBrowser.expand(node)
  await node.readData()
  filesBrowser.rerender()
}

function onDragOver (e) {
  const target = findParent(e.target, 'droptarget')
  if (!target) return
  target.classList.add('dragover')
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return false
}

function onDragLeave (e) {
  const target = findParent(e.target, 'droptarget')
  if (!target) return
  target.classList.remove('dragover')
}

async function onDrop (e, filesBrowser, dropNode) {
  // onto a target?
  const target = findParent(e.target, 'droptarget')
  if (!target) return

  // end the drag
  const dragNode = filesBrowser.getCurrentlyDraggedNode()
  filesBrowser.setCurrentlyDraggedNode(null)
  target.classList.remove('dragover')
  e.preventDefault()
  e.stopPropagation()

  // internal drag
  if (dragNode) {
    // do nothing if this is the dragged node's container
    if (dropNode._files && dropNode._files.includes(dragNode)) {
      return
    }

    // open a context menu asking for the action to take
    const dropPath = dropNode.type === 'archive' ? '/' : dropNode._path
    const action = await beaker.browser.showContextMenu([
      {label: `Copy "${dragNode.name}" to "${dropPath || dropNode.name}"`, id: 'copy'},
      {label: `Move "${dragNode.name}" to "${dropPath || dropNode.name}"`, id: 'move'}
    ])
    if (action === 'move') {
      await dragNode.move(joinPath(dropNode._path || '/', dragNode.name))
      await filesBrowser.reloadTree()
      filesBrowser.rerender()
    } else if (action === 'copy') {
      await dragNode.copy(joinPath(dropNode._path || '/', dragNode.name))
      await filesBrowser.reloadTree()
      filesBrowser.rerender()
    }
  }

  // files dragged in from the OS
  if (e.dataTransfer.files.length) {
    await Promise.all(Array.from(e.dataTransfer.files).map(file => (
      DatArchive.importFromFilesystem({
        src: file.path,
        dst: dropNode.url,
        ignore: ['dat.json'],
        inplaceImport: true
      })
    )))
    await filesBrowser.reloadTree()
    filesBrowser.rerender()
  }
}