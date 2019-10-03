import yo from 'yo-yo'
import * as models from './models'
import _get from 'lodash.get'
import {FSArchiveFolder_BeingCreated, FSArchiveFile_BeingCreated} from 'beaker-virtual-fs'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import {findParent, writeToClipboard} from '../../../lib/event-handlers'
import {pluralize} from '../../../../lib/strings'

// globals
// =

var archiveFsRoot
var currentDiff
var config = {
  workingDatJson: {},
  isReadonly: false
}

// exported api
// =

export function render () {
  if (!archiveFsRoot) {
    return ''
  }
  var archiveInfo = archiveFsRoot._archiveInfo
  var title = archiveInfo.isOwner ? config.workingDatJson.title : archiveInfo.title
  return yo`
    <div class="file-tree-container" oncontextmenu=${onContextmenu}>
      <div class="title">
        <button class="btn transparent nofocus" onclick=${onOpenHome}>${title || 'Untitled'}</button>
      </div>
      ${config.isReadonly ? yo`
        <div class="file-controls">
          <span class="label">Readonly</span>
        </div>
      ` : yo`
        <div class="file-controls">
          <button class="btn transparent" onclick=${e => emit('editor-new-file', {path: '/'})}><span class="far fa-fw fa-file"></span></button>
          <button class="btn transparent" onclick=${e => emit('editor-new-folder', {path: '/'})}><span class="far fa-fw fa-folder"></span></button>
          <button class="btn transparent" onclick=${e => emit('editor-import-files', {path: '/'})}><span class="fas fa-fw fa-upload"></span></button>
        </div>
      `}
      <div class="file-tree">
        ${renderChildren(archiveFsRoot)}
      </div>
      ${renderReviewChanges()}
    </div>
  `
}

export function rerender () {
  let el = document.querySelector('.file-tree-container')
  if (el) {
    yo.update(el, render())
  }
}

export async function setArchiveFsRoot (node) {
  archiveFsRoot = node
  render()
}

export function setCurrentDiff (d) {
  currentDiff = d
}

export function configure (c) {
  for (let k in c) {
    config[k] = c[k]
  }
}

// rendering
// =

function renderReviewChanges () {
  if (!currentDiff || currentDiff.length === 0) return ''

  function rRevisionIndicator (type) {
    if (!currentDiff.find(d => d.change === type)) return ''
    return yo`<span class="revision-indicator ${type}"></span>`
  }

  const total = currentDiff.length
  return yo`
    <a class="btn transparent nofocus uncommitted-changes" onclick=${onOpenHome}>
      ${rRevisionIndicator('add')}
      ${rRevisionIndicator('mod')}
      ${rRevisionIndicator('del')}
      ${total} uncommitted ${pluralize(total, 'change')}
    </a>`
}

function renderChildren (node) {
  // render actual children
  var els = node.children.map(renderNode)

  // add any deletes in this folder
  if (currentDiff) {
    for (let d of currentDiff) {
      if (d.change !== 'del') continue
      if (isPathInFolder(node._path, d.path)) {
        els.push(renderDeletedNode(d))
      }
    }
  }

  return els
}

function renderNode (node) {
  if (node instanceof FSArchiveFolder_BeingCreated) {
    return renderNewDirectory(node)
  } else if (node instanceof FSArchiveFile_BeingCreated) {
    return renderNewFile(node)
  } else if (node.isContainer) {
    return renderDirectory(node)
  } else {
    return renderFile(node)
  }
}

function renderNewDirectory (node) {
  return yo`
    <div class="new-node new-folder">
      <input type="text" placeholder="New folder name" onkeydown=${e => onKeydownNewNode(e, node)} onblur=${e => cancelNewNode(node)}>
    </div>`
}

function renderNewFile (node) {
  return yo`
    <div class="new-node new-file">
      <input type="text" placeholder="New file name" onkeydown=${e => onKeydownNewNode(e, node)} onblur=${e => cancelNewNode(node)}>
    </div>`
}

function renderDirectory (node) {
  let children = ''
  let cls = 'right'

  if (node.isExpanded) {
    children = yo`
      <div class="subtree">
        ${renderChildren(node)}
      </div>`
    cls = 'down'
  }

  return [
    yo`
    <div>
      <div
        class="item folder"
        title=${node.name}
        onclick=${e => onClickNode(e, node)}
        oncontextmenu=${e => onContextmenu(e, node)}
      >
        <i class="fa fa-fw fa-caret-${cls}"></i>
        <span class="name">${node.name}</span>
        ${node.change ? yo`<div class="revision-indicator ${node.change}"></div>` : ''}
      </div>
      ${children}
    </div>`
  ]
}

function renderFile (node) {
  var model = models.findModel(node)
  var isDirty = model && model.isDirty
  return yo`
    <div
      class="item file ${isNodeSelected(node) ? 'selected' : ''}"
      title=${node.name}
      onclick=${e => onClickNode(e, node)}
      oncontextmenu=${e => onContextmenu(e, node)}
    >
      ${getIcon(node.name)}
      <span class="name">${node.name}${isDirty ? '*' : ''}</span>
      ${node.change ? yo`<div class="revision-indicator ${node.change}"></div>` : ''}
    </div>
  `
}

