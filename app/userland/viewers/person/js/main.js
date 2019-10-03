import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from 'beaker://app-stdlib/js/query-params.js'
import mainCSS from '../css/main.css.js'
import './com/nav.js'
import 'beaker://app-stdlib/js/com/status/feed.js'
import './views/social-graph.js'
import './views/bookmarks.js'
import './views/dats.js'
import './views/status.js'
import './views/raw-file.js'

const STATUS_PATHNAME_RE = /^\/\.data\/statuses\/(.*\.json)$/i

export class PersonViewer extends LitElement {
  static get properties() {
    return {
      currentView: {type: String},
      user: {type: Object},
      info: {type: Object}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.currentView = undefined
    this.user = undefined
    this.info = undefined
    this.parseLocation()
    this.load()
  }

  parseLocation () {
    if (STATUS_PATHNAME_RE.test(location.pathname)) {
      this.currentView = 'status'
    } else if (location.pathname === '/') {
      this.currentView = QP.getParam('view', 'statuses')
    } else {
      this.currentView = 'unknown'
    }
  }

  async load () {
    if (!this.user) {
      this.user = await uwg.profiles.me()
      await uwg.profiles.index(location.toString())
    }
    var archive = new DatArchive(location)
    this.info = await archive.getInfo()
    this.libraryEntry = (await uwg.library.list({key: this.info.key, isSaved: true}))[0]
    this.isUserFollowing = !!(await uwg.follows.get(this.user.url, this.info.url))
    
    await this.requestUpdate()
    try {
      await this.shadowRoot.querySelector('[the-current-view]').load()
    } catch (e) {
      console.debug(e)
    }
  }

  // rendering
  // =

  render () {
    if (!this.info) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="banner">
        <div class="banner-inner">
          <img src="/thumb">
          <h1>${this.info && this.info.title || 'Anonymous'}</h1>
          <div class="banner-ctrls">
            ${this.info.url === this.user.url ? html`
              <span class="label">This is me</span>
              <div class="btn-group">
                <button class="big" @click=${this.onEditProfile}><span class="fas fa-fw fa-pencil-alt"></span> Edit Profile</button>
              </div>
            ` : this.info.isOwner ? html`
                <span class="label">My user</span>
                <div class="btn-group">
                  ${this.renderFollowBtn()}
                  <button class="big" @click=${this.onEditProfile}><span class="fas fa-fw fa-pencil-alt"></span> Edit Profile</button>
                </div>
              ` : html`
                <div class="btn-group">
                  ${this.renderFollowBtn()}
                  ${this.renderSaveBtn()}
                </div>
              `
          }
          </div>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-inner">
          <div class="description">
            ${this.info && this.info.description}
          </div>
        </div>
      </div>
      <div class="layout">
        <person-viewer-nav
          currentView=${this.currentView}
          @change-view=${this.onChangeView}
        ></person-viewer-nav>
        <main>
          ${this.renderView()}
        </main>
      </div>
    `    
  }

  renderFollowBtn () {
    return html`
      <button class="big ${this.isUserFollowing ? 'primary' : ''}" @click=${this.onToggleFollowing}>
        ${this.isUserFollowing ? html`
          <span class="fas fa-fw fa-check"></span> Following
        ` : html`
          <span class="fas fa-fw fa-rss"></span> Follow
        `}
      </button>
    `
  }

  renderSaveBtn () {
    const isSaved = !!this.libraryEntry
    return html`
      <button class="big ${isSaved ? 'primary' : ''}" @click=${this.onToggleSaved}>
        ${isSaved ? html`
          <span class="fas fa-fw fa-save"></span> Saved
        ` : html`
          <span class="fas fa-fw fa-save"></span> Save
        `}
      </button>
    `
  }

  renderView () {
    switch (this.currentView) {
      case 'bookmarks':
        return html`
          <bookmarks-view
            the-current-view
            .user=${this.user}
            .info=${this.info}
          ></bookmarks-view>
        `
      case 'social-graph':
        return html`
          <social-graph-view
            the-current-view
            .user=${this.user}
            .info=${this.info}
          ></social-graph-view>
        `
      case 'dats':
        return html`
          <dats-view
            the-current-view
            .user=${this.user}
            .info=${this.info}
          ></dats-view>
        `
      case 'status':
        return html`
          <status-view
            the-current-view
            .user=${this.user}
            .info=${this.info}
          ></status-view>
        `
      case 'statuses':
        return html`
          <beaker-status-feed
            the-current-view
            .user=${this.user}
            author=${window.location.origin}
          ></beaker-status-feed>
        `
      default:
        return html`
          <raw-file-view
            the-current-view
            .user=${this.user}
            author=${window.location.origin}
          ></raw-file-view>
        `
    }
  }

  // events
  // =

  onChangeView (e) {
    if (window.location.pathname !== '/') {
      window.location = '/?view=' + e.detail.view
      return
    }
    this.currentView = e.detail.view
    QP.setParams({view: this.currentView})
    this.load()
  }

  async onEditProfile (e) {
    await uwg.profiles.editProfileDialog(this.info.url)
    this.load()
  }

  async onToggleFollowing (e) {
    if (this.isUserFollowing) {
      await uwg.follows.remove(this.info.url)
    } else {
      await uwg.follows.add(this.info.url)
    }
    this.load()
  }

  async onToggleSaved (e) {
    if (this.libraryEntry) {
      await uwg.library.configure(this.info.url, {isSaved: false})
    } else {
      await uwg.library.configure(this.info.url, {isSaved: true})
    }
    this.load()
  }
}

customElements.define('person-viewer', PersonViewer)