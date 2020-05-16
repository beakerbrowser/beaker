import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import css from '../../css/view/folder.css.js'
import '../com/folder/file-grid.js'
import '../com/folder/file-list.js'
import '../com/folder/inline-file-grid.js'
import '../com/folder/inline-file-list.js'
import '../com/file/file-display.js'

export class FolderView extends LitElement {
  static get properties () {
    return {
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      items: {type: Array},
      itemGroups: {type: Array},
      selection: {type: Array},
      renderMode: {type: String, attribute: 'render-mode'},
      inlineMode: {type: Boolean, attribute: 'inline-mode'},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.currentDriveInfo = undefined
    this.currentDriveTitle = undefined
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
    if (!this.currentDriveInfo || !this.items || !this.selection) return html``
    return html`
      ${this.renderMode === 'grid' ? (
        this.inlineMode
          ? html`<inline-file-grid .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-grid>`
          : html`<file-grid .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></file-grid>`
      ) : (
        this.inlineMode
          ? html`<inline-file-list .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-list>`
          : html`<file-list .items=${this.items} .itemGroups=${this.itemGroups} .selection=${this.selection}></file-list>`
      )}
    `
  }
}

customElements.define('explorer-view-folder', FolderView)
