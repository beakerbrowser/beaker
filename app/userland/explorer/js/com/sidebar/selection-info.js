import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import bytes from '../../../vendor/bytes/index.js'
import { emit } from '../../lib/dom.js'
import '../file/file-display.js'

export class SelectionInfo extends LitElement {
  static get properties () {
    return {
      driveInfo: {type: Object},
      pathInfo: {type: Object},
      mountInfo: {type: Object},
      selection: {type: Array},
      noPreview: {type: Boolean, attribute: 'no-preview'},
      metadataHasChanged: {type: Boolean}
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
    this.metadataHasChanged = false
  }

  createRenderRoot () {
    return this // no shadow dom
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
    return html`
      <link rel="stylesheet" href="/css/font-awesome.css">
      <section>
        <h3>${sel.path}</h3>
        ${this.renderSize()}
        ${sel.mount ? html`
          <drive-info .driveInfo=${sel.mount}></drive-info>
        ` : ''}
        ${!this.noPreview && sel.stat.isFile() ? html`
          <section style="border-radius: 0">
            <file-display
              drive-url=${sel.drive.url}
              pathname=${sel.realPath}
              .info=${sel}
            ></file-display>
          </section>
        ` : ''}
        ${this.renderMetadata()}
      </section>
    `
  }

  renderSize () {
    const sz = this.selection[0].stat.size
    if (!sz || this.selection.length > 1) return undefined
    return html`<p class="facts"><span><span class="fas fa-fw fa-save"></span> ${bytes(sz)}</span></p>`
  }

  renderMetadata () {
    if (this.selection[0].stat.isDirectory()) return
    var isWritable = this.mountInfo ? this.mountInfo.writable : this.driveInfo.writable
    var entries = Object.entries(this.selection[0].stat.metadata)
    if (isWritable) entries = entries.concat([['', '']])
    if (!isWritable && entries.length === 0) return
    return html`
      <div class="metadata">
        <h4>Metadata</h4>
        ${repeat(entries, entry => `meta-${entry[0]}`, ([k, v]) => html`
          <div class="entry">
            <input type="text" name="key" value=${k} @input=${this.onChangeMetadata} ?disabled=${!isWritable} placeholder="Key">
            <input type="text" name="value" value=${v} @input=${this.onChangeMetadata} ?disabled=${!isWritable} placeholder="Value">
          </div>
        `)}
      </div>
      ${this.metadataHasChanged ? html`
        <button class="primary" @click=${this.onClickSaveMetadata}><span class="fas fa-fw fa-check"></span> Save</button>
      ` : ''}
    `
  }

  // events
  // =

  onChangeMetadata (e) {
    this.metadataHasChanged = true
  }

  async onClickSaveMetadata (e) {
    var newMetadata = {}
    for (let entryEl of Array.from(this.querySelectorAll('.metadata .entry'))) {
      let k = entryEl.querySelector('[name="key"]').value.trim()
      let v = entryEl.querySelector('[name="value"]').value.trim()
      if (k && v) newMetadata[k] = v
    }
    var deletedKeys = []
    for (let k in this.selection[0].stat.metadata) {
      if (!(k in newMetadata)) deletedKeys.push(k)
    }
    emit(this, 'update-file-metadata', {detail: {path: this.selection[0].path, newMetadata, deletedKeys}})
    this.selection[0].stat.metadata = newMetadata
    this.metadataHasChanged = false
    await this.requestUpdate()

    // make sure the last .entry is empty
    this.querySelector('.metadata .entry:last-of-type input[name="key"]').value = ''
    this.querySelector('.metadata .entry:last-of-type input[name="value"]').value = ''
  }
}

customElements.define('selection-info', SelectionInfo)