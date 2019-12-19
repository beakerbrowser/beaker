import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../lib/uwg.js'
import '../com/profiles/header.js'
import '../com/profiles/aside.js'

export class FollowingView extends LitElement {
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
    this.following = undefined
  }

  async load () {
    this.following = await uwg.friends.list({author: this.author}, {includeProfiles: true})
    console.log(this.following)
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    if (!this.following) return html``
    return html`
      <div class="layout narrow">
        <main>
          <beaker-profile-header loadable .user=${this.user} id=${this.author}></beaker-profile-header>
          ${this.following.length === 0 ? html`
            <div class="empty">
              This user is not following anybody.
            </div>
          ` : ''}
          <div class="layout split-col">
            ${repeat(this.following, f => html`
              <beaker-profile-aside loadable .user=${this.user} id=${f.mount.url}></beaker-profile-header>
            `)}
          </div>
        </main>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-following-view', FollowingView)
