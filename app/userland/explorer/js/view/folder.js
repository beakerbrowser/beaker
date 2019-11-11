import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/view/folder.css.js'
import '../com/file-grid.js'
import '../com/file-list.js'
import '../com/inline-file-grid.js'
import '../com/inline-file-list.js'
import '../com/file-display.js'

export class FolderView extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
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
    this.userUrl = undefined
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

  getInlineMdItem () {
    var md = this.items.find(item => item.name.toLowerCase() === 'readme.md')
    if (md) return md
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo || !this.items || !this.selection) return html``
    // if (this.renderMode === 'feed') {
    //   return html`
    //     <file-feed
    //       user-url=${this.userUrl}
    //       real-url=${this.realUrl}
    //       real-pathname=${this.realPathname}
    //       current-drive-title=${this.currentDriveTitle}
    //       .currentDriveInfo=${this.currentDriveInfo}
    //       .items=${this.items}
    //       .selection=${this.selection}
    //     ></file-feed>
    //   `
    // }
    var inlineMdItem = this.getInlineMdItem()
    return html`
      ${this.renderMode === 'grid' ? (
        this.inlineMode
          ? html`<inline-file-grid .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-grid>`
          : html`<file-grid .itemGroups=${this.itemGroups} .selection=${this.selection}></file-grid>`
      ) : (
        this.inlineMode
          ? html`<inline-file-list .itemGroups=${this.itemGroups} .selection=${this.selection}></inline-file-list>`
          : html`<file-list .itemGroups=${this.itemGroups} .selection=${this.selection}></file-list>`
      )}
      ${''/* TODO inlineMdItem ? html`
        <div class="readme">
          <file-display
            drive-url=${this.currentDriveInfo.url}
            pathname=${joinPath(this.realPathname, inlineMdItem.name)}
            .info=${{stat: inlineMdItem.stat}}
          ></file-display>
        </div>
      ` : this.currentDriveInfo.writable ? html`
        <div class="readme">
          <a class="add-readme-link" href="#" @click=${this.onAddReadme}>+ Add README.md</a>
        </div>
      ` : ''}*/}
    `
  }

  // events
  // =

  onAddReadme (e) {
    var drive = new DatArchive(this.currentDriveInfo.url)
    drive.writeFile(this.realPathname + '/README.md', '')
    window.location = this.realUrl + '/README.md?edit'
  }
}

customElements.define('explorer-view-folder', FolderView)
