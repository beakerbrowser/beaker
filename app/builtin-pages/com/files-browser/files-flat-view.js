/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {join as joinPath} from 'path'
import _get from 'lodash.get'
import {FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import renderFilePreview from '../file-preview'
import {shortenHash, pluralize} from '../../../lib/strings'
import {DAT_VALID_PATH_REGEX, STANDARD_ARCHIVE_TYPES} from '../../../lib/const'

// exported api
// =

export default function render (filesBrowser, currentSource) {
  return yo`
    <div
      class="files-tree-view ${currentSource.isEmpty ? 'empty' : ''}"
      onclick=${e => onClickNode(e, filesBrowser, currentSource)}
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

  return yo`
    <div>
      <div class="breadcrumbs">
        <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
          ${filesBrowser.root._archiveInfo.title || 'Untitled'}
        </div>

        ${filesBrowser.getCurrentSourcePath().map(node => rBreadcrumb(filesBrowser, node))}
      </div>

      ${currentSource.type === 'file' || path.length < 1
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
  let numLines
  if (node.preview) {
    numLines = node.preview.split('\n').length
  }

  return yo`
    <div class="file-preview-container">
      <div class="file-preview-header">
        ${numLines
          ? yo`<code class="file-info">${numLines} ${pluralize(numLines, 'line')}</code>`
          : ''
        }
        <code class="file-info">${prettyBytes(node.size)}</code>

        <div class="actions">
          <a href=${node.url} target="_blank" title="Open file">
            <i class="fa fa-external-link"></i>
          </a>
        </div>
      </div>

      <div class="file-preview ${node.preview ? 'text' : 'media'}">
        ${renderFilePreview(node)}
      </div>
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
