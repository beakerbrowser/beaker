import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/folder/file-grid.js'
import '../com/folder/file-list.js'
import '../com/folder/inline-file-grid.js'
import '../com/folder/inline-file-list.js'
import '../com/file/file-display.js'

export class SearchResultsView extends LitElement {
  static get properties () {
    return {
      items: {type: Array},
      itemGroups: {type: Array},
      selection: {type: Array},
      renderMode: {type: String, attribute: 'render-mode'},
      inlineMode: {type: Boolean, attribute: 'inline-mode'}
    }
  }

  constructor () {
    super()
    this.items = undefined
    this.itemGroups = undefined
    this.selection = undefined
    this.renderMode = undefined
    this.inlineMode = undefined
  }

  // rendering
  // =

  render () {
    return html`
      ${this.renderMode === 'grid' ? (
        this.inlineMode
          ? html`<inline-file-grid show-origin .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-grid>`
          : html`<file-grid show-origin .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></file-grid>`
      ) : (
        this.inlineMode
          ? html`<inline-file-list show-origin .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-list>`
          : html`<file-list show-origin .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></file-list>`
      )}
    `
  }

  // events
  // =
}

customElements.define('search-results-view', SearchResultsView)
