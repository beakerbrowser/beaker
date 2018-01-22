/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {join as joinPath} from 'path'
import _get from 'lodash.get'
import {FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import renderFilePreview from '../file-preview'
import {shortenHash} from '../../../lib/strings'
import {DAT_VALID_PATH_REGEX, STANDARD_ARCHIVE_TYPES} from '../../../lib/const'

// exported api
// =

export default function render (filesBrowser, currentSource) {
  return yo`
    <div
      class="files-tree-view ${currentSource.isEmpty ? 'empty' : ''}"
      onclick=${e => onClickNode(e, filesBrowser, currentSource)}
      oncontextmenu=${e => onContextMenu(e, filesBrowser, currentSource)}
    >

      ${rBreadcrumbs(filesBrowser, currentSource)}

      <div class="body">
        <div>
          ${currentSource.type === 'file'
            ? rFilePreview(currentSource)
            : rChildren(filesBrowser, currentSource.children)
          }
        </div>
      </div>
    </div>
  `
}

// rendering
// =

function rBreadcrumbs (filesBrowser, currentSource) {
  let path = filesBrowser.getCurrentSourcePath()
  let parentNode = (path.length >= 2) ? path[path.length - 2] : filesBrowser.root
  const shortenedHash = shortenHash(filesBrowser.root._archiveInfo.url)

  if (path.length < 1) return ''
  return yo`
    <div>
      <div class="breadcrumbs">
        <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
          ${_get(filesBrowser.root._archiveInfo, 'title', 'Untitled')}
        </div>

        ${filesBrowser.getCurrentSourcePath().map(node => rBreadcrumb(filesBrowser, node))}
      </div>

      ${currentSource.type === 'file'
        ? ''
        : yo`
          <div class="breadcrumbs ascend">
            <div class="breadcrumb" onclick=${e => onClickNode(e, filesBrowser, parentNode)}>
              ..
            </div>
          </div>`
      }
    </div>
  `
}

function rFilePreview (node) {
  return yo`
    <div class="file-preview">
      ${renderFilePreview(node)}
    </div>
  `
}

function rBreadcrumb (filesBrowser, node) {
  if (!node) return ''
  return yo`
    <div class="breadcrumb" onclick=${e => onClickNode(e, filesBrowser, node)}>
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
  const isArchive = node && node.constructor.name === 'FSArchive'
  let children = ''

  return yo`
    <div>
      <div
        class="item folder"
        title=${node.name}
        onclick=${e => onClickNode(e, filesBrowser, node)}
        oncontextmenu=${e => onContextMenu(e, filesBrowser, node)}
      >
        <i class="fa fa-folder"></i>
        ${node.isRenaming
          ? yo`<div class="name" ><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
          : yo`<div class="name-container"><div class="name">${node.name}</div></div>`}
        <div class="updated">${node.mtime ? niceMtime(node.mtime) : ''}</div>
        <div class="size">${node.size ? prettyBytes(node.size) : '--'}</div>
      </div>
      ${children}
    </div>
  `
}

function rFile (filesBrowser, node, depth) {
  return yo`
    <div
      class="item file"
      title=${node.name}
      onclick=${e => onClickNode(e, filesBrowser, node)}
      oncontextmenu=${e => onContextMenu(e, filesBrowser, node)}
    >
      <i class="fa fa-file-text-o"></i>
      ${node.isRenaming
        ? yo`<div class="name"><input value=${node.renameValue} onkeyup=${e => onKeyupRename(e, filesBrowser, node)} /></div>`
        : yo`<div class="name-container"><div class="name">${node.name}</div></div>`}
      <div class="updated">${node.mtime ? niceMtime(node.mtime) : ''}</div>
      <div class="size">${typeof node.size === 'number' ? prettyBytes(node.size) : '--'}</div>
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

function onClickNode (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  filesBrowser.setCurrentSource(node)
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
  const enabled = node.isEditable && node._archiveInfo.userSettings.isSaved && node._path !== '/dat.json'
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
      {label: 'Export as .zip', id: 'export'},
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
