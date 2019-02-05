import yo from 'yo-yo'
import * as models from './models'
import _get from 'lodash.get'
import {FSArchiveFolder_BeingCreated, FSArchiveFile_BeingCreated} from 'beaker-virtual-fs'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import renderArchiveHistory from '../archive/archive-history'
import toggleable2, {closeAllToggleables}  from '../toggleable2'
import renderFaviconPicker from '../settings/favicon-picker'
import {findParent} from '../../../lib/fg/event-handlers'
import {pluralize} from '../../../lib/strings'

// globals
// =

var archiveFsRoot
var currentDiff
var config = {
  version: 'latest',
  previewMode: false
}

// exported api
// =

export function render () {
  if (!archiveFsRoot) {
    return ''
  }

  return yo`
    <div class="file-tree-container">
      <div class="site-info">
        ${renderFavicon()}
        ${renderSiteTitle()}
      </div>
      <div class="file-tree-header">
        ${renderVersionPicker()}
      </div>
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
  await reloadTree()
  render()
}

export async function reloadTree () {
  try {
    await archiveFsRoot.readData({ignoreCache: true})
  } catch (e) {
    console.warn('Failed to read filetree', e)
  }
  archiveFsRoot.sort('name', 'desc')
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

function renderFavicon () {
  const isOwner = archiveFsRoot.isEditable
  const url = `beaker-favicon:16,${archiveFsRoot.url}?cache=${Date.now()}`
  const onSelectFavicon = imageData => emit('editor-set-favicon', {imageData})

  if (!isOwner) {
    return yo`<img class="favicon" src="${url}">`
  }

  return toggleable2({
    id: 'favicon-picker',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn transparent nofocus toggleable"><img class="favicon" src=${url} onclick=${onToggle} /></button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn transparent nofocus toggleable"><img class="favicon" src=${url} onclick=${onToggle} /></button>
        <div class="dropdown-items subtle-shadow left" onclick=${onToggle}>
          ${renderFaviconPicker({onSelect: onSelectFavicon, currentFaviconUrl: url})}
        </div>
      </div>`
  })
}

function renderSiteTitle () {
  const isOwner = archiveFsRoot.isEditable
  const {title, description} = archiveFsRoot._archiveInfo

  if (!isOwner) {
    return yo`<div>${archiveFsRoot.name}</div>`
  }

  return toggleable2({
    id: 'site-info-editor',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn site-info-btn transparent nofocus toggleable" onclick=${onToggle}>${archiveFsRoot.name}</button>
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown toggleable-container">
        <button class="btn site-info-btn transparent nofocus toggleable" onclick=${onToggle}>${archiveFsRoot.name}</button>
        <div class="dropdown-items subtle-shadow left">
          <form class="site-info-form" onsubmit=${onSubmitSiteInfo}>
            <input type="text" name="title" placeholder="Title" value=${title} autofocus>
            <input type="text" name="description" placeholder="Description" value=${description}>
            <div><button class="btn">Save</button></div>
          </form>
        </div>
      </div>`
  })
}

function renderVersionPicker () {
  const version = config.version
  const includePreview = config.previewMode

  const button = (onToggle) =>
    yo`
      <button
        class="btn nofocus"
        onclick=${onToggle}>
        <div>
          Version: ${version}
        </div>
        <span class="fa fa-angle-down"></span>
      </button>
    `

  return toggleable2({
    id: 'version-picker',
    closed: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker-ctrl">
        ${button(onToggle)}
      </div>`,
    open: ({onToggle}) => yo`
      <div class="dropdown toggleable-container version-picker-ctrl">
        ${button(onToggle)}
        <div class="dropdown-items left">
          ${renderArchiveHistory(archiveFsRoot._archive, {viewerUrl: 'beaker://editor', includePreview})}
        </div>
      </div>`
  })
}

function renderReviewChanges () {
  if (!currentDiff || currentDiff.length === 0) return ''

  function rRevisionIndicator (type) {
    if (!currentDiff.find(d => d.change === type)) return ''
    return yo`<span class="revision-indicator ${type}"></span>`
  }
  
  const total = currentDiff.length
  return yo`
    <div class="uncommitted-changes">
      <div class="title">
        ${rRevisionIndicator('add')}
        ${rRevisionIndicator('mod')}
        ${rRevisionIndicator('del')}
        ${total} uncommitted ${pluralize(total, 'change')}
      </div>
      <button class="btn transparent nofocus full-width" onclick=${onClickCommitAll}>
        <span class="fas fa-check fa-fw"></span> Commit all
      </button>
      <button class="btn transparent nofocus full-width" onclick=${onClickRevertAll}>
        <span class="fas fa-undo fa-fw"></span> Revert all
      </button>
    </div>`
}

