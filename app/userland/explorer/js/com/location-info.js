import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { isFilenameBinary } from 'beaker://app-stdlib/js/is-ext-binary.js'

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

  get renderModes () {
    if (this.pathInfo.isDirectory()) {
      return [['undefined', 'Files']]
    } else {
      if (this.realPathname.endsWith('.md')) {
        return [['undefined', 'Default'], ['raw', 'Raw File']]
      }
      return [['undefined', 'Default']]
    }
  }

  // rendering
  // =

  render () {
    if (!this.currentDriveInfo) return html``
    const title = this.title
    const canEdit = this.currentDriveInfo.writable
    const renderModes = this.renderModes
    const isText = !isFilenameBinary(this.realPathname)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${title ? html`<section><h3><a href=${this.realUrl}>${title}</a></h3></section>` : ''}
      <section>
        ${this.pathInfo.isDirectory() ? html`
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('new-file')} class="transparent"><span class="fa-fw far fa-file"></span> New file</button>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('new-folder')} class="transparent"><span class="fa-fw far fa-folder"></span> New folder</button>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('import')} class="transparent"><span class="fa-fw fas fa-file-import"></span> Import files</button>
        ` : html`
          ${isText ?
            this.renderMode === 'editor' ? html`
              <button ?disabled=${!canEdit} @click=${e => this.doEmit('save')} class="transparent">
                <span class="fa-fw fas fa-save"></span> Save
              </button>
            ` : html`
              <button ?disabled=${!canEdit} @click=${e => this.onSelectRenderMode(e, 'editor')} class="transparent"><span class="fa-fw far fa-edit"></span> Edit</button>
            `
          : ''}
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('rename')} class="transparent"><span class="fa-fw fas fa-i-cursor"></span> Rename</button>
          <button ?disabled=${!canEdit} @click=${e => this.doEmit('delete')} class="transparent"><span class="fa-fw fas fa-trash"></span> Delete</button>
        `}
      </section>
      ${renderModes.length > 1 ? html`
        <section class="selector">
          <h5>View</h5>
          ${renderModes.map(mode => this.renderRenderModeSelector(...mode))}
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

  renderRenderModeSelector (id, label) {
    return html`
      <div
        class=${id == this.renderMode ? 'active' : undefined}
        @click=${e => this.onSelectRenderMode(e, id)}
      >
        <span class="fas fa-fw fa-check"></span> ${label}
      </div>
    `
  }

  // events
  // =

  onSelectRenderMode (e, renderMode) {
    emit(this, 'change-render-mode', {detail: {renderMode}})
  }

  doEmit (evt) {
    emit(this, evt)
  }
}

customElements.define('location-info', LocationInfo)