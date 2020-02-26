import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/profiles/list.js'
import '../com/about.js'

export class UsersView extends LitElement {
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
            <a href="/" title="Posts">Posts</a>
            <a href="/comments" title="Comments">Comments</a>
            <a class="selected" href="/users" title="Users">Users</a>
          </nav>
          <beaker-profile-list loadable .user=${this.user}></beaker-profiles-list>
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

customElements.define('beaker-users-view', UsersView)
