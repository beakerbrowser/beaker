import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/posts/feed.js'
import '../com/about.js'
import '../com/pinned-message.js'

export class PostsView extends LitElement {
  static get properties () {
    return {
      user: {type: Object}
    }
  }
 
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()
    this.user = undefined
  }

  async load () {
    await this.requestUpdate()
    // Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    return html`
      <div class="layout right-col">
        <main>
          <nav class="pills">
            <a class="selected" href="/" title="Posts">Posts</a>
            <a href="/comments" title="Comments">Comments</a>
            <a href="/users" title="Users">Users</a>
          </nav>
          <beaker-pinned-message loadable></beaker-pinned-message>
          <beaker-posts-feed loadable .user=${this.user}></beaker-posts-feed>
        </main>
        <nav>
          <beaker-about loadable></beaker-about>
        </nav>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-posts-view', PostsView)
