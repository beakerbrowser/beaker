import { LitElement, html } from './vendor/lit-element/lit-element.js'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map.js'
import * as uwg from './js/lib/uwg.js'
import * as notificationsIndex from './js/lib/notifications.js'
import * as tutil from './js/lib/test-utils.js'
import { toNiceTopic, pluralize } from './js/lib/strings.js'
import mainCSS from './css/main.css.js'
import './js/view/posts.js'
import './js/view/comments.js'
import './js/view/compose.js'
import './js/view/post.js'
import './js/view/profile.js'
import './js/view/notifications.js'

const NOTIFICATIONS_INTERVAL = 15e3

const ROUTES = {
  'home': /^\/(index.html)?$/i,
  'compose': /^\/compose$/i,
  'comments': /^\/comments$/i,
  'notifications': /^\/notifications$/i,
  'userProfile': /^\/(?<id>[^\/]+)$/i,
  'userPosts': /^\/(?<id>[^\/]+)\/posts$/i,
  'userComments': /^\/(?<id>[^\/]+)\/comments$/i,
  'userFollowers': /^\/(?<id>[^\/]+)\/followers$/i,
  'userFollowing': /^\/(?<id>[^\/]+)\/following$/i,
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
    this.notificationCount = undefined
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
      await uwg.profiles.readSocialGraph(this.user, this.user)
    }
    await this.requestUpdate()
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())

    this.notificationCount = await notificationsIndex.count({isUnread: true})
    await this.requestUpdate()
    notificationsIndex.events.addEventListener('new-events', e => {
      this.notificationCount += e.detail.numNewEvents
      this.requestUpdate()
    })
    setTimeout(this.checkNotifications.bind(this), 5e3)
  }

  async checkNotifications () {
    await notificationsIndex.updateIndex(this.user.url)
    setTimeout(this.checkNotifications.bind(this), NOTIFICATIONS_INTERVAL)
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <header>
        <a href="/">
          <strong><span class="fas fa-fw fa-flask"></span> Beaker.Network</a></strong>
        </a>
        <a href="/" title="Posts">Posts</a>
        <a href="/comments" title="Comments">Comments</a>
        <span class="spacer"></span>
        <a
          class=${classMap({highlighted: this.notificationCount > 0 })}
          href="/notifications"
          title="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
          data-tooltip="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
        >
          <span class="fas fa-fw fa-bell"></span>
          ${typeof this.notificationCount === 'undefined' ? html`<span class="spinner"></span>` : this.notificationCount}
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

  renderView () {
    switch (this.route) {
      case 'home': return html`
        <beaker-posts-view loadable .user=${this.user}></beaker-posts-view>
      `
      case 'compose': return html`
        <beaker-compose-view loadable .user=${this.user}></beaker-compose-view>
      `
      case 'comments': return html`
        <beaker-comments-view loadable .user=${this.user}></beaker-comments-view>
      `
      case 'notifications': return html`
        <beaker-notifications-view loadable .user=${this.user}></beaker-notifications-view>
      `
      case 'userProfile':
      case 'userPosts': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id}></beaker-profile-view>
      `
      case 'userComments': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id} subview="comments"></beaker-profile-view>
      `
      case 'userFollowing': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.id} subview="following"></beaker-profile-view>
      `
      case 'userFollowers': return html`
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