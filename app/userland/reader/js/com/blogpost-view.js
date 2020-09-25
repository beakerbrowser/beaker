import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import 'beaker://app-stdlib/js/com/record-thread.js'
import css from '../../css/com/blogpost-view.css.js'

class BlogpostView extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      post: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.post = undefined
  }

  render () {
    if (!this.post) {
      return ''
    }
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
      <beaker-record-thread
        record-url=${this.post.url}
        .profile-url=${this.profile.url}
        full-page
      ></beaker-record-thread>
    `
  }
}

customElements.define('beaker-blogpost-view', BlogpostView)