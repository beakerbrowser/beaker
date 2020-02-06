import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/posts/feed.js'

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
      <div class="layout">
        <main>
          <beaker-posts-feed loadable .user=${this.user}></beaker-posts-feed>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-posts-view', PostsView)
