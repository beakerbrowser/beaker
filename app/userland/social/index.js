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
import './js/view/search.js'
import './js/com/search-input.js'

const NOTIFICATIONS_INTERVAL = 15e3

const ROUTES = {
  'home': /^\/(index.html)?$/i,
  'compose': /^\/compose$/i,
  'comments': /^\/comments$/i,
  'notifications': /^\/notifications$/i,
  'search': /^\/search$/i,
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

    if (this.route === 'comment') {
      this.doCommentRedirect()
    }

    if (!this.user) {
      let st = await navigator.filesystem.stat('/profile')
      this.user = await (new Hyperdrive(st.mount.key)).getInfo()
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

  async doCommentRedirect () {
    try {
      var comment = await uwg.comments.get(this.routeParams.groups.id, `/comments/${this.routeParams.groups.filename}`)
      var urlp = new URL(comment.stat.metadata.href)
      window.location = `/${urlp.hostname}${urlp.pathname}`
    } catch (e) {
      console.error('Failed to load comment', e)
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <header>
        <a class="brand" href="/">
          <svg class="logo" viewBox="0 0 423.33333 423.33334" height="16" width="16">
            <g>
              <path
                d="m 200.89962,376.0479 c -24.73216,-1.58999 -50.03103,-9.19167 -71.4375,-21.46517 -22.17481,-12.71403 -41.770537,-31.08395 -55.750567,-52.2631 -21.57868,-32.69077 -30.78054,-71.64081 -26.07932,-110.38965 3.08365,-25.4163 11.91667,-49.42273 26.07932,-70.87855 5.92143,-8.97071 11.67851,-16.07078 19.58166,-24.149613 8.783677,-8.978953 16.400907,-15.324151 26.291127,-21.900673 16.86303,-11.213103 33.66176,-18.605574 52.91667,-23.286565 33.1993,-8.070963 66.14007,-5.907045 99.30693,6.523591 8.55737,3.20722 15.0652,4.616366 24.65855,5.339333 4.91048,0.37006 6.60707,0.329676 15.73451,-0.374531 5.6268,-0.434124 13.2468,-0.874368 16.93333,-0.97832 12.74853,-0.359481 18.3855,1.439679 20.55395,6.560239 1.54225,3.641861 1.58295,4.143194 1.84942,22.779822 0.27258,19.064617 0.52411,22.429417 2.29427,30.691657 1.29904,6.0633 2.38416,9.06084 5.94809,16.43101 10.13412,20.95726 15.29833,40.34326 16.79852,63.06025 1.5486,23.44986 -2.52328,48.80746 -11.36765,70.79207 -10.94619,27.20912 -28.1073,50.0767 -51.59882,68.75663 -4.51138,3.58735 -14.17744,10.08816 -19.75556,13.2864 -5.71429,3.27631 -16.55936,8.43954 -22.40138,10.66507 -22.80973,8.68939 -46.6421,12.33747 -70.55555,10.8001 z m 19.93194,-47.96386 c 29.14081,-2.50322 55.34477,-14.82307 75.17415,-35.34329 18.27114,-18.90769 29.06845,-41.81794 32.29806,-68.53161 0.61364,-5.07567 0.61364,-19.97154 0,-25.04722 -3.23107,-26.72572 -14.01866,-49.61537 -32.29806,-68.5316 -26.17801,-27.09003 -63.8503,-39.879737 -101.45609,-34.444247 -40.13126,5.800517 -74.90491,32.525387 -90.82786,69.804667 -4.448017,10.41383 -7.183307,20.87142 -8.722427,33.34757 -0.60148,4.87566 -0.59211,19.84443 0.0156,24.87083 3.23108,26.72573 14.018657,49.61538 32.298067,68.53161 19.64716,20.33165 46.03634,32.81965 74.64499,35.32384 4.89002,0.42803 14.00778,0.43743 18.87361,0.0194 z"
                style="fill:#000000;stroke-width:0.352778" />
            </g>
          </svg>
          <strong>Beaker.Network</a></strong>
        </a>
        <a href="/" title="Posts">Posts</a>
        <a href="/comments" title="Comments">Comments</a>
        <span class="spacer"></span>
        <beaker-search-input placeholder="Search your network"></beaker-search-input>
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
            href="/${this.user.url.slice('drive://'.length)}/following"
            title="Following ${this.user.following.length} ${pluralize(this.user.following.length, 'user')}"
            data-tooltip="Following ${this.user.following.length} ${pluralize(this.user.following.length, 'user')}"
          >
            <span class="fas fa-fw fa-users"></span>
            ${this.user.following.length}
          </a>
        ` : ''}
        ${this.user ? html`
          <a href="/${this.user.url.slice('drive://'.length)}">
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
      case 'search': return html`
        <beaker-search-view loadable .user=${this.user}></beaker-search-view>
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
      case '404': return html`<div class="layout"><main><h1>404 not found</h1></main></div>`
    }
  }

  // events
  // =
}

customElements.define('app-main', App)