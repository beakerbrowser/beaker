/* globals beaker confirm CustomEvent */

import yo from 'yo-yo'
import moment from 'moment'
import prettyBytes from 'pretty-bytes'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import * as toast from '../toast'
import toggleable2 from '../toggleable2'
import renderArchiveHistory from '../archive-history'
import {DAT_VALID_PATH_REGEX} from '@beaker/core/lib/const'
import {writeToClipboard} from '../../../lib/fg/event-handlers'
import renderFilePreview from '../file-preview'
import {render as renderFileEditor} from '../file-editor'
import {pluralize} from '../../../lib/strings'

// exported api
// =

export default function render (filesBrowser, currentSource) {
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

function rMetadata (filesBrowser, node) {
  if (filesBrowser.isEditMode) {
    return ''
  }

  var numLines
  var isTextual = typeof node.preview === 'string' // preview is only set for text items

  if (node.preview) {
    numLines = node.preview.split('\n').length
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

function rVersionPicker (filesBrowser) {
  return toggleable2({
    id: 'version-picker',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker">
        <button class="btn transparent nofocus tooltip-container" onclick=${onToggle} data-tooltip="View history">
          <span class="fa fa-history"></span>
        </button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker">
        <button class="btn transparent nofocus" onclick=${onToggle}>
          <span class="fa fa-history"></span>
        </button>

        <div class="dropdown-items right">
          ${renderArchiveHistory(filesBrowser.root._archive)}
        </div>
      </div>`
  })
}

function rActions (filesBrowser, currentSource) {
  var isTextual = typeof currentSource.preview === 'string' // preview is only set for text items
  var isEditing = filesBrowser.isEditMode
  var buttonGroup = []

  if (currentSource.isEditable && !isEditing && currentSource.type === 'file') {
    buttonGroup.push(
      yo`
        <button class="action btn trash nofocus tooltip-container delete" data-tooltip="Delete file" onclick=${e => onClickDeleteFile(e, filesBrowser, currentSource)}>
          <i class="fa fa-trash-o"></i>
        </button>`
    )

    if (isTextual) {
      buttonGroup.push(
        yo`
          <button class="action btn nofocus tooltip-container" data-tooltip="Edit file" onclick=${onClickEditFile}>
            <i class="fa fa-pencil"></i>
          </button>`
      )
    }
  }

  return yo`
    <div class="actions">
      ${currentSource.type === 'archive' ? rVersionPicker(filesBrowser) : ''}
      ${(currentSource.type !== 'file')
        ?
          toggleable2({
            id: 'folder-actions-dropdown',
            closed: ({onToggle}) => yo`
              <div class="dropdown toggleable-container new-dropdown">
                <button class="btn transparent toggleable tooltip-container" onclick=${onToggle} data-tooltip="More actions">
                  <span class="fa fa-angle-down"></span>
                </button>
              </div>`,
            open: ({onToggle}) => yo`
              <div class="dropdown toggleable-container new-dropdown">
                <button class="btn transparent toggleable tooltip-container" onclick=${onToggle} data-tooltip="More actions">
                  <span class="fa fa-angle-down"></span>
                </button>

                <div class="dropdown-items compact right" onclick=${onToggle}>
                  <div class="section-header light">
                    ${currentSource.name}
                  </div>

                  ${currentSource.isEditable
                    ? [
                      yo`<div class="dropdown-item" onclick=${e => emit('custom-create-file')}>
                        Create file
                      </div>`,

                      yo`<div class="dropdown-item" onclick=${e => emit('custom-create-file', {createFolder: true})}>
                        Create folder
                      </div>`,

                      yo`<hr>`,

                      (window.OS_CAN_IMPORT_FOLDERS_AND_FILES
                        ? yo`
                          <div class="dropdown-item" onclick=${e => onAddFiles(e, currentSource, false)}>
                            Import files
                          </div>`
                        :
                          [
                            yo`
                              <div class="dropdown-item" onclick=${e => onAddFiles(e, currentSource, true)}>
                                <i class="fa fa-files-o"></i>
                                Import files
                              </div>`,
                            yo`
                              <div class="dropdown-item" onclick=${e => onAddFolder(e, currentSource)}>
                                <i class="fa fa-folder-open-o"></i>
                                Import folder
                              </div>`
                          ]
                      ),

                      yo`<hr>`
                    ] : ''}

                    <div class="dropdown-item" onclick=${e => onClickDownloadZip(e, filesBrowser)}>
                      Download as .zip
                    </div>
                </div>
              </div>`
            })
        : ''
      }

      ${!isEditing && currentSource.type === 'file'
        ? yo`
          <a  class="action btn plain tooltip-container" href=${currentSource.url} target="_blank" data-tooltip="Open file">
            <i class="fa fa-external-link"></i>
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
  return yo`
    <div class="breadcrumbs">
      <div class="breadcrumb root" onclick=${e => onClickNode(e, filesBrowser, filesBrowser.root)}>
        .
      </div>

      ${path.map((node, i) => rBreadcrumb(filesBrowser, node, (i === path.length - 1)))}
    </div>`
}

function rBreadcrumb (filesBrowser, node, isLast = false) {
  if (!node) return ''
  var isEditing = filesBrowser.isEditMode && isLast
  if (isEditing) {
    return yo`
      <div class="breadcrumb">
        <input type="text" class="editor-filename" value=${node.name} />
      </div>`
  }
  return yo`
    <div class="breadcrumb" onclick=${e => onClickNode(e, filesBrowser, node)} title=${node.name}>
      ${node.name}
    </div>`
}

function rFilePreview (filesBrowser, node) {
  var numLines
  var isTextual = typeof node.preview === 'string' // preview is only set for text items

  if (node.preview) {
    numLines = node.preview.split('\n').length
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
    yo`<div
      class="item folder"
      title=${node.name}
      onclick=${e => onClickNode(e, filesBrowser, node)}
      oncontextmenu=${e => onContextmenuNode(e, filesBrowser, node)}
    >
      <i class="fa fa-folder"></i>
      <div class="name-container"><div class="name">${node.name}</div></div>
      <div class="updated">${niceMtime(node.mtime)}</div>
      <div class="size">${node.size ? prettyBytes(node.size) : '--'}</div>
    </div>`,
    children
  ]
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
      <div class="updated">${niceMtime(node.mtime)}</div>
      <div class="size">${typeof node.size === 'number' ? prettyBytes(node.size) : '--'}</div>
    </div>
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

function onClickDownloadZip (e, filesBrowser) {
  e.preventDefault()
  beaker.browser.downloadURL(`${filesBrowser.root.url}?download_as=zip`)
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
    {icon: 'external-link', label: `Open ${node.isContainer ? 'folder' : 'file'} in new tab`, click: () => window.open(node.url)},
    {icon: 'link', label: 'Copy URL', click: () => {
      writeToClipboard(encodeURI(node.url))
      toast.create('URL copied to clipboard')
    }}
  ]

  if (node.isEditable) {
    items = items.concat([
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
