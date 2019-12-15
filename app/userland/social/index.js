import { LitElement, html } from './vendor/lit-element/lit-element.js'
import { classMap } from './vendor/lit-element/lit-html/directives/class-map.js'
import * as uwg from './js/lib/uwg.js'
import * as tutil from './js/lib/test-utils.js'
import mainCSS from './css/main.css.js'
import './js/com/profiles/header.js'
import './js/com/profiles/aside.js'
import './js/com/status/feed.js'
import './js/view/status.js'
import './js/view/following.js'
import './js/view/followers.js'

const ROUTES = {
  'home': /^\/(index.html)?$/i,
  'notifications': /^\/notifications$/i,
  'profile': /^\/(?<id>[^\/]+)$/i,
  'profileFollowers': /^\/(?<id>[^\/]+)\/followers$/i,
  'profileFollowing': /^\/(?<id>[^\/]+)\/following$/i,
  'profileStatus': /^\/(?<id>[^\/]+)\/status\/(?<filename>[^\/]+)$/i,
  'profileComment': /^\/(?<id>[^\/]+)\/comment\/(?<filename>[^\/]+)$/i
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
        <div class="inner">
          <a class=${classMap({active: this.route === 'home'})} href="/"><span class="fas fa-fw fa-home"></span> Home</a>
          <a class=${classMap({active: this.route === 'notifications' })} href="/notifications"><span class="fas fa-fw fa-bell"></span> Notifications</a>
          <span class="spacer"></span>
          ${this.user ? html`<a href="/${this.user.url.slice('dat://'.length)}">
            <img src="asset:thumb:${this.user.url}?cache_buster=${Date.now()}">
            ${this.user.title}
          </a>` : ''}
        </div>
      </header>
      ${this.renderView()}
    `
  }

  renderView () {
    switch (this.route) {
      case 'home': return html`
        <div class="layout narrow">
          <main><beaker-status-feed loadable .user=${this.user}></beaker-status-feed></main>
        </div>
      `
      case 'notifications': return html`
        <div class="layout narrow"><main>todo</main></div>
      `
      case 'profile': return html`
        <div class="layout narrow">
          <main>
            <beaker-profile-header loadable .user=${this.user} id=${this.routeParams.groups.id}></beaker-profile-header>
            <beaker-status-feed loadable .user=${this.user} author=${this.routeParams.groups.id}></beaker-status-feed>
          </main>
        </div>
      `
      case 'profileFollowing': return html`
        <beaker-following-view loadable .user=${this.user} author=${this.routeParams.groups.id}></beaker-following-view>
      `
      case 'profileFollowers': return html`
        <beaker-followers-view loadable .user=${this.user} author=${this.routeParams.groups.id}></beaker-followers-view>
      `
      case 'profileStatus': return html`
        <beaker-status-view loadable .user=${this.user} author=${this.routeParams.groups.id} filename=${this.routeParams.groups.filename}></beaker-status-view>
      `
      case 'profileComment': return html`
        <div class="layout wide left-col">
          <aside>
            <beaker-profile-aside loadable .user=${this.user} id=${this.routeParams.groups.id}></beaker-profile-header>
          </aside>
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