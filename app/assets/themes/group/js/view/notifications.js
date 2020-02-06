import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import * as notificationsIndex from '../lib/notifications.js'
import '../com/notifications/feed.js'

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
      <div class="layout">
        <main>
          <beaker-notifications-feed loadable .user=${this.user}></beaker-notifications-feed>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-notifications-view', NotificationsView)