function renderContainerCtrls (node) {
  return yo`
    <span class="container-ctrls">
      ${toggleable2({
        id: 'file-tree-new-node',
        closed: ({onToggle}) => yo`
          <div class="dropdown new-node toggleable-container">
            <button class="nofocus" onclick=${onToggle}>
              <i class="fas fa-plus"></i>
            </button>
          </div>`,
        open: ({onToggle}) => yo`
          <div class="dropdown new-node toggleable-container">
            <button class="nofocus" onclick=${onToggle}>
              <i class="fas fa-plus"></i>
            </button>
    
            <div class="dropdown-items center with-triangle subtle-shadow">
              <div class="dropdown-item no-border no-hover">
                <div class="label">
                  New file or folder
                </div>
            
                <p><input type="text" placeholder="Enter the full path" /></p>

                <p>
                  <a target="_blank" class="btn primary" onclick=${e => onClickNew(e, node, 'file')}>
                    <i class="fas fa-file"></i> Create file
                  </a>
                  <a target="_blank" class="btn primary" onclick=${e => onClickNew(e, node, 'folder')}>
                  <i class="fas fa-folder"></i> Create folder
                  </a>
                </p>
              </div>
            </div>
          </div>`,
        afterOpen (el) {
          el.querySelector('input').focus()
        }
      })}
    </span>`
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
        oncontextmenu=${e => onContextmenuNode(e, node)}
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
  return yo`
    <div
      class="item file"
      title=${node.name}
      onclick=${e => onClickNode(e, node)}
      oncontextmenu=${e => onContextmenuNode(e, node)}
    >
      ${getIcon(node.name)}
      <span class="name">${node.name}</span>
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

function getIcon (name) {
  let extention = name.split('.').pop()
  switch (extention) {
    case 'json':
    case 'js':
      return yo`<i class="fab fa-fw fa-js"></i>`
    case 'html':
      return yo`<i class="fab fa-fw fa-html5"></i>`
    case 'md':
      return yo`<i class="fab fa-fw fa-markdown"></i>`
    case 'gitignore':
      return yo`<i class="fab fa-fw fa-git"></i>`
    case 'css':
      return yo`<i class="fab fa-fw fa-css3"></i>`
    case 'less':
      return yo`<i class="fab fa-fw fa-less"></i>`
    case 'scss':
    case 'sass':
      return yo`<i class="fab fa-fw fa-sass"></i>`
    case 'svg':
    case 'png':
    case 'jpg':
    case 'gif':
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
    node.isExpanded = !node.isExpanded
    await node.readData({ignoreCache: true})
  } else {
    models.setActive(node)
  }

  rerender()
}

function onClickDeletedFilediff (e, filediff) {
  e.preventDefault()
  e.stopPropagation()

  models.setActiveDeletedFilediff(filediff)
}

async function onClickNew (e, node, type) {
  e.preventDefault()
  e.stopPropagation()

  // get the name
  var newName = findParent(e.currentTarget, 'dropdown-item').querySelector('input').value.trim()
  if (newName.startsWith('/')) newName = newName.slice(1)
  if (!newName) return // do nothing

  let path = node._path + '/' + newName
  emit(`editor-create-${type}`, {path})
  closeAllToggleables()
}

function onContextmenuNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  var items = []

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

function onClickCommitAll (e) {
  e.preventDefault()
  e.stopPropagation()

  if (!confirm('Commit all changes?')) return
  emit('editor-commit-all')
}

function onClickRevertAll (e) {
  e.preventDefault()
  e.stopPropagation()

  if (!confirm('Revert all changes?')) return
  emit('editor-revert-all')
}

function onKeydownNewNode (e, node) {
  if (e.key === 'Escape') cancelNewNode(node)
  if (e.key === 'Enter') {
    emit('editor-create-' + node.type, {path: node.getPathForName(e.currentTarget.value)})
  }
}

function onSubmitSiteInfo (e) {
  e.preventDefault()
  e.stopPropagation()

  closeAllToggleables()
  emit('editor-set-site-info', {
    title: e.currentTarget.title.value,
    description: e.currentTarget.description.value
  })
}

// internal helpers
// =

function cancelNewNode (node) {
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