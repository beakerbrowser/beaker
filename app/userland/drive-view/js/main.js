import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import { SitesListPopup } from 'beaker://app-stdlib/js/com/popups/sites-list.js'
import { shorten, pluralize, isSameOrigin } from 'beaker://app-stdlib/js/strings.js'
import css from '../css/main.css.js'
import './views/files-list.js'
import './views/index-md.js'
import 'beaker://app-stdlib/js/com/record-feed.js'
import 'beaker://app-stdlib/js/com/record-thread.js'

const NAV_ITEMS = [
  {path: '/', icon: 'fas fa-home', label: 'Home'},
  {path: '/bookmarks/', icon: 'far fa-star', label: 'Bookmarks'},
  {path: '/blog/', icon: 'fas fa-blog', label: 'Blog'},
  {path: '/pages/', icon: 'far fa-file', label: 'Pages'},
  {path: '/microblog/', icon: 'far fa-comment-alt', label: 'Posts'},
  {path: '/comments/', icon: 'far fa-comments', label: 'Comments'},
  {path: '/subscriptions/', icon: 'fas fa-rss', label: 'Subscriptions'}
]

class DriveViewApp extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.drive = beaker.hyperdrive.drive(location)
    this.info = undefined
    this.profile = undefined
    this.subscribers = []
    this.load()
  }

  async load () {
    let addressBook = await beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json').catch(e => undefined)
    this.profile = await beaker.database.getSite(addressBook?.profiles?.[0]?.key)

    beaker.database.getSite(window.location.origin).then(info => {
      this.info = info
      console.log(this.info)
      this.requestUpdate()
    })
    beaker.subscriptions.listNetworkFor(window.location.origin).then(subs => {
      this.subscribers = subs
      this.requestUpdate()
    })
  }

  get isDirectory () {
    return location.pathname.endsWith('/')
  }

  get isSubscribed () {
    return this.subscribers.find(s => s.site.url === this.profile.url)
  }

  render () {
    if (!this.info) return html``
    const navItem = ({path, icon, label}) => html`
      <a class="nav-item ${location.pathname === path ? 'current' : ''}" href=${path} data-tooltip=${label}>
        <span class="fa-fw ${icon}"></span>
        <span class="label">${label}</span>
      </a>
    `
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="content">
        <beaker-index-md .info=${this.info}></beaker-index-md>
        ${this.isDirectory ? this.renderDirectory() : this.renderFile()}
      </div>
      <div class="sidebar">
          <div class="header">
            <div class="thumb">
              <a href="/"><img src="/thumb" @error=${e => {e.currentTarget.style.display = 'none'}}></a>
            </div>
            <div class="info">
              <div class="title"><a href="/">${this.info.title}</a></div>
              <div class="description">${this.info.description || ''}</div>
              ${isSameOrigin(this.info.origin, 'hyper://private') ? '' : html`
                <div class="known-subscribers">
                  <a
                    href="#" 
                    @click=${this.onClickShowSubscribers}
                    data-tooltip=${shorten(this.subscribers?.map(r => r.site.title || 'Untitled').join(', ') || '', 100)}
                  >
                    <strong>${this.subscribers?.length}</strong>
                    ${pluralize(this.subscribers?.length || 0, 'subscriber')} you know
                  </a>
                </div>
              `}
            </div>
            ${this.renderHeaderButtons()}
          </div>
          <div class="nav">
            ${NAV_ITEMS.map(navItem)}
          </div>
      </div>
    `
  }

  renderHeaderButtons () {
    return html`
      ${isSameOrigin(this.info.origin, 'hyper://private') ? '' : this.info.writable ? html`
        <button class="transparent" @click=${this.onEditProperties}>
          Edit Profile
        </button>
      ` : html`
        <button class="transparent" @click=${this.onToggleSubscribe}>
          ${this.isSubscribed ? html`
            <span class="fas fa-fw fa-check"></span> Subscribed
          ` : html`
            <span class="fas fa-fw fa-rss"></span> Subscribe
          `}
        </button>
      `}
    `
  }

  renderDirectory () {
    switch (location.pathname) {
      case '/':
        return html`
          <beaker-record-feed
            .sources=${[this.info.origin]}
            show-date-titles
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/microblog/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/microblogposts']}
            .sources=${[this.info.origin]}
            show-date-titles
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/blog/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/blogposts']}
            .sources=${[this.info.origin]}
            date-title-range="month"
            show-date-titles
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/pages/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/pages']}
            .sources=${[this.info.origin]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/bookmarks/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/bookmarks']}
            .sources=${[this.info.origin]}
            show-date-titles
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/comments/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/comments']}
            .sources=${[this.info.origin]}
            show-date-titles
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      case '/subscriptions/':
        return html`
          <beaker-record-feed
            .index=${['beaker/index/subscriptions']}
            .sources=${[this.info.origin]}
            show-date-titles
            no-merge
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        `
      default:
        return html`<beaker-files-list .info=${this.info}></beaker-files-list>`
    }
  }

  renderFile () {
    return html`
      <beaker-record-thread
        record-url=${window.location.toString()}
        full-page
        profile-url=${this.profile?.url}
      ></beaker-record-thread>
    `
  }

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile.url
    })
  }

  async onToggleSubscribe (e) {
    if (this.isSubscribed) {
      this.subscribers = this.subscribers.filter(s => s.site.url !== this.profile.url)
      this.requestUpdate()
      await beaker.subscriptions.remove(this.info.origin)
    } else {
      this.subscribers = this.subscribers.concat([{site: this.profile}])
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: this.info.origin,
        title: this.info.title,
        site: this.profile.url
      })
    }
    this.subscribers = await beaker.subscriptions.listNetworkFor(this.siteInfo.url)
  }

  async onEditProperties () {
    await beaker.shell.drivePropertiesDialog(this.info.origin)
    location.reload()
  }

  onClickShowSubscribers (e) {
    e.preventDefault()
    e.stopPropagation()
    SitesListPopup.create('Subscribers', this.subscribers.map(s => s.site))
  }
}

customElements.define('beaker-drive-view', DriveViewApp)
document.body.append(new DriveViewApp())