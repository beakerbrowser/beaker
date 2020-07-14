import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import { findParent, emit } from '../../lib/dom.js'
import { handleDragDrop } from '../../lib/drag-drop.js'
import * as contextMenu from '../context-menu.js'
import * as loc from '../../lib/location.js'
import mainCSS from '../../../css/com/folder/file-grid.css.js'

/**
 * NOTES ON DRAG & DROP EVENT BEHAVIORS
 * 
 * - The web platform is very finicky with its dragenter/dragleave/etc events and will sometimes
 *   fail to fire if the drag moves too quickly.
 * - To make sure that drop-targets get the '.drag-hover' added and removed correctly, we rely on
 *   selectively removing pointer-events on DOM elements during 'drag & drop' mode.
 * 
 * -prf
 */

export class BaseFilesView extends LitElement {
  static get properties () {
    return {
      items: {type: Array},
      itemGroups: {type: Array},
      selection: {type: Array},
      showOrigin: {type: Boolean, attribute: 'show-origin'}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.items = undefined
    this.itemGroups = []
    this.selection = []
    this.showOrigin = undefined
    this.dragSelector = undefined
    this.lastClickedItemEl = undefined
  }

  stopDragSelection () {
    // wait for next tick so that onclick can register that we were dragging
    setTimeout(() => {
      if (this.dragSelector && this.dragSelector.el) {
        this.dragSelector.el.remove()
        this.classList.remove('drag-selector-active')
      }
      this.dragSelector = undefined
    }, 1)
  }

  startDragDropMode () {
    this.dragDropModeActive = true
    this.shadowRoot.querySelector('.container').classList.add('is-dragging')
  }

  createDragGhost (items) {
    var wrapper = document.createElement('div')
    wrapper.className = 'drag-ghost'
    items.forEach(item => {
      var el = document.createElement('div')
      el.textContent = item.name
      wrapper.append(el)
    })
    this.shadowRoot.append(wrapper)
    return wrapper
  }

  endDragDropMode () {
    if (this.dragDropModeActive) {
      this.dragDropModeActive = false
      this.shadowRoot.querySelector('.container').classList.remove('is-dragging')
      try { this.shadowRoot.querySelector('.drag-ghost').remove() }
      catch (e) {}
    }
    Array.from(this.shadowRoot.querySelectorAll('.drag-hover'), el => el.classList.remove('drag-hover'))
  }

  getInlineMdItem () {
    var md = this.items.find(item => item.name.toLowerCase() === 'readme.md')
    if (md) return md
  }

  // rendering
  // =

  render () {
    var inlineMdItem = this.getInlineMdItem()
    var isEmpty = this.itemGroups.reduce((acc, group) => acc && group.length === 0, true)
    return html`
      <link rel="stylesheet" href="/css/font-awesome.css">
      <div
        class="container"
        @click=${this.onClickContainer}
        @contextmenu=${this.onContextMenuContainer}
        @mousedown=${this.onMousedownContainer}
        @mousemove=${this.onMousemoveContainer}
        @mouseup=${this.onMouseupContainer}
        @dragenter=${this.onDragenterContainer}
        @dragover=${this.onDragoverContainer}
        @dragleave=${this.onDragleaveContainer}
        @drop=${this.onDropContainer}
      >
        ${this.itemGroups.map(group => {
          if (group.items.length === 0) return ''
          return html`
            <h4>${group.label}</h4>
            <div class="items">
              ${repeat(group.items, this.renderItem.bind(this))}
            </div>
          `
        })}
        ${isEmpty ? html`
          <div class="empty">This folder is empty</div>
        ` : ''}
        ${inlineMdItem ? html`
          <h4>Readme</h4>
          <div class="readme">
            <file-display
              drive-url=${inlineMdItem.drive.url}
              pathname=${inlineMdItem.realPath}
              .info=${inlineMdItem}
            ></file-display>
          </div>
        ` : /*this.currentDriveInfo.writable ? html`
          <div class="readme">
            <a class="add-readme-link" href="#" @click=${this.onAddReadme}>+ Add README.md</a>
          </div>
        ` :*/ ''}
      </div>
    `
  }

  renderItem (item) {
    return html`<div>This function must be overridden</div>`
  }

  // events
  // =

  onClickItem (e, item) {
    e.stopPropagation()
    contextMenu.destroy()

    var selection
    if (e.metaKey || e.ctrlKey) {
      let i = this.selection.indexOf(item)
      if (i === -1) {
        selection = this.selection.concat([item])
      } else {
        this.selection.splice(i, 1)
        selection = this.selection
      }
    } else if (e.shiftKey && this.lastClickedItemEl) {
      // shift-click to range select
      // because items are broken up into groups, the easiest way to do this
      // is to find the items using the drag-selector's hit detection
      let selector = {start: getElXY(this.lastClickedItemEl), current: getElXY(e.currentTarget)}
      let els = findElsInSelector(selector, this.shadowRoot.querySelectorAll('.item'))
      let items = els.map(el => this.items.find(i => i.url === el.dataset.url))
      selection = this.selection.slice()
      for (let item of items) {
        if (!selection.includes(item)) {
          selection.push(item)
        }
      }
    } else {
      selection = [item]
    }
    this.lastClickedItemEl = e.currentTarget
    emit(this, 'change-selection', {detail: {selection}})
  }

  onDblClickItem (e, item) {
    emit(this, 'goto', {detail: {item}})
  }

  onContextMenuItem (e, item) {
    e.preventDefault()
    e.stopPropagation()
    contextMenu.destroy()
    if (!this.selection.includes(item)) {
      emit(this, 'change-selection', {detail: {selection: [item]}})
    }
    emit(this, 'show-context-menu', {detail: {x: e.clientX, y: e.clientY}})
  }

  onDragstartItem (e, item) {
    if (!this.selection.includes(item)) {
      emit(this, 'change-selection', {detail: {selection: [item]}})
    }

    this.stopDragSelection()
    var items = this.selection.length ? this.selection : [item]
    e.dataTransfer.setData('text/uri-list', items.map(item => item.url).join(`\n`))
    e.dataTransfer.setData('text/plain', items.map(item => item.url).join(`\n`))
    e.dataTransfer.setDragImage(this.createDragGhost(items), 0, 0)
    this.startDragDropMode()
  }

  onDropItem (e, item) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-hover')
    var targetPath = item && item.stat.isDirectory() ? item.path : loc.getPath()
    handleDragDrop(e.currentTarget, e.clientX, e.clientY, targetPath, e.dataTransfer)
    return false
  }

