import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import css from '../../css/views/index-md.css.js'

class IndexMd extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.drive = beaker.hyperdrive.drive(location)
    this.indexMd = undefined
    this.load()
  }

  get isDirectory () {
    return location.pathname.endsWith('/')
  }

  async load () {
    if (this.isDirectory) {
      this.indexMd = await this.drive.readFile(location.pathname + 'index.md', 'utf8').catch(e => undefined)
    }
    this.requestUpdate()
  }

  render () {
    if (!this.isDirectory) return html``
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.indexMd ? html`
        <div class="markdown">
          ${unsafeHTML(beaker.markdown.toHTML(this.indexMd))}
        </div>
      ` : ''}
    `
  }
}

customElements.define('beaker-index-md', IndexMd)