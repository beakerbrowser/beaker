import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/view/file.css.js'
import '../com/file/file-display.js'
import '../com/social-signals.js'
import 'beaker://app-stdlib/js/com/comments/thread.js'

export class FileView extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String, attribute: 'user-url'},
      currentDriveInfo: {type: Object},
      currentDriveTitle: {type: String, attribute: 'current-drive-title'},
      pathInfo: {type: Object},
      realUrl: {type: String, attribute: 'real-url'},
      realPathname: {type: String, attribute: 'real-pathname'},
      renderMode: {type: String, attribute: 'render-mode'}
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
    this.pathInfo = undefined
    this.realUrl = undefined
    this.realPathname = undefined
    this.renderMode = undefined
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo || !this.pathInfo) return html``
    return html`
      <div class="content">
        <file-display
          drive-url=${location.origin}
          pathname=${location.pathname}
          render-mode=${this.renderMode}
          .info=${{stat: this.pathInfo}}
        ></file-display>
      </div>
    `
  }


  // events
  // =
}

customElements.define('explorer-view-file', FileView)
