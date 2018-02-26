/* globals beaker DatArchive confirm */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import {join as joinPath} from 'path'
import _get from 'lodash.get'
import {FSArchive, FSArchiveFolder, FSArchiveFile, FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import parseDatURL from 'parse-dat-url'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import * as toast from '../toast'
import toggleable from '../toggleable'
import renderArchiveHistory from '../archive-history'
import {writeToClipboard, findParent} from '../../../lib/fg/event-handlers'
import renderFilePreview from '../file-preview'
import {shortenHash, pluralize} from '../../../lib/strings'
import {DAT_VALID_PATH_REGEX, STANDARD_ARCHIVE_TYPES} from '../../../lib/const'

// exported api
// =

export default function render (filesBrowser, currentSource, workspaceInfo) {
  return yo`
    <div class="files-tree-view ${currentSource.isEmpty ? 'empty' : ''}">

      ${rHeader(filesBrowser, currentSource, workspaceInfo)}

      <div
        class="body"
        onclick=${e => onClickNode(e, filesBrowser, currentSource)}>
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

function rHeader (filesBrowser, currentSource, workspaceInfo) {
  return yo`
    <div class="files-browser-header">
      ${rBreadcrumbs(filesBrowser, currentSource)}
      ${rActions(filesBrowser, currentSource)}
      ${renderRevisionsOverview(workspaceInfo)}
      ${rVersion(filesBrowser, currentSource)}
    </div>
  `
}

function rVersion (filesBrowser, currentSource) {
  let archive = filesBrowser.root._archive
  if (!archive) return ''
  let vi = archive.url.indexOf('+')
  if (vi === -1) {
    // showing latest
    return ''
  }
  let urlUnversioned = archive.url.slice(0, vi)
  let version = archive.url.slice(vi + 1)
  return [
    yo`<div class="version-badge badge green">v${version}</div>`,
    yo`<a class="jump-to-latest" href=${`beaker://library/${urlUnversioned}`}>Jump to latest</a>`
  ]
}

function renderRevisionsOverview (workspaceInfo) {
  if (!workspaceInfo) return ''

  const renderRevisionType = rev => yo`<div class="revision-type ${rev.change}"></div>`

  return yo`
    <div class="revisions-overview">
      ${workspaceInfo.revisions.slice(0, 4).map(renderRevisionType)}
      <span class="label" onclick=${() => emitSetView('revisions')}>
        ${workspaceInfo.revisions && workspaceInfo.revisions.length
          ? `${workspaceInfo.revisions.length} ${pluralize(workspaceInfo.revisions.length, 'unpublished revision')}`
          : yo`<em>No unpublished revisions</em>`
        }
      </span>

      <div class="buttons">
        ${workspaceInfo.revisions && workspaceInfo.revisions.length
          ? yo`
            <button class="btn plain" onclick=${() => emitSetView('revisions')}>
              <i class="fa fa-code"></i>
              <span>Review changes</span>
            </button>`
          : ''
        }

        <a href="workspace://${workspaceInfo.name}" class="btn plain" target="_blank">
          <i class="fa fa-external-link"></i>
          <span>Local preview</span>
        </a>
      </div>
    </div>
  `
}

function rActions (filesBrowser, currentSource) {
  const renderOpenHistory = () => renderArchiveHistory(filesBrowser.root._archive)
  return yo`
    <div class="actions">
      ${toggleable(yo`
        <div class="dropdown toggleable-container archive-history-dropdown">
          <button class="btn plain toggleable">
            <i class="fa fa-archive"></i>
          </button>

          <div class="dropdown-items right toggleable-open-container"></div>
        </div>
      `, renderOpenHistory)}
      ${(currentSource.isEditable && currentSource.type !== 'file')
        ? window.OS_CAN_IMPORT_FOLDERS_AND_FILES
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
        : ''
      }
    </div>
  `
}

function rBreadcrumbs (filesBrowser, currentSource) {
  const path = filesBrowser.getCurrentSourcePath()
  return yo`
    <div class="breadcrumbs">
      <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
        ${path.length ? yo`<i class="fa fa-level-up fa-flip-horizontal"></i>` : '.'}
      </div>

      ${path.map(node => rBreadcrumb(filesBrowser, node))}
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
    <div class="breadcrumb" onclick=${e => onClickNode(e, filesBrowser, node)} title=${node.name}>
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
        oncontextmenu=${e => onContextmenuNode(e, filesBrowser, node)}
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
      oncontextmenu=${e => onContextmenuNode(e, filesBrowser, node)}
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

function onContextmenuNode (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    items: [
      {icon: 'external-link', label: `Open ${node.isContainer ? 'folder' : 'file'} in new tab`, click: () => window.open(node.url)},
      {icon: 'link', label: 'Copy URL', click: () => {
        writeToClipboard(node.url)
        toast.create('URL copied to clipboard')
      }},
      {icon: 'i-cursor', label: 'Rename', click: async () => {
        let newName = await contextInput.create({
          x: e.clientX,
          y: e.clientY,
          label: 'Name',
          value: node.name,
          action: 'Rename',
          postRender () {
            const i = node.name.lastIndexOf('.')
            if (i !== 0 && i !== -1) {
              // select up to the file-extension
              const input = document.querySelector('.context-input input')
              input.setSelectionRange(0, node.name.lastIndexOf('.'))
            }
          }
        })
        if (newName) {
          emitRenameFile(node._path, newName)
        }
      }},
      {icon: 'trash', label: 'Delete', click: () => {
        if (confirm(`Are you sure you want to delete ${node.name}?`)) {
          emitDeleteFile(node._path, node.isContainer)
        }
      }}
    ]
  })
}

function emitAddFile (src, dst) {
  document.body.dispatchEvent(new CustomEvent('custom-add-file', {detail: {src, dst}}))
}

function emitRenameFile (path, newName) {
  document.body.dispatchEvent(new CustomEvent('custom-rename-file', {detail: {path, newName}}))
}

function emitDeleteFile (path, isFolder) {
  document.body.dispatchEvent(new CustomEvent('custom-delete-file', {detail: {path, isFolder}}))
}

function emitSetView (view) {
  document.body.dispatchEvent(new CustomEvent('custom-set-view', {detail: {view, href: view}}))
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