  onClickContainer (e) {
    if (!this.dragSelector || !this.dragSelector.isActive) {
      emit(this, 'change-selection', {detail: {selection: []}})
    }
  }

  onContextMenuContainer (e) {
    if (!this.dragSelector || !this.dragSelector.isActive) {
      emit(this, 'change-selection', {detail: {selection: []}})
    }
  }

  onMousedownContainer (e) {
    if (!this.dragSelector && !findParent(e.target, 'readme')) {
      // start tracking the drag-selection positions but dont create the element
      // until a certain number of pixels have been dragged over
      this.dragSelector = {
        isActive: false,
        el: undefined,
        start: {x: e.pageX, y: e.pageY},
        current: {x: e.pageX, y: e.pageY},
        initialSelection: this.selection.slice()
      }
    }
  }

  onMousemoveContainer (e) {
    var diffMode = e.metaKey || e.shiftKey
    if (this.dragSelector && !this.dragDropModeActive) {
      if (!e.buttons) {
        // mouseup must have happened outside of our container el
        return this.onMouseupContainer(e)
      } else {
        this.dragSelector.current = {x: e.pageX, y: e.pageY}
        if (!this.dragSelector.isActive) {
          // check if enough space has been covered to start the selector behavior
          if (
            Math.abs(this.dragSelector.current.x - this.dragSelector.start.x) > 50
            || Math.abs(this.dragSelector.current.y - this.dragSelector.start.y) > 50
          ) {
            this.dragSelector.el = createDragSelectorEl()
            this.shadowRoot.append(this.dragSelector.el)
            this.classList.add('drag-selector-active')
            this.dragSelector.isActive = true
          }
        } 
        
        if (this.dragSelector.isActive) {
          // update the drag-selector rendering and update the selection list
          positionDragSelector(this.dragSelector)
          var newSelectedEls = findElsInSelector(this.dragSelector, this.shadowRoot.querySelectorAll('.item'))
          var newSelection = newSelectedEls.map(el => this.items.find(i => i.url === el.dataset.url))
          if (diffMode) {
            for (let sel of this.dragSelector.initialSelection) {
              let i = newSelection.indexOf(sel)
              if (i !== -1) {
                newSelection.splice(i, 1)
              } else {
                newSelection.push(sel)
              }
            }
          }
          if (hasSelectionChanged(newSelection, this.selection)) {
            emit(this, 'change-selection', {detail: {selection: newSelection}})
          }
        }
      }
    }
    if (this.dragDropModeActive && !e.buttons) {
      // catch the case where 'drop' event occurred outside container
      this.endDragDropMode()
    }
  }

