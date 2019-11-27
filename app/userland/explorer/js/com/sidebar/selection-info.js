import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import bytes from 'beaker://app-stdlib/vendor/bytes/index.js'
import { joinPath, toNiceUrl } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import '../file/file-display.js'

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
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <section>
        <h3>${sel.path}</h3>
        ${this.renderSize()}
        ${sel.mount ? html`
          <drive-info .driveInfo=${sel.mount} user-url=${this.userUrl}></drive-info>
        ` : ''}
        ${!this.noPreview && sel.stat.isFile() ? html`
          <section>
            <file-display
              drive-url=${sel.drive.url}
              pathname=${sel.path}
              .info=${sel}
            ></file-display>
          </section>
        ` : ''}
      </section>
      ${''/* TODO <section>
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
      </section>*/}
    `
  }

  renderSize () {
    const sz = this.selection[0].stat.size
    if (!sz || this.selection.length > 1) return undefined
    return html`<p class="facts"><span><span class="fas fa-fw fa-save"></span> ${bytes(sz)}</span></p>`
  }

  // events
  // =

}

customElements.define('selection-info', SelectionInfo)