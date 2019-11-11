import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { joinPath, toNiceUrl } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import './file-display.js'

export class SelectionInfo extends LitElement {
  static get properties () {
    return {
      driveInfo: {type: Object},
      pathInfo: {type: Object},
      mountInfo: {type: Object},
      selection: {type: Array},
      noPreview: {type: Boolean, attribute: 'no-preview'},
      userUrl: {type: String, attribute: 'user-url'}
    }
  }

  constructor () {
    super()
    this.title = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
    this.selection = []
    this.noPreview = undefined
    this.userUrl = undefined
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get currentDriveInfo () {
    return this.mountInfo || this.driveInfo
  }

  getRealPathname (pathname) {
    var slicePoint = this.mountInfo ? (this.mountInfo.mountPath.length + 1) : 0
    return pathname.slice(slicePoint)
  }

  getRealUrl (pathname) {
    return joinPath(this.currentDriveInfo.url, this.getRealPathname(pathname))
  }

  // rendering
  // =

  render () {
    if (this.selection.length > 1) {
      return html`
        <section><strong>${this.selection.length} items selected</strong></section>
      `
    }
    var sel = this.selection[0]
    var selPathname = joinPath(location.pathname, sel.name)
    var selRealUrl = this.getRealUrl(selPathname)
    console.log(sel)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section>
        <h3><a href=${selRealUrl}>${sel.name}</a></h3>
        <p class="facts">
          ${this.renderDrive()}
          ${this.renderSize()}
        </p>
      </section>
      ${sel.mountInfo ? html`
        <drive-info .driveInfo=${sel.mountInfo} user-url=${this.userUrl}></drive-info>
      ` : ''}
      ${!this.noPreview && sel.stat.isFile() ? html`
        <section>
          <h5>Preview</h5>
          <file-display
            drive-url=${sel.drive.url}
            pathname=${sel.path}
            .info=${sel}
          ></file-display>
        </section>
      ` : ''}
      <section>
        <social-signals
          user-url=${this.userUrl}
          topic=${selRealUrl}
          .authors=${[this.userUrl]}
        ></social-signals>
        <beaker-comments-thread
          .comments=${[]}
          topic-url="${selRealUrl}"
          user-url="${this.userUrl}"
        ></beaker-comments-thread>
      </section>
    `
  }

  renderDrive () {
    if (this.selection.length !== 1) return undefined
    var drive = this.selection[0].drive
    return html`<span><small>Drive:</small> <a href=${drive.url} title=${drive.title}>${drive.title}</a>`
  }

  renderSize () {
    const sz = this.selection[0].stat.size
    if (!sz || this.selection.length > 1) return undefined
    return html`<span><span class="fas fa-fw fa-save"></span> ${bytes(sz)}</span>`
  }

  // events
  // =

}

customElements.define('selection-info', SelectionInfo)