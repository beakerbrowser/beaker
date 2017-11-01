/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {join as joinPath} from 'path'
import {FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import rIcon from './node-icon'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import {DAT_VALID_PATH_REGEX, STANDARD_ARCHIVE_TYPES} from '../../../lib/const'

// exported api
// =

export default function render (filesBrowser, root) {
  return yo`
    <div
      class="files-tree-view ${root.isEmpty ? 'empty' : ''}"
      onclick=${e => onClickNode(e, filesBrowser, root)}
      oncontextmenu=${e => onContextMenu(e, filesBrowser, root)}
    >
      <div class="item header">
        ${rColumnHeader(filesBrowser, 'name', 'Name')}
        ${rColumnHeader(filesBrowser, 'updated', 'Last Updated')}
        ${rColumnHeader(filesBrowser, 'size', 'Size')}
        ${rColumnHeader(filesBrowser, 'type', 'Type')}
      </div>
      <div class="body">
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
      <div class="footer">
        ${rFooter(filesBrowser)}
      </div>
    </div>
  `
}

// rendering
// =

function rColumnHeader (filesBrowser, id, label) {
  var [sortColumn, sortDir] = filesBrowser.currentSort
  return yo`
    <div
      class="${id} ${sortColumn === id ? sortDir : ''}"
      onclick=${e => filesBrowser.toggleSort(id)}
    >${label}</div>
  `
}

function rFooter (filesBrowser) {
  return yo`<div class="breadcrumbs">${filesBrowser.getCurrentSourcePath().map(node => rBreadcrumb(filesBrowser, node))}</div>`
}

function rBreadcrumb (filesBrowser, node) {
  if (!node) return ''
  return yo`
    <div class="breadcrumb" ondblclick=${e => onDblClickNode(e, filesBrowser, node)}>
      ${rIcon(node, {noArchiveTypes: true})}
      ${node.name}
    </div>
  `
}

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
    return rContainer(filesBrowser, node, depth)
  } else {
    return rFile(filesBrowser, node, depth)
  }
}

function rContainer (filesBrowser, node, depth) {
  const isSelected = filesBrowser.isSelected(node)
  const isExpanded = filesBrowser.isExpanded(node)
  const isArchive = node && node.constructor.name === 'FSArchive'
  let children = ''
  const directoryPadding = 10 + (depth * 20)
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
        <i class="fa fa-folder${isExpanded ? '-open' : ''}-o"></i>
        ${node.isRenaming
          ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
          : yo`<div class="name">${node.name}</div>`}
        <div class="updated">${node.mtime ? niceMtime(node.mtime) : ''}</div>
        <div class="size">${node.size ? prettyBytes(node.size) : '--'}</div>
        <div class="type">${node.type}</div>
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
      <i class="fa fa-file-text-o"></i>
      ${node.isRenaming
        ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
        : yo`<div class="name">${node.name}</div>`}
      <div class="updated">${node.mtime ? niceMtime(node.mtime) : ''}</div>
      <div class="size">${typeof node.size === 'number' ? prettyBytes(node.size) : '--'}</div>
      <div class="type">${node.type}</div>
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

const today = moment()
function niceMtime (ts) {
  ts = moment(ts)
  if (ts.isSame(today, 'day')) {
    return 'Today, ' + ts.format('h:mma')
  }
  return ts.format('ll, h:mma')
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
  // HACK wait a frame or two to let rendering occur -prf
  await new Promise(resolve => setTimeout(resolve, 66))

  // now run the menu
  var menu = []
  const enabled = node.isEditable && node._path !== '/dat.json'
  if (node instanceof FSArchiveFile) {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: 'Rename', id: 'rename', enabled},
      {label: 'Delete file', id: 'delete', enabled},
      {type: 'separator'}
    ]
  } else if (node instanceof FSArchiveFolder) {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: `New folder in "${node.name}"`, id: 'new-folder', enabled},
      {label: `Import files to "${node.name}"`, id: 'import', enabled},
      {label: 'Rename', id: 'rename', enabled},
      {label: 'Delete folder', id: 'delete', enabled},
      {type: 'separator'}
    ]
  } else if (node instanceof FSArchive) {
    menu = [
      {label: 'Open URL', id: 'open'},
      {label: 'Copy URL', id: 'copy-url'},
      {type: 'separator'},
      {label: 'New folder', id: 'new-folder', enabled},
      {label: 'Import files', id: 'import', enabled},
      {label: 'Export files', id: 'export'},
      {label: 'Delete archive', id: 'delete'},
      {type: 'separator'}
    ]
  }
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
      let newFolderNode = new FSArchiveFolder_BeingCreated(node, node._archiveInfo, node._archive, parentPath)
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
    case 'export': return beaker.browser.downloadURL(`${node.url}?download_as=zip`)
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
  if (node.isContainer) {
    filesBrowser.setCurrentSource(node)
  } else if (node.url) {
    window.open(node.url)
  }
}

async function onClickDirectoryCaret (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()
  if (filesBrowser.isExpanded(node)) {
    await filesBrowser.collapse(node)
  } else {
    await filesBrowser.expand(node)
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
  await filesBrowser.expand(node)
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
    if (dragNode === dropNode || (dropNode._files && dropNode._files.includes(dragNode))) {
      return
    }

    // open a context menu asking for the action to take
    const dropPath = dropNode._path ? dropNode._path : '/'
    const action = await beaker.browser.showContextMenu([
      {label: `Copy "${dragNode.name}" to "${dropPath || dropNode.name}"`, id: 'copy'},
      (dragNode instanceof FSArchive) ? null : {label: `Move "${dragNode.name}" to "${dropPath || dropNode.name}"`, id: 'move'}
    ].filter(Boolean))
    if (action === 'move') {
      await dragNode.move(joinPath(dropNode._path || '/', dragNode.name), dropNode._archiveInfo.key)
      await filesBrowser.reloadTree()
      filesBrowser.rerender()
    } else if (action === 'copy') {
      await dragNode.copy(joinPath(dropNode._path || '/', dragNode.name), dropNode._archiveInfo.key)
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