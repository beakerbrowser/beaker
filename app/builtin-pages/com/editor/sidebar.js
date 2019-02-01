const yo = require('yo-yo')
import * as models from './models'
import _get from 'lodash.get'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'
import toggleable2, {closeAllToggleables}  from '../toggleable2'
import {findParent} from '../../../lib/fg/event-handlers'

// globals
// =

var currentSource
var currentSort = ['name', 'desc']

// exported api
// =

export function render () {
  if (!currentSource) {
    return ''
  }

  return yo`
    <div class="file-tree-container">
      ${renderRoot(currentSource)}
    </div>
  `
}

export function rerender () {
  let el = document.querySelector('.file-tree-container')
  if (el) {
    yo.update(el, render())
  }
}

export async function setCurrentSource (node) {
  currentSource = node
  if (!node) {
    rerender()
    return
  }

  // special handling for files
  if (node.type === 'file') {
    let to = setTimeout(() => { // only show if it's taking time to load
      node.isLoadingPreview = true
      rerender()
    }, 500)
    // then load
    await currentSource.readData({maxPreviewLength: 1e5, ignoreCache: true})
    clearTimeout(to)
    // then render again
    node.isLoadingPreview = false
    rerender()
  } else {
    // load
    await currentSource.readData({ignoreCache: true})
    resortTree()
    // then render
    rerender()
  }
}

export function resortTree () {
  if (currentSource) {
    currentSource.sort(...currentSort)
  }
}

// rendering
// =


function renderChildren (children) {
  return children.map(childNode => renderNode(childNode))
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
          <button><i class="fas fa-wrench"></i></button>
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
      ${renderChildren(node.children)}
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
        ${renderChildren(node.children)}
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

function emitRenameFile (path, newName) {
  emit('editor-rename-file', {path, newName})
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
