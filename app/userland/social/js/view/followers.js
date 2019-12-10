import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../lib/uwg.js'
import '../com/profiles/header.js'
import '../com/profiles/aside.js'

export class FollowersView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String}
    }
  }
 
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.followers = undefined
  }

  async load () {
    this.followers = await uwg.friends.list({target: this.author})
    console.log(this.followers)
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    if (!this.followers) return html``
    return html`
      <div class="layout">
        <main>
          <beaker-profile-header loadable .user=${this.user} id=${this.author}></beaker-profile-header>
          ${this.followers.length === 0 ? html`
            <div class="empty">
              This user is not followed by anybody you follow.
            </div>
          ` : ''}
          <div class="layout split-col">
            ${repeat(this.followers, f => html`
              <beaker-profile-aside loadable .user=${this.user} id=${f.drive.url}></beaker-profile-header>
            `)}
          </div>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-followers-view', FollowersView)
