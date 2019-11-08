import {  html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { FileGrid } from './file-grid.js'
import './file-display.js'
import css from '../../css/com/inline-file-grid.css.js'

export class InlineFileGrid extends FileGrid {
  static get properties () {
    return {
      itemGroups: {type: Array},
      selection: {type: Array},
      showOrigin: {type: Boolean, attribute: 'show-origin'}
    }
  }

  static get styles () {
    return css
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
        <h4>Files</h4>
        <div class="empty">This folder is empty</div>
      ` : ''}
    `
  }

  renderItem (item) {
    var cls = classMap({
      item: true,
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
        <div class="content">
          <file-display
            drive-url=${item.drive.url}
            pathname=${item.path}
            .info=${item}
          ></file-display>
        </div>
        <div class="header">
          <div><a class="name" href=${item.url}>${item.name}</a></div>
          ${this.showOrigin ? html`
            <div><a class="author" href=${item.drive.url} title=${driveTitle}>${driveTitle}</a></div>
          ` : ''}
        </div>
      </div>
    `
  }

  // events
  // =
}

customElements.define('inline-file-grid', InlineFileGrid)
