import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import * as notificationsIndex from '../lib/notifications.js'
import '../com/notifications/feed.js'
import '../com/about.js'

export class NotificationsView extends LitElement {
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
    setTimeout(() => {
      notificationsIndex.markAllRead()
    }, 1e3)
  }

  render () {
    if (!this.user) return html``
    return html`
      <div class="layout right-col">
        <main>
          <nav class="pills">
            <a href="/" title="Posts">Posts</a>
            <a href="/comments" title="Comments">Comments</a>
            <a href="/users" title="Users">Users</a>
          </nav>
          <beaker-notifications-feed loadable .user=${this.user}></beaker-notifications-feed>
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

customElements.define('beaker-notifications-view', NotificationsView)
