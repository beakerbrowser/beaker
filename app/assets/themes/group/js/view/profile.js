import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../lib/uwg.js'
import '../com/profiles/aside.js'
import '../com/posts/feed.js'
import '../com/comments/feed.js'
import '../com/profiles/list.js'

export class ProfileView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      profileId: {type: String, attribute: 'profile-id'},
      subview: {type: String}
    }
  }
 
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()
    this.user = undefined
    this.profileId = undefined
    this.subview = 'posts'
  }

  async load () {
    await this.requestUpdate()
    // Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    const navItem = (id, label) => html`
      <a
        class=${this.subview === id ? 'selected' : ''}
        href="/${this.profileId}/${id}"
      >${label}</a>
    `
    return html`
      <div class="layout left-col">
        <nav>
          <beaker-profile-aside loadable .user=${this.user} id=${this.profileId}></beaker-profile-aside>
        </nav>
        <main>
          <nav class="pills">
            ${navItem('posts', 'Posts')}
            ${navItem('comments', 'Comments')}
          </nav>
          ${this.renderSubview()}
        </main>
      </div>
    `
  }

  renderSubview () {
    if (this.subview === 'posts') {
      return html`<beaker-posts-feed loadable .user=${this.user} author=${this.profileId}></beaker-posts-feed>`
    }
    if (this.subview === 'comments') {
      return html`<beaker-comments-feed loadable .user=${this.user} author=${this.profileId}></beaker-comments-feed>`
    }
  }

  // events
  // =

}

customElements.define('beaker-profile-view', ProfileView)
