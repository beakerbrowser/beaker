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
        <div class="name-container"><div class="name">${node.name}</div></div>
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
      <div class="name-container"><div class="name">${node.name}</div></div>
      <div class="updated">${node.mtime ? niceMtime(node.mtime) : ''}</div>
      <div class="size">${typeof node.size === 'number' ? prettyBytes(node.size) : '--'}</div>
    </div>
  `
}

// helpers
// =

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