  onMouseupContainer (e) {
    if (this.dragSelector) {
      this.stopDragSelection()
    }
  }

  onDragenterContainer (e) {
    e.preventDefault()
    e.stopPropagation()

    var contanerEl = this.shadowRoot.querySelector('.container')
    var itemEl = findParent(e.target, 'folder')
    if (itemEl) {
      contanerEl.classList.remove('drag-hover')
      itemEl.classList.add('drag-hover')
      this.dragLastEntered = itemEl
    } else if (!contanerEl.classList.contains('drag-hover')) {
      contanerEl.classList.add('drag-hover')
      this.dragLastEntered = this.shadowRoot.querySelector('.container')
    }
    e.dataTransfer.dropEffect = 'move'
    return false
  }

  onDragoverContainer (e) {
    e.preventDefault()
    e.stopPropagation()
    return false
  }

  onDragleaveContainer (e) {
    e.preventDefault()
    e.stopPropagation()
    var contanerEl = this.shadowRoot.querySelector('.container')
    var itemEl = findParent(e.target, 'folder')
    if (itemEl && itemEl !== this.dragLastEntered) {
      if (this.dragLastEntered) this.dragLastEntered.classList.add('drag-hover')
      itemEl.classList.remove('drag-hover')
    } else if (contanerEl === e.target) {
      contanerEl.classList.remove('drag-hover')
    }
  }

  onDropContainer (e) {
    e.preventDefault()
    e.stopPropagation()
    this.endDragDropMode()
    handleDragDrop(this.shadowRoot.querySelector('.container'), e.clientX, e.clientY, loc.getPath(), e.dataTransfer)
    return false
  }
}

// helpers
// =

function createDragSelectorEl () {
  var el = document.createElement('div')
  el.classList.add('drag-selector')
  return el
}

function positionDragSelector (dragSelector) {
  function min (k) { return Math.min(dragSelector.start[k], dragSelector.current[k]) }
  function max (k) { return Math.max(dragSelector.start[k], dragSelector.current[k]) }

  var top = min('y')
  var left = min('x')
  var height = max('y') - top
  var width = max('x') - left

  dragSelector.el.style.left = String(left) + 'px'
  dragSelector.el.style.width = String(width) + 'px'
  dragSelector.el.style.top = String(top) + 'px'
  dragSelector.el.style.height = String(height) + 'px'
}

function findElsInSelector (dragSelector, candidateEls) {
  function min (k) { return Math.min(dragSelector.start[k], dragSelector.current[k]) }
  function max (k) { return Math.max(dragSelector.start[k], dragSelector.current[k]) }

  var dragRect = {
    top: min('y'),
    left: min('x'),
    bottom: max('y'),
    right: max('x')
  }

  return Array.from(candidateEls).filter(el => {
    let elRect = el.getClientRects()[0]
    if (dragRect.top > elRect.bottom) return false
    if (dragRect.bottom < elRect.top) return false
    if (dragRect.left > elRect.right) return false
    if (dragRect.right < elRect.left) return false
    return true
  })
}

function hasSelectionChanged (left, right) {
  if (left.length !== right.length) return true
  return left.reduce((v, acc) => acc || right.indexOf(v) === -1, false)
}

function getElXY (el) {
  let rect = el.getClientRects()[0]
  return {
    x: (rect.left + rect.right) / 2,
    y: (rect.top + rect.bottom) / 2
  }
}