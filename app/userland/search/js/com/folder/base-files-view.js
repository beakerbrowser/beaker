import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from '../../lib/dom.js'
import * as contextMenu from '../context-menu.js'
import mainCSS from '../../../css/com/folder/file-grid.css.js'

export class BaseFilesView extends LitElement {
  static get properties () {
    return {
      items: {type: Array},
      itemGroups: {type: Array},
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
    this.showOrigin = undefined
    this.dragSelector = undefined
    this.lastClickedItemEl = undefined
  }

  // rendering
  // =

  render () {
    var isEmpty = this.itemGroups.reduce((acc, group) => acc && group.length === 0, true)
    return html`
      <link rel="stylesheet" href="/css/font-awesome.css">
      <div class="container">
        ${this.itemGroups.map(group => {
          if (group.items.length === 0) return ''
          return html`
            <div class="items">
              ${repeat(group.items, this.renderItem.bind(this))}
            </div>
          `
        })}
        ${isEmpty ? html`
          <div class="empty">No results found</div>
        ` : ''}
      </div>
    `
  }

  renderItem (item) {
    return html`<div>This function must be overridden</div>`
  }
}
