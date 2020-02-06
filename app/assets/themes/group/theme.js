import { LitElement, html } from './vendor/lit-element/lit-element.js'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map.js'
import * as uwg from './js/lib/uwg.js'
import * as notificationsIndex from './js/lib/notifications.js'
import * as tutil from './js/lib/test-utils.js'
import { pluralize, fromPostUrlToAppRoute, slugify } from './js/lib/strings.js'
import { writeToClipboard } from './js/lib/clipboard.js'
import * as toast from './js/com/toast.js'
import * as contextMenu from './js/com/context-menu.js'
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
  'userProfile': /^\/(?<username>[^\/]+)\/?$/i,
  'userPosts': /^\/(?<username>[^\/]+)\/posts\/?$/i,
  'userComments': /^\/(?<username>[^\/]+)\/comments\/?$/i,
  'post': /^\/(?<username>[^\/]+)\/posts\/(?<topic>[^\/]+)\/(?<filename>[^\/]+)$/i,
  'comment': /^\/(?<username>[^\/]+)\/comments\/(?<filename>[^\/]+)$/i
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
    this.groupInfo = {title: ''}
    this.route = '404'
    this.routeParams = undefined
    this.user = undefined
    this.registration = {
      userUrl: undefined,
      get hasUser () {
        return Boolean(this.userUrl)
      },
      isRegistered: false
    }
    this.userCount = undefined
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

    // reroute from user keys to their username
    if (this.routeParams?.groups?.username && /[0-9a-f]{64}/i.test(this.routeParams.groups.username)) {
      try {
        console.log('redirecting from', this.routeParams.groups.username)
        let userProfile = await uwg.users.getByKey(this.routeParams.groups.username)
        location.pathname = location.pathname.replace(this.routeParams.groups.username, userProfile.username)
        return
      } catch (e) {
        toast.create('That user is not a member of this group')
        console.log(e)
        this.route = '404'
      }
    }

    // load group data
    var self = new Hyperdrive(location)
    this.groupInfo = await self.getInfo()
    this.userCount = await uwg.users.count()
    if (!this.user && localStorage.userUrl) {
      this.registration.userUrl = localStorage.userUrl
      this.registration.isRegistered = Boolean(await uwg.users.getByKey(localStorage.userUrl).catch(e => undefined))
      if (this.registration.isRegistered) {
        this.user = await uwg.profiles.setUser(this.registration.userUrl)
      }
    }
    console.log(this.registration)

    if (this.route === 'comment') {
      await this.doCommentRedirect()
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
    if (this.user) {
      await notificationsIndex.updateIndex(this.user.url)
    }
    setTimeout(this.checkNotifications.bind(this), NOTIFICATIONS_INTERVAL)
  }

  async doCommentRedirect () {
    try {
      var comment = await uwg.comments.get(this.routeParams.groups.id, `/comments/${this.routeParams.groups.filename}`)
      window.location = fromPostUrlToAppRoute(comment.stat.metadata.href)
    } catch (e) {
      console.error('Failed to load comment', e)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/theme/webfonts/fontawesome.css">
      <header>
        <a class="brand" href="/">
          <strong>${this.groupInfo.title}</strong>
        </a>
        <a href="/" title="Posts">Posts</a>
        <a href="/comments" title="Comments">Comments</a>
        <span class="spacer"></span>
        ${this.groupInfo.writable ? html`
          <a href="#" @click=${this.onClickAdminMenu}>
            <span class="fas fa-toolbox"></span> Admin <span class="fas fa-caret-down"></span>
          </a>
        ` : ''}
        ${this.user ? html`
          <a
            class=${classMap({highlighted: this.notificationCount > 0 })}
            href="/notifications"
            title="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
            data-tooltip="${this.notificationCount || 'No'} ${pluralize(this.notificationCount || 0, 'notification')}"
          >
            <span class="fas fa-fw fa-bell"></span>
            ${typeof this.notificationCount === 'undefined' ? html`<span class="spinner"></span>` : this.notificationCount}
          </a>
        ` : ''}
        <a
          href="/users"
          title="${this.userCount || ''} ${pluralize(this.userCount || 0, 'member')}"
        >
          <span class="fas fa-fw fa-users"></span>
          ${typeof this.userCount === 'undefined' ? html`<span class="spinner"></span>` : `${this.userCount} ${pluralize(this.userCount || 0, 'member')}`}
        </a>
        ${this.registration.isRegistered ? html`
          <a href="/${this.user.url.slice('hyper://'.length)}">
            <span class="fas fa-fw fa-user-circle"></span>
            ${this.user.title}
          </a>
          <a class="compose-btn" href="/compose"><span class="fas fa-plus"></span> New Post</a>
        ` : this.registration.hasUser ? html`
        ` : html`
          <a href="#" @click=${this.onClickJoin}><span class="fas fa-user-plus"></span> Join This Group</a>
        `}
      </header>
      ${this.registration.hasUser && !this.registration.isRegistered ? html`
        <div class="flash-message">
          <h2>Next Step</h2>
          <p>
            Send the group admin your URL via text, email, or courier pidgeon.
            Once they've added your profile, you'll be a part of the group!
          </p>
          <a class="copy-btn" @click=${this.onClickCopyUserUrl}>
            <span>${this.registration.userUrl}</span>
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
        <beaker-posts-view loadable .user=${this.user}></beaker-posts-view>
      `
      case 'compose': return html`
        <beaker-compose-view loadable .user=${this.user}></beaker-compose-view>
      `
      case 'comments': return html`
        <beaker-comments-view loadable .user=${this.user}></beaker-comments-view>
      `
      case 'users': return html`
        <beaker-users-view loadable .user=${this.user}></beaker-users-view>
      `
      case 'notifications': return html`
        <beaker-notifications-view loadable .user=${this.user}></beaker-notifications-view>
      `
      case 'search': return html`
        <beaker-search-view loadable .user=${this.user}></beaker-search-view>
      `
      case 'userProfile':
      case 'userPosts': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.username}></beaker-profile-view>
      `
      case 'userComments': return html`
        <beaker-profile-view loadable .user=${this.user} profile-id=${this.routeParams.groups.username} subview="comments"></beaker-profile-view>
      `
      case 'post': return html`
        <beaker-post-view
          loadable
          .user=${this.user}
          author=${this.routeParams.groups.username}
          topic=${this.routeParams.groups.topic}
          filename=${this.routeParams.groups.filename}
        ></beaker-post-view>
      `
      case '404': return html`<div class="layout"><main><h1>404 not found</h1></main></div>`
    }
  }

  // events
  // =

  async onClickJoin (e) {
    e.preventDefault()

    var title = prompt('Enter your user name')
    if (!title) return
    var userDrive = await Hyperdrive.create({
      type: 'user',
      title,
      prompt: false
    })
    localStorage.userUrl = userDrive.url

    if (this.groupInfo.writable) {
      await uwg.users.add(userDrive.url, slugify(title))
    }

    location.reload()
  }

  onClickCopyUserUrl (e) {
    e.preventDefault()
    writeToClipboard(this.registration.userUrl)
    toast.create('Copied to your clipboard')
  }

  onClickAdminMenu (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: (rect.left + rect.right) / 2,
      y: rect.bottom,
      center: true,
      roomy: true,
      items: [{
        label: 'Add user',
        click: () => this.onAdminAddUser()
      }, {
        label: 'Rename user',
        click: () => this.onAdminRenameUser()
      }, {
        label: 'Remove user',
        click: () => this.onAdminRemoveUser()
      }]
    })
  }

  async onAdminAddUser () {
    var url = prompt('URL of the user to add')
    if (!url) return
    var username = prompt('Username of the new user')
    if (!username) return
    try {
      await uwg.users.add(url, username)
      toast.create('User added', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onAdminRenameUser () {
    var oldUsername = prompt('User\'s current name')
    if (!oldUsername) return
    var newUsername = prompt('New username')
    if (!newUsername) return
    try {
      await uwg.users.rename(oldUsername, newUsername)
      toast.create('User renamed', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onAdminRemoveUser () {
    var username = prompt('Name of the user to remove')
    if (!username) return
    try {
      await uwg.users.removeByUsername(username)
      toast.create('User removed', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('app-main', App)