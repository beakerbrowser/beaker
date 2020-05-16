import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/file/file-display.js'

export class QueryView extends LitElement {
  static get properties () {
    return {
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      pathInfo: {type: Object},
      items: {type: Array},
      itemGroups: {type: Array},
      selection: {type: Array},
      renderMode: {type: String, attribute: 'render-mode'},
      inlineMode: {type: Boolean, attribute: 'inline-mode'},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'}
    }
  }

  constructor () {
    super()
    this.currentDriveInfo = undefined
    this.currentDriveTitle = undefined
    this.pathInfo = undefined
    this.items = undefined
    this.itemGroups = undefined
    this.selection = undefined
    this.renderMode = undefined
    this.inlineMode = undefined
    this.realUrl = undefined
    this.realPathname = undefined
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo || !this.pathInfo) return html``
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

customElements.define('explorer-view-query', QueryView)