function renderDeletedNode (filediff) {
  var name = filediff.path.split('/').pop()
  return yo`
    <div
      class="item deleted file"
      title=${name}
      onclick=${e => onClickDeletedFilediff(e, filediff)}
    >
      ${getIcon(name)}
      <span class="name">${name}</span>
      <div class="revision-indicator del"></div>
    </div>
  `
}

function isNodeSelected (node) {
  const active = models.getActive()
  const activePath = active ? active.uri.path : false
  return node._path === activePath
}

function getIcon (name) {
  let extention = name.split('.').pop()
  switch (extention) {
    case 'svg':
    case 'png':
    case 'jpg':
    case 'gif':
    case 'ico':
      return yo`<i class="far fa-fw fa-image"></i>`
    case 'eot':
    case 'ttf':
    case 'woff2':
    case 'woff':
      return yo`<i class="fas fa-fw fa-font"></i>`
    default:
      return yo`<i class="far fa-fw fa-file"></i>`
  }
}

// event handlers
// =

function emit (name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, {detail}))
}

function emitRenameFile (oldPath, newName) {
  var newPath = oldPath.split('/').slice(0, -1).concat(newName).join('/')
  emit('editor-rename-file', {oldPath, newPath})
}

function emitDeleteFile (path, isFolder) {
  emit('editor-delete-file', {path, isFolder})
}

async function onClickNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  if (node.isContainer) {
    emit('editor-toggle-container-expanded', {path: node._path})
  } else {
    emit('editor-set-active', {path: node._path})
  }

  rerender()
}

function onClickDeletedFilediff (e, filediff) {
  e.preventDefault()
  e.stopPropagation()

  models.setActiveDeletedFilediff(filediff)
}

function onOpenHome (e) {
  e.preventDefault()
  e.stopPropagation()
  emit('editor-show-home')
}

async function onContextmenu (e, node) {
  e.preventDefault()
  e.stopPropagation()

  // highlight the parent node
  var parentEl = findParent(e.currentTarget, 'item')
  if (parentEl) parentEl.classList.add('highlighted')

  const isSite = !node
  node = node || archiveFsRoot
  const nodeType = isSite ? 'site' : node.type

  var items = []
  if (!node.isContainer) {
    items = items.concat([
      {
        icon: 'fas fa-fw fa-external-link-alt',
        label: `Open ${nodeType}`,
        click () {
          window.open(node.url)
        }
      },
      {
        icon: 'fas fa-fw fa-link',
        label: `Copy URL`,
        click () {
          writeToClipboard(node.url)
        }
      }
    ])
  }
  if (!config.isReadonly) {
    if (node.isContainer) {
      items = items.concat([
        {
          icon: 'far fa-fw fa-file',
          label: 'New file',
          click () {
            emit('editor-new-file', {path: node._path})
          }
        },
        {
          icon: 'far fa-fw fa-folder',
          label: 'New folder',
          click () {
            emit('editor-new-folder', {path: node._path})
          }
        }
      ])
      if (window.OS_CAN_IMPORT_FOLDERS_AND_FILES) {
        items = items.concat([
          {
            icon: 'fas fa-fw fa-upload',
            label: 'Import...',
            click () {
              emit('editor-import-files', {path: node._path})
            }
          }
        ])
      } else {
        items = items.concat([
          {
            icon: 'fas fa-fw fa-upload',
            label: 'Import files...',
            click () {
              emit('editor-import-files', {path: node._path})
            }
          },
          {
            icon: 'fas fa-fw fa-upload',
            label: 'Import folder...',
            click () {
              emit('editor-import-folder', {path: node._path})
            }
          }
        ])
      }
    }
    if (!isSite) {
      items = items.concat([
        {
          icon: 'fa fa-fw fa-i-cursor',
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
          icon: 'fa fa-fw fa-trash',
          label: 'Delete',
          click: () => {
            if (confirm(`Are you sure you want to delete ${node.name}?`)) {
              emitDeleteFile(node._path, node.isContainer)
            }
          }
        }
      ])
    }
  }

  await contextMenu.create({
    x: e.clientX,
    y: e.clientY,
    items
  })
  if (parentEl) parentEl.classList.remove('highlighted')
}

function onKeydownNewNode (e, node) {
  if (e.key === 'Escape') cancelNewNode(node)
  if (e.key === 'Enter') {
    var value = e.currentTarget.value
    cancelNewNode(node)
    emit('editor-create-' + node.type, {path: node.getPathForName(value)})
  }
}

// internal helpers
// =

function cancelNewNode (node) {
  if (node.isCanceled) return
  node.isCanceled = true

  // remove the new node
  node.parent._files = node.parent._files.filter(f => f !== node)
  rerender()
}

function isPathInFolder (folderPath, filePath) {
  // a subpath of the folder?
  if (!filePath.startsWith(folderPath)) return false
  if (filePath.charAt(folderPath.length) !== '/') return false
  // an immediate child?
  var fileName = filePath.slice(folderPath.length + 1)
  if (fileName.indexOf('/') !== -1) return false
  return true
}