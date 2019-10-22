import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/view/folder.css.js'
import '../com/file-grid.js'
import '../com/file-feed.js'
import '../com/file-display.js'

export class FolderView extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      items: {type: Array},
      selection: {type: Array},
      renderMode: {type: String, attribute: 'render-mode'},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'},
      showHidden: {type: Boolean, attribute: 'show-hidden'}
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
    this.selection = undefined
    this.renderMode = undefined
    this.realUrl = undefined
    this.realPathname = undefined
    this.showHidden = undefined
  }

  getInlineMdItem () {
    var md = this.items.find(item => item.name.toLowerCase() === 'readme.md')
    if (md) return md
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo || !this.items || !this.selection) return html``
    if (this.renderMode === 'feed') {
      return html`
        <file-feed
          user-url=${this.userUrl}
          real-url=${this.realUrl}
          real-pathname=${this.realPathname}
          current-drive-title=${this.currentDriveTitle}
          .currentDriveInfo=${this.currentDriveInfo}
          .items=${this.items}
          .selection=${this.selection}
        ></file-feed>
      `
    }
    var inlineMdItem = this.getInlineMdItem()
    return html`
      <file-grid
        .items=${this.items}
        .selection=${this.selection}
        ?show-hidden=${this.showHidden}
      ></file-grid>
      ${inlineMdItem ? html`
        <div class="readme">
          <file-display
            drive-url=${this.currentDriveInfo.url}
            pathname=${joinPath(this.realPathname, inlineMdItem.name)}
            .info=${inlineMdItem.stat}
          ></file-display>
        </div>
      ` : ''}
      <social-signals
        user-url=${this.userUrl}
        topic=${this.realUrl}
        .authors=${[this.userUrl]}
      ></social-signals>
      <beaker-comments-thread
        .comments=${[]}
        topic-url="${this.realUrl}"
        user-url="${this.userUrl}"
      ></beaker-comments-thread>
    `
  }


  // events
  // =

}

customElements.define('explorer-view-folder', FolderView)
