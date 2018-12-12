import { LitElement, html } from '../vendor/lit-element.js'
import MarkdownIt from '../vendor/markdown-it.js'

var md = MarkdownIt({
  html: true, // Enable HTML tags in source
  xhtmlOut: false, // Use '/' to close single tags (<br />)
  breaks: true, // Convert '\n' in paragraphs into <br>
  langPrefix: 'language-', // CSS language prefix for fenced blocks
  linkify: true, // Autoconvert URL-like text to links

  // Enable some language-neutral replacement + quotes beautification
  typographer: true,

  // Double + single quotes replacement pairs, when typographer enabled,
  // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
  quotes: '“”‘’',

  // Highlighter function. Should return escaped HTML,
  // or '' if the source string is not changed
  highlight: function (/* str, lang */) { return '' }
})

class ViewPage extends LitElement {
  static get properties () {
    return {
      siteInfo: Object,
      filename: String
    }
  }

  constructor() {
    super()
    this.page = null
    this.load()
  }

  createRenderRoot() {
    return this // dont use the shadow dom
  }

  updated () {
    this.load()
  }

  async load () {
    if (!this.page && this.filename) {
      var site = new DatArchive(window.location)
      this.page = JSON.parse(await site.readFile(`/data/pages/${this.filename}.json`))
      this.requestUpdate()
    }
  }

  render() {
    if (!this.page) return ''
    return html`
      <style>
        .x-view-page-inner {
          padding: 0 0.5rem 5rem;
        }
      </style>
      <div class="x-view-page-inner">
        <h2 class="title">${this.page.title || 'Untitled'}</h2>
        ${this.page.description ? html`<h3 class="subtitle">${this.page.description}</h3>` : ''}
        <div class="content" .innerHTML=${md.render(this.page.content)}></div>
      </div>
    `
  }
}

customElements.define('x-view-page', ViewPage)
