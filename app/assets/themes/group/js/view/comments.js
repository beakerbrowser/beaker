import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/comments/feed.js'

export class CommentsView extends LitElement {
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
          <beaker-comments-feed loadable .user=${this.user}></beaker-comments-feed>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-comments-view', CommentsView)
