import yo from 'yo-yo'
import {FSArchiveFolder_BeingCreated} from 'beaker-virtual-fs'
import parseDatURL from 'parse-dat-url'
import renderFilesFlatView from './files-browser/files-flat-view'

// exported api
// =

export default class FilesBrowser {
  constructor (root) {
    this.root = root
    this.currentSource = root
    this.currentSort = ['name', 'desc']
    this.selectedNodes = new Set() // set of nodes
    this.currentDragNode = null
    this.onSetCurrentSource = () => {} // v simple events solution
  }

  // method to render at a place in the page
  // eg yo`<div>${myFilesBrowser.render()}</div>`
  render () {
    if (!this.root) {
      return yo`<div class="files-browser"></div>`
    }

    return yo`
      <div class="files-browser">
        ${this.getCurrentSource() ? renderFilesFlatView(this, this.getCurrentSource()) : null}
      </div>
    `
  }

  // method to re-render in place
  // eg myFilesBrowser.rerender()
  rerender () {
    let el = document.querySelector('.files-browser')
    if (el) {
      yo.update(el, this.render())
    }
  }

  // node-tree management api

  async reloadTree (node = undefined) {
    // if node is not given, then this is a root call
    // run for the sources, and for the current source
    if (!node) {
      await this.reloadTree(this.root)
      await this.reloadTree(this.currentSource)
      return
    }

    // recursively read data of the currently-expanded tree
    await node.readData()
    if (node.hasChildren) {
      const children = node.children
      for (var k in children) {
        if (children[k] && this.isExpanded(children[k])) {
          await this.reloadTree(children[k])
        }
      }
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
    await this.unselectAll()
    this.currentSource = node
    await this.currentSource.readData()
    if (!suppressEvent) {
      this.onSetCurrentSource(node)
    }
    this.resortTree()
    this.rerender()
  }

  // sorting api

  toggleSort (column) {
    // noop
  }

  resortTree () {
    this.currentSource.sort(...this.currentSort)
  }

  // expand api

  isExpanded (node) {
    return false
  }

  async expand (node) {
    // noop
  }

  collapse (node) {
    // noop
  }

  // selection api

  isSelected (node) {
    return this.selectedNodes.has(node)
  }

  async selectOne (node) {
    await this.unselectAll()
    await this.select(node)
  }

  async select (node) {
    this.selectedNodes.add(node)
    this.rerender()
  }

  async unselect (node) {
    // reset node state
    if (node instanceof FSArchiveFolder_BeingCreated) {
      // if this was a new folder, reload the tree to remove that temp node
      await this.reloadTree()
    } else {
      node.isRenaming = false
    }

    // remove from set
    this.selectedNodes.delete(node)
  }

  async unselectAll () {
    for (let node of this.selectedNodes) {
      await this.unselect(node)
    }
  }

  async selectDirection (dir) {
    // noop
  }

  // drag/drop api

  getCurrentlyDraggedNode () {
    return this.currentDragNode
  }

  setCurrentlyDraggedNode (node) {
    this.currentDragNode = node
  }
}