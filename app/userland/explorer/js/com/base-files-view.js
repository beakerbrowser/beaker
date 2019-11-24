import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import mainCSS from '../../css/com/file-grid.css.js'

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
  }

  // rendering
  // =

  render () {
    var isEmpty = this.itemGroups.reduce((acc, group) => acc && group.length === 0, true)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div
        class="container"
        @click=${this.onClickContainer}
        @contextmenu=${this.onContextMenuContainer}
        @mousedown=${this.onMousedownContainer}
        @mousemove=${this.onMousemoveContainer}
        @mouseup=${this.onMouseupContainer}
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
    if (e.metaKey) {
      selection = this.selection.concat([item])
    } else {
      selection = [item]
    }
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
    if (!this.dragSelector) {
      // start tracking the drag-selection positions but dont create the element
      // until a certain number of pixels have been dragged over
      this.dragSelector = {
        isActive: false,
        el: undefined,
        start: {x: e.pageX, y: e.pageY},
        current: {x: e.pageX, y: e.pageY}
      }
    }
  }

  onMousemoveContainer (e) {
    if (this.dragSelector) {
      if (!e.buttons) {
        // mouseup must have happened outside of our container el
        return this.onMouseupContainer(e)
      } else {
        this.dragSelector.current = {x: e.pageX, y: e.pageY}
        if (!this.dragSelector.isActive) {
          // check if enough space has been covered to start the selector behavior
          if (
            Math.abs(this.dragSelector.current.x - this.dragSelector.start.x) > 5
            || Math.abs(this.dragSelector.current.y - this.dragSelector.start.y) > 5
          ) {
            this.dragSelector.el = createDragSelectorEl()
            this.shadowRoot.append(this.dragSelector.el)
            this.dragSelector.isActive = true
          }
        } 
        
        if (this.dragSelector.isActive) {
          // update the drag-selector rendering and update the selection list
          positionDragSelector(this.dragSelector)
          var selectedEls = findElsInSelector(this.dragSelector, this.shadowRoot.querySelectorAll('.item'))
          if (selectedEls.length !== this.selection.length) {
            var selection = selectedEls.map(el => this.items.find(i => i.url === el.dataset.url))
            emit(this, 'change-selection', {detail: {selection}})
          }
        }
      }
    }
  }

  onMouseupContainer (e) {
    if (this.dragSelector) {
      // wait for next tick so that onclick can register that we were dragging
      setTimeout(() => {
        if (this.dragSelector && this.dragSelector.el) {
          this.dragSelector.el.remove()
        }
        this.dragSelector = undefined
      }, 1)
    }
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

  dragSelector.el.style.left = left
  dragSelector.el.style.width = width
  dragSelector.el.style.top = top
  dragSelector.el.style.height = height
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