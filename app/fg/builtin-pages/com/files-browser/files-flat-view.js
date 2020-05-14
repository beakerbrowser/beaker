/* globals beaker confirm CustomEvent */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import _get from 'lodash.get'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import * as toast from '../toast'
import toggleable2 from '../toggleable2'
import {DAT_VALID_PATH_REGEX} from '../../../../lib/const'
import {writeToClipboard} from '../../../lib/event-handlers'
import renderFilePreview from './file-preview'
import {render as renderFileEditor} from './file-editor'
import {shorten, pluralize} from '../../../../lib/strings'

// exported api
// =

export default function render (filesBrowser, currentSource) {
  if (!currentSource) {
    // file not found
    return yo`
      <div class="files-tree-view empty">
        ${rHeader(filesBrowser, currentSource)}

        <div class="message notfound">
          <i class="fa fa-exclamation-circle"></i>
          File not found
        </div>
      </div>`
  }
  return yo`
    <div class="files-tree-view ${currentSource.isEmpty ? 'empty' : ''}">

      ${rHeader(filesBrowser, currentSource)}

      <div class="body ${currentSource.type === 'file' ? 'file' : ''}">
        ${currentSource.type === 'file'
          ? filesBrowser.isEditMode
            ? rFileEditor(currentSource)
            : rFilePreview(filesBrowser, currentSource)
          : rChildren(filesBrowser, currentSource.children)
        }
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
      ${rMetadata(filesBrowser, currentSource)}
      ${rVersion(filesBrowser, currentSource)}
      ${rActions(filesBrowser, currentSource)}
    </div>
  `
}

function rVersion (filesBrowser, currentSource) {
  var archive = filesBrowser.root._archive
  if (!archive) return ''

  var previewMode = _get(archive, 'info.userSettings.previewMode', false)
  var version = 'latest'
  var vi = archive.url.indexOf('+')
  if (vi !== -1) {
    version = archive.url.slice(vi + 1)
  }
  // is the version a number?
  if (version == +version) {
    version = `v${version}`
  }

  if (filesBrowser.isEditMode) {
    if (previewMode && version !== 'preview') {
      return yo`
        <div class="warning">
          * You are editing the live version of this file.
          <a class="link" href="beaker://library/${archive.checkout('preview').url}${currentSource._path}">
            Edit preview
          </a>
        </div>`
    }
    return ''
  }
}

function rMetadata (filesBrowser, node) {
  if (!node || filesBrowser.isEditMode) {
    return ''
  }

  var numLines
  var isTextual = typeof node.fileData === 'string' // fileData is only set for text items

  if (node.fileData) {
    numLines = node.fileData.split('\n').length
  }

  return yo`
    <div class="metadata">
      ${numLines
        ? [
          yo`
            <span class="file-info">
              ${numLines} ${pluralize(numLines, 'line')}
            </span>`,
          yo`<span class="separator">|</span>`
        ]
        : ''
      }
      <span class="file-info">${prettyBytes(node.size)}</span>
    </div>`
}

function rActions (filesBrowser, currentSource) {
  if (!currentSource || filesBrowser.isEditMode) {
    return ''
  }

  var isTextual = typeof currentSource.fileData === 'string' // fileData is only set for text items
  var isEditing = filesBrowser.isEditMode
  var buttonGroup = []

  var isHistoricalVersion = false
  var version
  var vi = currentSource._archive.url.indexOf('+')
  if (vi !== -1) {
    version = currentSource._archive.url.slice(vi + 1)
  }
  // is the version a number?
  if (version == +version) {
    isHistoricalVersion = true
  }

  if (
    currentSource.isEditable &&
    !isHistoricalVersion &&
    !isEditing &&
    currentSource.type === 'file'
  ) {
    buttonGroup.push(
      yo`
        <button class="action btn trash nofocus tooltip-container delete" data-tooltip="Delete file" onclick=${e => onClickDeleteFile(e, filesBrowser, currentSource)}>
          <i class="fas fa-trash"></i>
        </button>`
    )

    if (isTextual) {
      buttonGroup.push(
        yo`
          <button class="action btn nofocus tooltip-container" data-tooltip="Edit file" onclick=${onClickEditFile}>
            <i class="fas fa-pencil-alt"></i>
          </button>`
      )
    }
  }

  return yo`
    <div class="actions">
      <a
        class="action btn plain tooltip-container"
        onclick=${e => onClickDownload(e, currentSource)}
        data-tooltip="Download ${currentSource.type}${currentSource.type !== 'file' ? ' as .zip' : ''}"
      >
        <i class="fa fa-download"></i>
      </a>

      ${currentSource.isEditable && !isHistoricalVersion && currentSource.type !== 'file'
        ?
          toggleable2({
            id: 'folder-actions-dropdown',
            closed: ({onToggle}) => yo`
              <div class="dropdown toggleable-container new-dropdown">
                <button class="btn toggleable" onclick=${onToggle}>
                  <span class="fa fa-plus"></span>
                </button>
              </div>`,
            open: ({onToggle}) => yo`
              <div class="dropdown toggleable-container new-dropdown">
                <button class="btn toggleable" onclick=${onToggle}>
                  <span class="fa fa-plus"></span>
                </button>

                <div class="dropdown-items compact right" onclick=${onToggle}>
                  <div class="dropdown-item" onclick=${e => emit('custom-create-file')}>
                    Create file
                  </div>

                  <div class="dropdown-item" onclick=${e => emit('custom-create-file', {createFolder: true})}>
                    Create folder
                  </div>

                  <hr>

                  ${window.OS_CAN_IMPORT_FOLDERS_AND_FILES
                    ? yo`
                      <div class="dropdown-item" onclick=${e => onAddFiles(e, currentSource, false)}>
                        Import files
                      </div>`
                    :
                      [
                        yo`
                          <div class="dropdown-item" onclick=${e => onAddFiles(e, currentSource, true)}>
                            <i class="fas fa-copy"></i>
                            Import files
                          </div>`,
                        yo`
                          <div class="dropdown-item" onclick=${e => onAddFolder(e, currentSource)}>
                            <i class="fa fa-folder-open-o"></i>
                            Import folder
                          </div>`
                      ]
                    }
                </div>
              </div>`
            })
        : ''
      }

      ${!isEditing && currentSource.type === 'file'
        ? yo`
          <a  class="action btn plain tooltip-container" href=${currentSource.url} target="_blank" data-tooltip="Open file">
            <i class="fas fa-external-link-alt"></i>
          </a>`
        : ''
      }

      ${buttonGroup.length
        ? yo`<div class="btn-group">${buttonGroup}</div>`
        : ''
      }
    </div>
  `
}

