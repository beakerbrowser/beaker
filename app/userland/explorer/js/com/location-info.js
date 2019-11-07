import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'

export class LocationInfo extends LitElement {
  static get properties () {
    return {
      realPathname: {type: String, attribute: 'real-pathname'},
      realUrl: {type: String, attribute: 'real-url'},
      renderMode: {type: String, attribute: 'render-mode'},
      driveInfo: {type: Object},
      pathInfo: {type: Object},
      mountInfo: {type: Object}
    }
  }

  constructor () {
    super()
    this.realPathname = undefined
    this.realUrl = undefined
    this.renderMode = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get currentDriveInfo () {
    return this.mountInfo || this.driveInfo
  }

  get title () {
    return location.pathname.split('/').pop()
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo) return html``
    const title = this.title
    const canEdit = this.currentDriveInfo.writable
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${title ? html`<section><h3><a href=${this.realUrl}>${title}</a></h3></section>` : ''}
      ${this.pathInfo.isDirectory() ? html`
        <section>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('new-file')} class="transparent"><span class="fa-fw far fa-file"></span> New file</button>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('new-folder')} class="transparent"><span class="fa-fw far fa-folder"></span> New folder</button>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('import')} class="transparent"><span class="fa-fw fas fa-file-import"></span> Import files</button>
        </section>
      ` : ''}
    `
  }

  renderSize () {
    if (this.pathInfo.isDirectory()) {
      return undefined
    }
    return html`<p><small>Size:</small> ${bytes(this.pathInfo.size)}</p>`
  }

  // events
  // =

  doEmit (evt) {
    emit(this, evt)
  }
}

customElements.define('location-info', LocationInfo)