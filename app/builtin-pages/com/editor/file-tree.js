const yo = require('yo-yo')
import * as models from './models'

// exported api
// =

export default class FileTree {
  constructor (root) {
    this.root = root
    this.currentSource = root
    this.currentSort = ['name', 'desc']
    this.selectedNodes = new Set() // set of nodes
    this.currentDragNode = null
    this.onSetCurrentSource = () => {} // v simple events solution
  }

  // method to render at a place in the page
  // eg yo`<div>${myFileTree.render()}</div>`
  render () {
    if (!this.root) {
      return yo`<div class="filetree"></div>`
    }

    return yo`
      <div class="filetree">
        ${rChildren(this, this.getCurrentSource().children)}
      </div>
    `
  }

  rerender () {
    let el = document.querySelector('.filetree')
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

function rChildren (fileTree, children) {
  const path = fileTree.getCurrentSourcePath()
  const parentNode = (path.length >= 2) ? path[path.length - 2] : fileTree.root

  return [
    ((path.length < 1)
      ? ''
      : yo`
        <div class="item ascend" onclick=${e => onClickNode(e, parentNode)}>
          ..
        </div>`),
    ((children.length === 0)
      ? yo`<div class="item empty"><em>No files</em></div>`
      : children.map(childNode => rNode(fileTree, childNode)))
  ]
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
      <span>${node.name}</span>
    </div>
  `
}

function getIcon (name) {
  let extention = name.split('.').pop()
  switch (extention) {
    case 'js':
      return yo`<i class="mf js-icon"></i>`
    case 'json':
      return yo`<i class="fi jsonld-icon"></i>`
    case 'html':
      return yo`<i class="fa fa-html5"></i>`
    case 'eslintrc':
      return yo`<i class="fi eslint-icon"></i>`
    case 'gitignore':
      return yo`<i class="devicons git-icon"></i>`
    case 'sh':
      return yo`<i class="fi powershell-icon"></i>`
    case 'lock':
      return yo`<i class="fa lock-icon"></i>`
    case 'md':
      return yo`<i class="octicons markdown-icon"></i>`
    default:
      return yo`<i class="fa fa-file"></i>`
  }
}

// event handlers
// =

async function onClickNode (e, fileTree, node) {
  e.preventDefault()
  e.stopPropagation()

  if (node.isEditable) {
    models.setActive(fileTree, node)
  }

  if (node.isContainer) {
    node.isExpanded = !node.isExpanded
    await node.readData()
    fileTree.rerender()
  }
}

function onContextmenuNode (e, fileTree, node) {

}