const yo = require('yo-yo')
import * as models from './models'
import _get from 'lodash.get'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import renderArchiveHistory from '../archive/archive-history'
import toggleable2, {closeAllToggleables}  from '../toggleable2'
import {findParent} from '../../../lib/fg/event-handlers'

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
      ${renderVersionPicker()}
      ${renderRoot(archiveFsRoot)}
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
  await archiveFsRoot.readData({ignoreCache: true})
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

function renderVersionPicker () {
  const version = config.version
  const includePreview = config.previewMode

  const button = (onToggle) =>
    yo`
      <button
        class="btn transparent full-width nofocus"
        onclick=${onToggle}>
        <div>
          Version: <strong>${version}</strong>
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

function renderRoot (node) {
  return yo`
    <div class="file-tree">
      <div
        class="item root"
        title=${node.name}
      >
        <span class="name">${node.name}</span>
        <span class="ctrls">
          <button class="nofocus" onclick=${onClickConfigure}><i class="fas fa-wrench"></i></button>
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
        </span>
      </div>
      ${renderChildren(node)}
    </div>`
}

function renderNode (node) {
  if (node.isContainer) {
    return renderDirectory(node)
  } else {
    return renderFile(node)
  }
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
        <i class="fa fa-fw fa-caret-${cls}" style="margin-right: 3px;"></i>
        <i class="fa fa-fw fa-folder"></i>
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

function onClickConfigure (e) {
  e.preventDefault()
  e.stopPropagation()
  // TEMP
  // just open the library-view configure
  // someday this should be a nice popup interface
  // -prf
  window.open(`beaker://library/${archiveFsRoot.url}#settings`)
}

// internal helpers

function isPathInFolder (folderPath, filePath) {
  // a subpath of the folder?
  if (!filePath.startsWith(folderPath)) return false
  if (filePath.charAt(folderPath.length) !== '/') return false
  // an immediate child?
  var fileName = filePath.slice(folderPath.length + 1)
  if (fileName.indexOf('/') !== -1) return false
  return true
}