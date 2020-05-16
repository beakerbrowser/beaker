import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import * as loc from '../lib/location.js'
import css from '../../css/view/file.css.js'
import '../com/file/file-display.js'

export class FileView extends LitElement {
  static get properties () {
    return {
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
          drive-url=${loc.getOrigin()}
          pathname=${loc.getPath()}
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
