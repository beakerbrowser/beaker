/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {join as joinPath} from 'path'
import _get from 'lodash.get'
import {FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import toggleable from '../toggleable'
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

      ${rHeader(filesBrowser, currentSource)}

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

function rHeader (filesBrowser, currentSource) {
  return yo`
    <div class="files-browser-header">
      ${rBreadcrumbs(filesBrowser, currentSource)}
      ${rActions(filesBrowser, currentSource)}
    </div>
  `
}

function rActions (filesBrowser, currentSource) {
  if (currentSource.type === 'file') return ''

  return yo`
    <div class="actions">
      ${window.OS_CAN_IMPORT_FOLDERS_AND_FILES
        ? yo`
          <button onclick=${e => onAddFiles(e, currentSource, false)} class="btn">
            Add files
          </button>`
        : toggleable(yo`
          <div class="dropdown toggleable-container">
            <button class="btn toggleable">
              Add files
            </button>

            <div class="dropdown-items right">
              <div class="dropdown-item" onclick=${e => onAddFiles(e, currentSource, true)}>
                <i class="fa fa-files-o"></i>
                Choose files
              </div>

              <div class="dropdown-item" onclick=${e => onAddFolder(e, currentSource)}>
                <i class="fa fa-folder-open-o"></i>
                Choose folder
              </div>
            </div>
          </div>
        `)
      }
    </div>
  `
}

function rBreadcrumbs (filesBrowser, currentSource) {
  return yo`
    <div class="breadcrumbs">
      <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
        ${filesBrowser.root._archiveInfo.title || 'Untitled'}
      </div>

      ${filesBrowser.getCurrentSourcePath().map(node => rBreadcrumb(filesBrowser, node))}
    </div>`
}

function rFilePreview (node) {
  let numLines
  let lineNumbers = []

  if (node.preview) {
    numLines = node.preview.split('\n').length

    for (let i = 1; i <= numLines; i++) {
      lineNumbers.push(yo`<div class="lineno">${i}</div>`)
    }
  }

  return yo`
    <div class="file-preview-container">
      <div class="file-preview-header">
        <code class="path">${node.name}</code>

        <span class="separator">|</span>

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
        <div class="linenos">
          ${lineNumbers}
        </div>
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
  const path = filesBrowser.getCurrentSourcePath()
  const parentNode = (path.length >= 2) ? path[path.length - 2] : filesBrowser.root

  return yo`
    <div>
      ${path.length < 1
        ? ''
        : yo`
          <div class="item ascend" onclick=${e => onClickNode(e, filesBrowser, parentNode)}>
            ..
          </div>`
      }

      ${children.length === 0 && depth === 0
        ? yo`<div class="item empty"><em>No files</em></div>`
        : children.map(childNode => rNode(filesBrowser, childNode, depth))
      }
    </div>`
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

async function emitAddFile (src, dst) {
  document.body.dispatchEvent(new CustomEvent('custom-add-file', {detail: {src, dst}}))
}

async function onAddFiles (e, node, filesOnly) {
  var files = await beaker.browser.showOpenDialog({
    title: 'Add files to this archive',
    buttonLabel: 'Add',
    properties: ['openFile', filesOnly ? false : 'openDirectory', 'multiSelections', 'createDirectory'].filter(Boolean)
  })
  if (files) {
    files.forEach(src => emitAddFile(src, node.url))
  }
}

async function onAddFolder (e, node) {
  var files = await beaker.browser.showOpenDialog({
    title: 'Add a folder to this archive',
    buttonLabel: 'Add',
    properties: ['openDirectory', 'createDirectory']
  })
  if (files) {
    files.forEach(src => emitAddFile(src, node.url))
  }
}
