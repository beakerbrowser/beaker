import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/posts/feed.js'
import '../com/search-input.js'
import '../com/topics.js'

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
    this.topic = (new URLSearchParams(location.search)).get('topic') || undefined
  }

  async load () {
    await this.requestUpdate()
    // Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    return html`
      <div class="layout right-col">
        <main>
          <beaker-posts-feed loadable .user=${this.user} .topic=${this.topic}></beaker-posts-feed>
        </main>
        <nav>
          <beaker-search-input placeholder="Search this group"></beaker-search-input>
          <beaker-topics loadable></beaker-topics>
        </nav>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-posts-view', PostsView)
