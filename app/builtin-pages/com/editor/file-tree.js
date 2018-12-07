const yo = require('yo-yo')
import * as models from './models'
import _get from 'lodash.get'

// exported api
// =

export default class FileTree {
  constructor (root) {
    this.root = root
    this.currentSource = root
    this.currentSort = ['name', 'desc']
    this.selectedNodes = new Set() // set of nodes
    this.currentDragNode = null
    this.previewMode = false
    this.fileDiffs = []
    this.onSetCurrentSource = () => {} // v simple events solution
  }

  // method to render at a place in the page
  // eg yo`<div>${myFileTree.render()}</div>`
  render () {
    if (!this.root) {
      return yo`<div class="filetree"></div>`
    }

    return yo`
      <div class="explorer-section">
        ${rSection(this, 'fileTree')}
        <div class="fileTree">
          ${rChildren(this, this.getCurrentSource().children)}
        </div>
        ${this.previewMode ? rSection(this, 'diffTree') : ''}
        ${this.previewMode ? yo`
          <div class="diffTree">
            ${rDiffTree(this, this.fileDiffs)}
          </div>`
        : ''}
      </div>
    `
  }

  rerender () {
    let el = document.querySelector('.explorer-section')
    if (el) {
      yo.update(el, this.render())
    }
  }

  // current source api (what drives the nav sidebar)

  isCurrentSource (node) {
    return node === this.currentSource
  }

  getCurrentSource () {
    return this.currentSource
  }

  // helper for breadcrumbs
  // turns the current source into a path of nodes
  getCurrentSourcePath () {
    var path = []
    var node = this.currentSource
    while (node && node !== this.root) {
      path.unshift(node)
      node = node.parent
    }
    return path
  }

  async setCurrentSource (node, {suppressEvent} = {}) {
    this.currentSource = node
    if (!node) {
      this.rerender()
      return
    }

    // special handling for files
    if (node.type === 'file') {
      // emit and render, to allow 'loading...' to show
      if (!suppressEvent) {
        this.onSetCurrentSource(node)
      }
      let to = setTimeout(() => { // only show if it's taking time to load
        node.isLoadingPreview = true
        this.rerender()
      }, 500)
      // then load
      await this.currentSource.readData({maxPreviewLength: 1e5})
      clearTimeout(to)
      // then render again
      node.isLoadingPreview = false
      this.rerender()
    } else {
      // load
      await this.currentSource.readData()
      if (!suppressEvent) {
        this.onSetCurrentSource(node)
      }
      this.resortTree()
      // then render
      this.rerender()
    }
  }

  resortTree () {
    if (this.currentSource) {
      this.currentSource.sort(...this.currentSort)
    }
  }
}

// renderers
// =

function rSection (fileTree, tree) {
  return tree === 'fileTree' ? yo`
    <div class="section-title" id="fileTree" onclick=${() => toggleFileTree('fileTree')}>
      <i class="fa fa-caret-down"></i>
      <span>${_get(fileTree.root, 'name', 'Untitled')}</span>
      <div class="archive-fs-options">
        <i class="fa fa-sync-alt"></i>
        <i class="fa fa-plus-square"></i>
        <i class="fa fa-folder-plus"></i>
      </div>
    </div>
  ` : yo`
    <div class="section-title" id="diffTree" onclick=${() => toggleFileTree('diffTree')}>
      <i class="fa fa-caret-down"></i>
      <span>Preview Changes</span>
      <div class="archive-fs-options">
        <i class="fa fa-sync-alt"></i>
        <i class="fa fa-plus-square"></i>
        <i class="fa fa-folder-plus"></i>
      </div>
    </div>
  `
}

function rChildren (fileTree, children) {
  const path = fileTree.getCurrentSourcePath()
  const parentNode = (path.length >= 2) ? path[path.length - 2] : fileTree.root

  return [
    ((path.length < 1)
      ? ''
      : yo`
        <div class="item ascend" onclick=${e => onClickNode(e, fileTree, parentNode)}>
          ..
        </div>`),
    ((children.length === 0)
      ? yo`<div class="item empty"><em>No files</em></div>`
      : children.map(childNode => rNode(fileTree, childNode)))
  ]
}

function rDiffTree (fileTree, fileDiffs) {
  return fileDiffs.length === 0
    ? yo`<div class="item empty"><em>No Changes</em></div>`
    : fileDiffs.map(diff => rNode(fileTree, diff))
}

function rNode (fileTree, node) {
  if (node.isContainer) {
    return rDirectory(fileTree, node)
  } else {
    return rFile(fileTree, node)
  }
}

function rDirectory (fileTree, node) {
  let children = ''
  let cls = 'right'

  if (node.isExpanded) {
    children = yo`<div class="subtree">${rChildren(fileTree, node.children)}</div>`
    cls = 'down'
  }

  return [
    yo`
    <div>
      <div
        class="item folder"
        title=${node.name}
        onclick=${e => onClickNode(e, fileTree, node)}
        oncontextmenu=${e => onContextmenuNode(e, fileTree, node)}
      >
        <i class="fa fa-caret-${cls}"></i>
        <i class="fa fa-folder"></i>
        <span>${node.name}</span>
      </div>
      ${children}
    </div>`
  ]
}

function rFile (fileTree, node) {
  return yo`
    <div
      class="item file"
      title=${node.name}
      onclick=${e => onClickNode(e, fileTree, node)}
      oncontextmenu=${e => onContextmenuNode(e, fileTree, node)}
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

function toggleFileTree (tree) {
  let fileTree = document.querySelector('.' + tree)
  let icon = document.querySelector('#' + tree + ' i')
  icon.classList.contains('fa-caret-down') ? icon.classList.replace('fa-caret-down', 'fa-caret-right') : icon.classList.replace('fa-caret-right', 'fa-caret-down')
  fileTree.classList.toggle('hidden')
}

async function onClickNode (e, fileTree, node) {
  e.preventDefault()
  e.stopPropagation()

  if (node.isEditable && !node.isContainer) {
    models.setActive(node)
  }

  if (node.change) {
    models.setActiveDiff(node)
  }

  if (node.isContainer) {
    node.isExpanded = !node.isExpanded
    await node.readData()
    fileTree.rerender()
  }
}

function onContextmenuNode (e, fileTree, node) {

}