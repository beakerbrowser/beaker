const yo = require('yo-yo')
import * as models from './models'
import _get from 'lodash.get'

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
      ${rSection('fileTree')}
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

export function setFileDiffs (diff) {
  fileDiffs.push(diff)
}

export function clearFileDiffs () {
  fileDiffs = []
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

  if (node.isExpanded) {
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
        <i class="fa fa-caret-${cls}"></i>
        <i class="fa fa-folder"></i>
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
      <span>${node.change ? node.name.replace(' (Working Checkout)', '') : node.name}</span>
    </div>
  `
}

function getIcon (name) {
  let extention = name.split('.').pop()
  switch (extention) {
    case 'json':
    case 'js':
      return yo`<i class="fab fa-js"></i>`
    case 'html':
      return yo`<i class="fab fa-html5"></i>`
    case 'md':
      return yo`<i class="fab fa-markdown"></i>`
    case 'gitignore':
      return yo`<i class="fab fa-git"></i>`
    case 'lock':
      return yo`<i class="fas fa-unlock-alt"></i>`
    case 'css':
      return yo`<i class="fab fa-css3-alt"></i>`
    case 'less':
      return yo`<i class="fab fa-less"></i>`
    case 'scss':
    case 'sass':
      return yo`<i class="fab fa-sass"></i>`
    case 'svg':
    case 'png':
    case 'jpg':
      return yo`<i class="far fa-image"></i>`
    case 'eot':
    case 'ttf':
    case 'woff2':
    case 'woff':
      return yo`<i class="fas fa-font"></i>`
    default:
      return yo`<i class="fas fa-code"></i>`
  }
}

// event handlers
// =

function  syncFileTree (e) {
  e.stopPropagation()
  e.preventDefault()

  getCurrentSource()

  rerender()
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

  if (node.isEditable && !node.isContainer) {
    models.setActive(node)
  }

  if (node.change) {
    models.setActiveDiff(node)
  }

  if (node.isContaziner) {
    node.isExpanded = !node.isExpanded
  }

  await node.readData({ignoreCache: true})
  rerender()
}

function onContextmenuNode (e, node) {

}
