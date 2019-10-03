import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { toNiceUrl, joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/com/file-and-folder-info.css.js'
import './file-display.js'

export class FileInfo extends LitElement {
  static get properties() {
    return {
      driveInfo: {type: Object},
      pathInfo: {type: Object},
      mountInfo: {type: Object},
      selection: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.title = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
    this.selection = []
  }

  get currentDriveInfo () {
    return this.mountInfo || this.driveInfo
  }

  getRealUrl (pathname) {
    var slicePoint = this.mountInfo ? (this.mountInfo.mountPath.length + 1) : 0
    return joinPath(this.currentDriveInfo.url, pathname.slice(slicePoint))
  }

  // rendering
  // =

  render () {
    if (this.selection.length > 1) {
      return html`<section><p>${this.selection.length} items selected</p></section>`
    }
    let sel = this.selection[0]
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section>
        <h3>${sel.name}</h3>
        ${this.renderSize()}
      </section>
      <section>
        ${this.renderUrl()}
      </section>
      ${sel.stat.isFile() ? html`
        <section>
          <h5>Preview</h5>
          <file-display
            pathname=${joinPath(location.pathname, sel.name)}
            .info=${sel.stat}
          ></file-display>
        </section>
      ` : ''}
    `
  }

  renderUrl () {
    var url = this.getRealUrl(joinPath(location.pathname, this.selection[0].name))
    return html`
      <p class="real-url">
        <span class="fas fa-fw fa-link"></span>
        <a href=${url} target="_blank">${toNiceUrl(url)}</a>
      </p>
    `
  }

  renderSize () {
    const sz = this.selection[0].stat.size
    if (!sz) return undefined
    return html`<p><small>Size:</small> ${bytes(sz)}</p>`
  }

  // events
  // =

}

customElements.define('file-info', FileInfo)