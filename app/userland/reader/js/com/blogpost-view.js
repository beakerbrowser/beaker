import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import css from '../../css/com/blogpost-view.css.js'

class BlogpostView extends LitElement {
  static get properties () {
    return {
      post: {type: Object},
      content: {type: String},
      error: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.post = undefined
    this.content = undefined
    this.error = undefined
  }

  updated (changedProperties) {
    if (changedProperties.has('post') && changedProperties.get('post') != this.post) {
      this.load()
    }
  }

  async load () {
    this.content = undefined
    this.error = undefined
    try {
      this.content = await beaker.hyperdrive.readFile(this.post.url, 'utf8')
    } catch (e) {
      this.error = e
    }
  }

  render () {
    if (!this.content && !this.error) {
      return html`
        <div class="content loading"><span class="spinner"></span></div>
      `
    }
    if (this.content) {
      return html`
        <div class="postmeta">
          <a class="thumb" href=${this.post.site.url} target="_blank">
            <img src="asset:thumb:${this.post.site.url}">
          </a>
          <a class="author" href=${this.post.site.url} target="_blank">
            ${this.post.site.title}
          </a>
          <a href=${this.post.url} target="_blank">View on site</a>
        </div>
        <div class="content markdown">
          ${unsafeHTML(beaker.markdown.toHTML(this.content))}
        </div>
      `
    }
    return html`
      <div class="content error">${this.error.toString()}</div>
    `
  }
}

customElements.define('beaker-blogpost-view', BlogpostView)