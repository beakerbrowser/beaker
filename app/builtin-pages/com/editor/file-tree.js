const yo = require('yo-yo')
import * as models from './models'
import _get from 'lodash.get'
import * as contextMenu from '../context-menu'
import * as contextInput from '../context-input'

// globals
// =

var currentSource
var currentSort = ['name', 'desc']
var selectedNodes = new Set() // set of nodes
var currentDragNode = null
var previewMode = false
var fileDiffs = []

// exported api
// =

// method to render at a place in the page
// eg yo`<div>${myFileTree.render()}</div>`
export function render () {
  if (!currentSource) {
    return yo`<div class="filetree"></div>`
  }

  return yo`
    <div class="explorer-section">
      <div class="fileTree">
        ${rChildren(getCurrentSource().children)}
      </div>
      ${previewMode ? rSection('diffTree') : ''}
      ${previewMode ? yo`
        <div class="diffTree">
          ${rDiffTree()}
        </div>`
      : ''}
    </div>
  `
}

export function rerender () {
  let el = document.querySelector('.explorer-section')
  if (el) {
    yo.update(el, render())
  }
}

// current source api (what drives the nav sidebar)
export function isCurrentSource (node) {
  return node === currentSource
}

export function getCurrentSource () {
  return currentSource
}

// helper for breadcrumbs
// turns the current source into a path of nodes
export function getCurrentSourcePath () {
  var path = []
  var node = currentSource
  while (node && node !== currentSource) {
    path.unshift(node)
    node = node.parent
  }
  return path
}

export function setPreviewMode (value) {
  previewMode = value
}

export function getFileDiffs () {
  return fileDiffs
}

export function setFileDiffs (diffs) {
  fileDiffs = diffs
}

export async function setCurrentSource (node, {suppressEvent} = {}) {
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

// renderers
// =

function rSection (tree) {
  return tree === 'fileTree' ? yo`
    <div class="section-title" id="fileTree" onclick=${() => toggleFileTree('fileTree')}>
      <i class="fa fa-caret-down"></i>
      <span>${_get(currentSource, 'name', 'Untitled')}</span>
      <div class="archive-fs-options">
        <i class="fa fa-sync-alt" onclick=${(e) => syncFileTree(e)}></i>
        <i class="fa fa-plus-square"></i>
        <i class="fa fa-folder-plus"></i>
      </div>
    </div>
  ` : yo`
    <div class="section-title" id="diffTree" onclick=${() => toggleFileTree('diffTree')}>
      <i class="fa fa-caret-down"></i>
      <span>Preview Changes</span>
      <div class="archive-fs-options">
        <i class="fa fa-plus-square"></i>
        <i class="fa fa-folder-plus"></i>
      </div>
    </div>
  `
}

function rChildren (children) {
  const path = getCurrentSourcePath()
  const parentNode = (path.length >= 2) ? path[path.length - 2] : currentSource

  return [
    ((path.length < 1)
      ? ''
      : yo`
        <div class="item ascend" onclick=${e => onClickNode(e, parentNode)}>
          ..
        </div>`),
    ((children.length === 0)
      ? yo`<div class="item empty"><em>No files</em></div>`
      : children.map(childNode => rNode(childNode)))
  ]
}

function rDiffTree () {
  return fileDiffs.length === 0
    ? yo`<div class="item empty"><em>No Changes</em></div>`
    : fileDiffs.map(diff => rNode(diff))
}

function rNode (node) {
  if (node.isContainer) {
    return rDirectory(node)
  } else {
    return rFile(node)
  }
}

function rDirectory (node) {
  let children = ''
  let cls = 'right'

  if (node.isExpanded && !node.isDiff) {
    children = yo`<div class="subtree">${rChildren(node.children)}</div>`
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
        <i class="fa fa-fw fa-caret-${cls}" style="flex-basis: 0;"></i>
        <i class="fa fa-fw fa-folder"></i>
        <span>${node.name}</span>
      </div>
      ${children}
    </div>`
  ]
}

function rFile (node) {
  return yo`
    <div
      class="item file"
      title=${node.name}
      onclick=${e => onClickNode(e, node)}
      oncontextmenu=${e => onContextmenuNode(e, node)}
    >
      ${getIcon(node.name)}
      <span>${node.name}</span>
      <span id="diff-path-listing">${node.isDiff ? node._path : ''}</span>
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
  document.body.dispatchEvent(new CustomEvent(name, {detail}))
}

function emitRenameFile (path, newName) {
  emit('custom-rename-file', {path, newName})
}

function emitDeleteFile (path, isFolder) {
  emit('custom-delete-file', {path, isFolder})
}

function toggleFileTree (tree) {
  let fileTree = document.querySelector('.' + tree)
  let icon = document.querySelector('#' + tree + ' i')
  icon.classList.contains('fa-caret-down') ? icon.classList.replace('fa-caret-down', 'fa-caret-right') : icon.classList.replace('fa-caret-right', 'fa-caret-down')
  fileTree.classList.toggle('hidden')
}

async function onClickNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  if (node.isContainer) {
    node.isExpanded = !node.isExpanded
    await node.readData({ignoreCache: true})
  } else {
    if (node.isDiff) {
      models.setActiveDiff(node)
    } else {
      models.setActive(node)
    }
  }

  rerender()
}

function onContextmenuNode (e, node) {
  e.preventDefault()
  e.stopPropagation()

  if (node.isDiff) return

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
