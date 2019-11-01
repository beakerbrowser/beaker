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
    const canEdit = this.currentDriveInfo.writable
    if (this.selection.length > 1) {
      return html`
        <section><strong>${this.selection.length} items selected</strong></section>
        <section>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('delete')} class="transparent"><span class="fa-fw fas fa-trash"></span> Delete</button>
        </section>
      `
    }
    var sel = this.selection[0]
    var selPathname = joinPath(location.pathname, sel.name)
    var selRealUrl = this.getRealUrl(selPathname)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section>
        <h3><a href=${selRealUrl}>${sel.name}</a></h3>
        ${this.renderSize()}
      </section>
      ${sel.mountInfo ? html`
        <section>
          <h5>Mounted drive</h5>
          <p><small>URL:</small> <a class="link" href=${sel.mountInfo.url}>${toNiceUrl(sel.mountInfo.url)}</a></p>
          <p><small>Title:</small> ${sel.mountInfo.title || 'Untitled'}</p>
          ${sel.mountInfo.description ? html`<p><small>Description: </small> ${sel.mountInfo.description}</p>` : ''}
        </section>
      ` : ''}
      <section>
        <button ?disabled=${!canEdit} @click=${e => this.doEmit('rename')} class="transparent"><span class="fa-fw fas fa-i-cursor"></span> Rename</button>
        <button ?disabled=${!canEdit} @click=${e => this.doEmit('delete')} class="transparent"><span class="fa-fw fas fa-trash"></span> Delete</button>
      </section>
      ${!this.noPreview && sel.stat.isFile() ? html`
        <section>
          <h5>Preview</h5>
          <file-display
            drive-url=${this.currentDriveInfo.url}
            pathname=${this.getRealPathname(selPathname)}
            .info=${sel.stat}
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

  renderSize () {
    const sz = this.selection[0].stat.size
    if (!sz) return undefined
    return html`<p><small>Size:</small> ${bytes(sz)}</p>`
  }

  // events
  // =

  doEmit (evt) {
    emit(this, evt)
  }
}

customElements.define('selection-info', SelectionInfo)