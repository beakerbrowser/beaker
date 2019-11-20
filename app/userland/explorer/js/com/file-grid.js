import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import mainCSS from '../../css/com/file-grid.css.js'

export class FileGrid extends LitElement {
  static get properties () {
    return {
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
    this.itemGroups = []
    this.selection = []
    this.showOrigin = undefined
  }

  // rendering
  // =

  render () {
    var isEmpty = this.itemGroups.reduce((acc, group) => acc && group.length === 0, true)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.itemGroups.map(group => {
        if (group.items.length === 0) return ''
        return html`
          <h4>${group.label}</h4>
          <div class="grid">
            ${repeat(group.items, this.renderItem.bind(this))}
          </div>
        `
      })}
      ${isEmpty ? html`
        <div class="empty">This folder is empty</div>
      ` : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
      mount: item.mountInfo,
      folder: item.stat.isDirectory(),
      file: item.stat.isFile(),
      selected: this.selection.includes(item)
    })
    var driveTitle = item.drive.title || 'Untitled'
    return html`
      <div
        class=${cls}
        @click=${e => this.onClick(e, item)}
        @dblclick=${e => this.onDblClick(e, item)}
        @contextmenu=${e => this.onContextMenu(e, item)}
      >
        <span class="fas fa-fw fa-${item.icon}"></span>
        ${item.subicon ? html`<span class="subicon ${item.subicon}"></span>` : ''}
        ${item.mountInfo ? html`<span class="mounticon fas fa-external-link-square-alt"></span>` : ''}
        <div class="name">${this.showOrigin ? item.path : item.name}</div>
        ${this.showOrigin ? html`<div class="author">${driveTitle}</div>` : ''}
      </div>
    `
  }

  // events
  // =

  onClick (e, item) {
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

  onDblClick (e, item) {
    emit(this, 'goto', {detail: {item}})
  }

  onContextMenu (e, item) {
    e.preventDefault()
    e.stopPropagation()
    contextMenu.destroy()
    if (!this.selection.includes(item)) {
      emit(this, 'change-selection', {detail: {selection: [item]}})
    }
    emit(this, 'show-context-menu', {detail: {x: e.clientX, y: e.clientY}})
  }
}

customElements.define('file-grid', FileGrid)