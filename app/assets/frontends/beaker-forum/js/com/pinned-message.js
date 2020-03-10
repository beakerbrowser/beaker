import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import css from '../../css/com/pinned-message.css.js'
import MarkdownIt from '../../vendor/markdown-it.js'

const md = MarkdownIt({
  html: false, // Enable HTML tags in source
  xhtmlOut: false, // Use '/' to close single tags (<br />)
  breaks: true, // Convert '\n' in paragraphs into <br>
  linkify: false, // Autoconvert URL-like text to links
  typographer: true,
  quotes: '“”‘’'
})

export class PinnedMessage extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.md = undefined
  }

  async load () {
    if (localStorage.pinnedMessageHidden) return
    var drive = hyperdrive.self
    this.md = await drive.readFile('/beaker-forum/pinned-message.md').catch(e => undefined)
    this.requestUpdate()
  }

  render () {
    if (!this.md) return ''
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <a class="hide-btn" href="#" @click=${this.onClickHide}><span class="fas fa-times"></span></a>
      <div class="md">${unsafeHTML(md.render(this.md))}</div>
    `
  }

  onClickHide (e) {
    localStorage.pinnedMessageHidden = 1
    this.remove()
  }
}

customElements.define('beaker-pinned-message', PinnedMessage)