function rBreadcrumbs (filesBrowser, currentSource) {
  const path = filesBrowser.getCurrentSourcePath()
  const isCramped = guessBreadcrumbWidthInPixels(path) > 500
  return yo`
    <div class="breadcrumbs ${isCramped ? 'cramped' : ''}">
      <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
        ${path.length > 0 ? shorten(filesBrowser.root.name, 30) : filesBrowser.root.name}
      </div>

      ${path.map((node, i) => rBreadcrumb(filesBrowser, node, i, path.length, isCramped))}
      ${!currentSource ? rBreadcrumb(filesBrowser, {name: getNotfoundPathnameFromUrl()}, 1, 1, false) : ''}
    </div>`
}

function rBreadcrumb (filesBrowser, node, i, len, isCramped) {
  if (!node) return ''
  var isSecondToLast = (i === len - 2)
  var isLast = (i === len - 1)
  var isEditing = filesBrowser.isEditMode && isLast
  if (isEditing) {
    return yo`
      <div class="breadcrumb">
        <input type="text" class="editor-filename" value=${node.name} />
      </div>`
  }
  var label = isLast ? node.name : shorten(node.name, 30)
  if (isCramped && isSecondToLast) label = '..'
  return yo`
    <div class="breadcrumb" onclick=${e => onClickNode(e, filesBrowser, node)} title=${node.name}>
      ${label}
    </div>`
}

function rFilePreview (filesBrowser, node) {
  var numLines
  var isTextual = typeof node.fileData === 'string' // fileData is only set for text items

  if (node.fileData) {
    numLines = node.fileData.split('\n').length
  }

  return yo`
    <div class="file-view-container">
      <div class="file-editor-controls ${filesBrowser.isEditMode ? '' : 'hidden'}"></div>
      ${renderFilePreview(node)}
    </div>
  `
}

function rFileEditor (node) {
  return yo`
    <div class="file-view-container">
      <div class="file-editor-controls">
        <span class="editor-options">
          <select onchange=${onChangeIndentationMode} name="indentationMode">
            <optgroup label="Indentation">
              <option selected="selected" value="spaces">Spaces</option>
              <option value="tabs">Tabs</option>
            </optgroup>
          </select>

          <select onchange=${onChangeTabWidth} name="tabWidth">
            <optgroup label="Tab width">
              <option selected="selected" value="2">2</option>
              <option value="4">4</option>
              <option value="8">8</option>
            </optgroup>
          </select>
        </span>

        <span class="separator">|</span>

        <span class="editor-options">
          <select onchange=${onChangeLineWrap} name="lineWrap">
            <optgroup label="Line wrap mode">
              <option selected="selected" value="off">No wrap</option>
              <option value="on">Soft wrap</option>
            </optgroup>
          </select>
        </span>

        <div class="actions">
          <button class="action btn small transparent" onclick=${onClickCancelEdit}>
            Cancel
          </button>

          <button class="action btn small success" onclick=${onClickSaveEdit}>
            Save
            <i class="fa fa-check"></i>
          </button>
        </div>
      </div>

      ${renderFileEditor(node)}
    </div>
  `
}

function rChildren (filesBrowser, children, depth = 0) {
  const path = filesBrowser.getCurrentSourcePath()
  const parentNode = (path.length >= 2) ? path[path.length - 2] : filesBrowser.root

  return [
    ((path.length < 1)
      ? ''
      : yo`
        <div class="item ascend" onclick=${e => onClickNode(e, filesBrowser, parentNode)}>
          ..
        </div>`),
    ((children.length === 0 && depth === 0)
      ? yo`<div class="item empty"><em>No files</em></div>`
      : children.map(childNode => rNode(filesBrowser, childNode, depth)))
  ]
}

