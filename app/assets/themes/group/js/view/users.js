import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import '../com/profiles/list.js'

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
      <div class="layout">
        <main>
          <beaker-profile-list loadable .user=${this.user}></beaker-profiles-list>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-users-view', UsersView)
