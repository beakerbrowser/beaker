import { LitElement, html } from './vendor/lit-element/lit-element.js'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map.js'
import * as uwg from './js/lib/uwg.js'
import * as tutil from './js/lib/test-utils.js'
import { toNiceTopic, pluralize } from './js/lib/strings.js'
import mainCSS from './css/main.css.js'
import './js/view/posts.js'
import './js/view/compose.js'
import './js/view/post.js'
import './js/view/profile.js'

const ROUTES = {
  'home': /^\/(index.html)?$/i,
  'compose': /^\/compose$/i,
  'notifications': /^\/notifications$/i,
  'profile': /^\/(?<id>[^\/]+)$/i,
  'posts': /^\/(?<id>[^\/]+)\/posts$/i,
  'comments': /^\/(?<id>[^\/]+)\/comments$/i,
  'followers': /^\/(?<id>[^\/]+)\/followers$/i,
  'following': /^\/(?<id>[^\/]+)\/following$/i,
  'post': /^\/(?<id>[^\/]+)\/posts\/(?<topic>[^\/]+)\/(?<filename>[^\/]+)$/i,
  'comment': /^\/(?<id>[^\/]+)\/comments\/(?<filename>[^\/]+)$/i
}

window.tutil = tutil
tutil.init()

export class App extends LitElement {
  static get properties () {
    return {
      currentView: {type: String},
      user: {type: Object}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.route = '404'
    this.routeParams = undefined
    this.user = undefined
    this.load()
  }

  async load () {
    for (let route in ROUTES) {
      let match = ROUTES[route].exec(window.location.pathname)
      if (match) {
        this.route = route
        this.routeParams = match
        break
      }
    }
    console.log(this.route, this.routeParams)

    if (!this.user) {
      let st = await navigator.filesystem.stat('/profile')
      this.user = await (new DatArchive(st.mount.key)).getInfo()
      uwg.profiles.setUser(this.user)
      await uwg.profiles.readSocialGraph(this.user)
    }
    await this.requestUpdate()
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <header>
        <a class=${classMap({active: this.route === 'home'})} href="/">
          <strong><span class="fas fa-fw fa-flask"></span> Beaker.Network</a></strong>
          ${this.renderTopic()}
        </a>
        <span class="spacer"></span>
        <a
          class=${classMap({active: this.route === 'notifications' })}
          href="/notifications"
          title="${0 || 'No'} ${pluralize(0, 'notification')}"
          data-tooltip="${0 || 'No'} ${pluralize(0, 'notification')}"
        >
          <span class="fas fa-fw fa-bell"></span> 0
        </a>
        ${this.user && this.user.following ? html`
          <a
            href="/${this.user.url.slice('dat://'.length)}/following"
            title="Following ${this.user.following.length} ${pluralize(this.user.following.length, 'user')}"
            data-tooltip="Following ${this.user.following.length} ${pluralize(this.user.following.length, 'user')}"
          >
            <span class="fas fa-fw fa-users"></span>
            ${this.user.following.length}
          </a>
        ` : ''}
        ${this.user ? html`
          <a href="/${this.user.url.slice('dat://'.length)}">
            <span class="fas fa-fw fa-user-circle"></span>
            ${this.user.title}
          </a>
        ` : ''}
      </header>
      ${this.renderView()}
    `
  }

  renderTopic () {
    if (this.route !== 'home') {
      return undefined
    }
    var params = new URLSearchParams(location.search)
    var topic = params.get('topic')
    return html`<span class="topic">
      ${topic ? html`Topic: <strong>${toNiceTopic(topic)}</strong>` : 'All topics'}
    </span>`
  }

  renderView () {
    switch (this.route) {
      case 'home': return html`
        <beaker-posts-view loadable .user=${this.user}></beaker-posts-view>
      `
      case 'compose': return html`
        <beaker-compose-view loadable .user=${this.user}></beaker-compose-view>
      `
      case 'notifications': return html`
        <div class="layout"><main>todo</main></div>
      `
      case 'profile':
      case 'posts': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id}></beaker-profile-view>
      `
      case 'comments': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id} subview="comments"></beaker-profile-view>
      `
      case 'following': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id} subview="following"></beaker-profile-view>
      `
      case 'followers': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id} subview="followers"></beaker-profile-view>
      `
      case 'post': return html`
        <beaker-post-view
          loadable
          .user=${this.user}
          author=${this.routeParams.groups.id}
          topic=${this.routeParams.groups.topic}
          filename=${this.routeParams.groups.filename}
        ></beaker-post-view>
      `
      case 'comment': return html`
        <div class="layout wide">
          <main>
            comment-view todo
          </main>
        </div>
      `
      case '404': return html`<div class="layout"><main><h1>404 not found</h1></main></div>`
    }
  }

  // events
  // =
}

customElements.define('app-main', App)