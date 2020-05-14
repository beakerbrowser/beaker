import { LitElement, html } from './vendor/lit-element/lit-element.js'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map.js'
import * as uwg from './js/lib/uwg.js'
import * as notificationsIndex from './js/lib/notifications.js'
import * as tutil from './js/lib/test-utils.js'
import { pluralize, fromPostUrlToAppRoute, slugify } from './js/lib/strings.js'
import { writeToClipboard } from './js/lib/clipboard.js'
import * as toast from './js/com/toast.js'
import mainCSS from './css/main.css.js'
import './js/view/posts.js'
import './js/view/comments.js'
import './js/view/compose.js'
import './js/view/post.js'
import './js/view/profile.js'
import './js/view/users.js'
import './js/view/notifications.js'
import './js/view/search.js'
import './js/com/search-input.js'

const NOTIFICATIONS_INTERVAL = 15e3

const ROUTES = {
  'home': /^\/(index.html)?$/i,
  'compose': /^\/compose\/?$/i,
  'comments': /^\/comments\/?$/i,
  'users': /^\/users\/?$/i,
  'notifications': /^\/notifications\/?$/i,
  'search': /^\/search\/?$/i,
  'userProfile': /^\/users\/(?<id>[^\/]+)\/?$/i,
  'userPosts': /^\/users\/(?<id>[^\/]+)\/posts\/?$/i,
  'userComments': /^\/users\/(?<id>[^\/]+)\/comments\/?$/i,
  'post': /^\/users\/(?<id>[^\/]+)\/posts\/(?<filename>[^\/]+)$/i,
  'comment': /^\/users\/(?<id>[^\/]+)\/comments\/(?<filename>[^\/]+)$/i
}

window.tutil = tutil
tutil.init()

export class App extends LitElement {
  static get properties () {
    return {
      currentView: {type: String},
      session: {type: Object}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.groupInfo = {title: ''}
    this.route = '404'
    this.routeParams = undefined
    this.session = undefined
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

    if (this.route === 'comment') {
      await this.doCommentRedirect()
      return
    }

    // reroute from user keys to their id
    if (this.routeParams?.groups?.id && /[0-9a-f]{64}/i.test(this.routeParams.groups.id)) {
      try {
        console.log('redirecting from', this.routeParams.groups.id)
        let userProfile = await uwg.users.getByKey(this.routeParams.groups.id)
        location.pathname = location.pathname.replace(this.routeParams.groups.id, userProfile.id)
        return
      } catch (e) {
        toast.create('That user is not a member of this group')
        console.log(e)
        this.route = '404'
      }
    }

    // load group data
    var self = hyperdrive.self
    this.groupInfo = await self.getInfo()
    this.session = await navigator.session.get()
    if (this.session) {
      await uwg.profiles.setUser(this.session.user.url)
    }
    console.log(this.session)

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
    if (this.session?.user?.group?.isMember) {
      await notificationsIndex.updateIndex(this.session.user.url)
    }
    setTimeout(this.checkNotifications.bind(this), NOTIFICATIONS_INTERVAL)
  }

  async doCommentRedirect () {
    try {
      var comment = await uwg.comments.get(this.routeParams.groups.id, `/beaker-forum/comments/${this.routeParams.groups.filename}`)
      window.location = fromPostUrlToAppRoute(comment.stat.metadata.href)
    } catch (e) {
      console.error('Failed to load comment', e)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <header>
        <a class="brand" href="/">
          <img src="/thumb" @error=${this.onErrorBrandThumb}>
          <strong>${this.groupInfo.title}</strong>
        </a>
        <span class="spacer"></span>
        ${this.session?.user?.group?.isMember ? html`
          <a class="compose-btn" href="/compose">New Post</a>
          <beaker-search-input placeholder="Search this group"></beaker-search-input>
          <a
            class=${classMap({'circle-btn': true, highlighted: !!this.notificationCount})}
            href="/notifications"
            title="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
            data-tooltip="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
          >
            <span class="fas fa-fw fa-bell"></span>
            ${this.notificationCount ? html`<small class="fas fa-circle"></small>` : ''}
          </a>
          <a href="/users/${this.session.user.group.userid}">
            <img class="avatar" src="${this.session.user.url}/thumb">
          </a>
          <a class="logout tooltip-left" data-tooltip="End session" title="End session" @click=${this.onClickLogout}>
            <span class="fas fa-sign-out-alt"></span>
          </a>
        ` : this.session?.user ? html`
        ` : html`
          <a href="#" @click=${this.onClickJoin}><span class="fas fa-user-plus"></span> Login / Join This Group</a>
        `}
      </header>
      ${this.session?.user && !this.session?.user?.group?.isMember ? html`
        <div class="flash-message">
          <h2>Next Step</h2>
          <p>
            Send the group admin your URL via text or email.
            Once they've added your profile, you'll be a part of the group!
          </p>
          <a class="copy-btn" @click=${this.onClickCopyUserUrl}>
            <span>${this.session.user.url}</span>
            <span class="fas fa-paste"></span>
          </a>
        </div>
      ` : ''}
      ${this.renderView()}
    `
  }

  renderView () {
    switch (this.route) {
      case 'home': return html`
        <beaker-posts-view loadable .user=${this.session?.user}></beaker-posts-view>
      `
      case 'compose': return html`
        <beaker-compose-view loadable .user=${this.session?.user}></beaker-compose-view>
      `
      case 'comments': return html`
        <beaker-comments-view loadable .user=${this.session?.user}></beaker-comments-view>
      `
      case 'users': return html`
        <beaker-users-view loadable .user=${this.session?.user}></beaker-users-view>
      `
      case 'notifications': return html`
        <beaker-notifications-view loadable .user=${this.session?.user}></beaker-notifications-view>
      `
      case 'search': return html`
        <beaker-search-view loadable .user=${this.session?.user}></beaker-search-view>
      `
      case 'userProfile':
      case 'userPosts': return html`
        <beaker-profile-view loadable .user=${this.session?.user} profile-id=${this.routeParams.groups.id} ?admin-ctrls=${this.groupInfo.writable}></beaker-profile-view>
      `
      case 'userComments': return html`
        <beaker-profile-view loadable .user=${this.session?.user} profile-id=${this.routeParams.groups.id} subview="comments" ?admin-ctrls=${this.groupInfo.writable}></beaker-profile-view>
      `
      case 'post': return html`
        <beaker-post-view
          loadable
          .user=${this.session?.user}
          author=${this.routeParams.groups.id}
          filename=${this.routeParams.groups.filename}
        ></beaker-post-view>
      `
      case '404': return html`<div class="layout"><main><h1>404 not found</h1></main></div>`
    }
  }

  // events
  // =

  onErrorBrandThumb (e) {
    e.currentTarget.setAttribute('src', '/.ui/img/default-group-thumb.jpg')
  }

  async onClickJoin (e) {
    e.preventDefault()

    var session = await navigator.session.request()
    if (this.groupInfo.writable) {
      if (!(await uwg.users.getByKey(session.user.url).catch(e => undefined))) {
        await uwg.users.add(session.user.url, slugify(session.user.title))
      }
    }

    location.reload()
  }

  async onClickLogout (e) {
    e.preventDefault()
    await navigator.session.destroy()
    location.reload()
  }

  onClickCopyUserUrl (e) {
    e.preventDefault()
    writeToClipboard(this.session?.user?.url)
    toast.create('Copied to your clipboard')
  }
}

customElements.define('app-main', App)