function rNode (filesBrowser, node, depth) {
  if (node.isContainer) {
    return rContainer(filesBrowser, node, depth)
  } else {
    return rFile(filesBrowser, node, depth)
  }
}

function rContainer (filesBrowser, node, depth) {
  let children = ''

  return [
    yo`<a
      class="item folder"
      title=${node.name}
      href=${node.url}
      onclick=${e => onClickNode(e, filesBrowser, node)}
      oncontextmenu=${e => onContextmenuNode(e, filesBrowser, node)}
    >
      <i class="fa fa-folder"></i>
      <div class="name-container"><div class="name">${node.name}</div></div>
      <div class="updated">${niceMtime(node.mtime)}</div>
      <div class="size">${node.size ? prettyBytes(node.size) : '--'}</div>
    </a>`,
    children
  ]
}

function rFile (filesBrowser, node, depth) {
  return yo`
    <a
      class="item file"
      title=${node.name}
      href=${node.url}
      onclick=${e => onClickNode(e, filesBrowser, node)}
      oncontextmenu=${e => onContextmenuNode(e, filesBrowser, node)}
    >
      <i class="far fa-file"></i>
      <div class="name-container"><div class="name">${node.name}</div></div>
      <div class="updated">${niceMtime(node.mtime)}</div>
      <div class="size">${typeof node.size === 'number' ? prettyBytes(node.size) : '--'}</div>
    </a>
  `
}

// helpers
// =

const today = moment()
function niceMtime (ts) {
  if ((+ts) === 0) return ''
  ts = moment(ts)
  if (ts.isSame(today, 'day')) {
    return 'Today, ' + ts.format('h:mma')
  }
  return ts.format('ll, h:mma')
}

// this method tries to guess how wide the breadcrumbs will be based on character count
// it just needs to be a rough approximation
const BC_SPACER_WIDTH = 21
const BC_CHARACTER_WIDTH = 6
function guessBreadcrumbWidthInPixels (path) {
  var width = path.length * BC_SPACER_WIDTH
  for (let node of path) {
    width += node.name.length * BC_CHARACTER_WIDTH
  }
  return width
}

// event handlers
// =

function onClickNode (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  filesBrowser.setCurrentSource(node)
}

function onClickEditFile (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('custom-open-file-editor')
}

function onClickDeleteFile (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()
  if (confirm('Delete this file?')) {
    filesBrowser.setCurrentSource(node.parent)
    emitDeleteFile(node._path, false)
  }
}

function onClickSaveEdit (e) {
  e.preventDefault()
  e.stopPropagation()
  var fileName = document.querySelector('.editor-filename').value
  if (!DAT_VALID_PATH_REGEX.test(fileName) || fileName.indexOf('/') !== -1) {
    return toast.create('Invalid characters in the file name', 'error')
  }
  emit('custom-save-file-editor-content', {fileName})
  emit('custom-close-file-editor')
}

function onClickDownload (e, currentSource) {
  e.preventDefault()
  beaker.browser.downloadURL(`${currentSource.url}${currentSource.type !== 'file' ? '?download_as=zip' : ''}`)
}

function onClickCancelEdit (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('custom-close-file-editor')
}

function onChangeLineWrap (e) {
  emit('custom-config-file-editor', {lineWrap: e.target.value === 'on'})
}

function onChangeIndentationMode (e) {
  emit('custom-config-file-editor', {indentationMode: e.target.value})
}

function onChangeTabWidth (e) {
  emit('custom-config-file-editor', {tabWidth: e.target.value})
}

function onContextmenuNode (e, filesBrowser, node) {
  e.preventDefault()
  e.stopPropagation()

  var items = [
    {icon: 'fa fa-external-link-alt', label: `Open ${node.isContainer ? 'folder' : 'file'} in new tab`, click: () => window.open(node.url)},
    {
      icon: 'fa fa-link',
      label: 'Copy URL',
      click: () => {
        writeToClipboard(encodeURI(node.url))
        toast.create('URL copied to clipboard')
      }
    }
  ]

  if (node.isEditable) {
    items = items.concat([
      {
        icon: 'fa fa-i-cursor',
        label: 'Rename',
        click: async () => {
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
        }
      },
      {
        icon: 'fa fa-trash',
        label: 'Delete',
        click: () => {
          if (confirm(`Are you sure you want to delete ${node.name}?`)) {
            emitDeleteFile(node._path, node.isContainer)
          }
        }
      }
    ])
  }

  contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    items
  })
}

function emit (name, detail = null) {
  document.body.dispatchEvent(new CustomEvent(name, {detail}))
}

function emitAddFile (src, dst) {
  emit('custom-add-file', {src, dst})
}

function emitRenameFile (path, newName) {
  emit('custom-rename-file', {path, newName})
}

function emitDeleteFile (path, isFolder) {
  emit('custom-delete-file', {path, isFolder})
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

function getNotfoundPathnameFromUrl () {
  return window.location.pathname.split('/').slice(4).join('/')
}