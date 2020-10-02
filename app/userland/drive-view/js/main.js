import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import { SitesListPopup } from 'beaker://app-stdlib/js/com/popups/sites-list.js'
import { NewPostPopup } from 'beaker://app-stdlib/js/com/popups/new-post.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { shorten, pluralize, isSameOrigin } from 'beaker://app-stdlib/js/strings.js'
import { typeToQuery } from 'beaker://app-stdlib/js/records.js'
import css from '../css/main.css.js'
import './views/files-list.js'
import './views/index-md.js'
import 'beaker://app-stdlib/js/com/record-feed.js'
import 'beaker://app-stdlib/js/com/record-thread.js'

const NAV_ITEMS = [
  {type: undefined, path: '/', icon: 'fas fa-home', label: 'Home'},
  {type: 'bookmark', path: '/bookmarks/', icon: 'far fa-star', label: 'Bookmarks'},
  {type: 'blogpost', path: '/blog/', icon: 'fas fa-blog', label: 'Blog'},
  {type: 'microblogpost', path: '/microblog/', icon: 'far fa-comment-alt', label: 'Posts'},
  {type: 'comment', path: '/comments/', icon: 'far fa-comments', label: 'Comments'},
  {type: 'subscription', path: '/subscriptions/', icon: 'fas fa-rss', label: 'Subscriptions'}
]
const PATH_QUERIES = {
  bookmarks: [typeToQuery('bookmark')],
  blogposts: [typeToQuery('blogpost')],
  microblogposts: [typeToQuery('microblogpost')],
  comments: [typeToQuery('comment')],
  subscriptions: [typeToQuery('subscription')]
}
PATH_QUERIES.all = Object.values(PATH_QUERIES).flat()

class DriveViewApp extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.drive = beaker.hyperdrive.drive(location)
    this.info = undefined
    this.profile = undefined
    this.contentCounts = undefined
    this.showFilesOverride = false
    this.hasThumb = true
    this.load()
  }

  async load () {
    if (location.origin.startsWith('hyper://private')) {
      this.classList.add('private')
    }

    let addressBook = await beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json').catch(e => undefined)
    let {profile} = await beaker.index.gql(`
      query Profile($url: String!) {
        profile: site(url: $url) {
          url
          title
        }
      }
    `, {url: addressBook?.profiles?.[0]?.key})
    this.profile = profile
    
    this.fetchSiteInfo().then(info => {
      this.info = info
      console.log(this.info)
      this.requestUpdate()
    })
    this.contentCounts = await beaker.index.gql(`
      query Counts ($origin: String!) {
        bookmark: recordCount(paths: ["${PATH_QUERIES.bookmarks.join('", "')}"] origins: [$origin])
        blogpost: recordCount(paths: ["${PATH_QUERIES.blogposts.join('", "')}"] origins: [$origin])
        microblogpost: recordCount(paths: ["${PATH_QUERIES.microblogposts.join('", "')}"] origins: [$origin])
        comment: recordCount(paths: ["${PATH_QUERIES.comments.join('", "')}"] origins: [$origin])
        subscription: recordCount(paths: ["${PATH_QUERIES.subscriptions.join('", "')}"] origins: [$origin])
      }
    `, {origin: window.location.origin})
    this.requestUpdate()
  }


  async fetchSiteInfo () {
    let res = await beaker.index.gql(`
      query Site($url: String!, $profileUrl: String!) {
        site(url: $url) {
          url
          title
          description
          writable
          isSubscribedByUser: backlinkCount(
            origins: [$profileUrl]
            paths: ["/subscriptions/*.goto"]
          )
          isSubscriberToUser: recordCount(
            links: {origin: $profileUrl}
            paths: ["/subscriptions/*.goto"]
          )
          subCount: backlinkCount(paths: ["/subscriptions/*.goto"] indexes: ["local", "network"])
        }
      }
    `, {
      url: window.location.origin,
      profileUrl: this.profile.url
    }).catch(e => undefined)
    return res?.site
  }

  get isDirectory () {
    return location.pathname.endsWith('/')
  }

  get isSubscriber () {
    return this.info.isSubscribedByUser === 1
  }

  get isSystem () {
    return location.origin.startsWith('hyper://private') || isSameOrigin(location.origin, this.profile?.url)
  }

  render () {
    if (!this.info) return html``
    const navItem = ({type, path, icon, label}) => {
      let count = 0
      if (type) {
        count = this.contentCounts?.[type]
        if (!count) return ''
      }
      if (count > 0) label += ` (${count})`
      return html`
        <a class="nav-item ${location.pathname === path ? 'current' : ''}" href=${path} data-tooltip=${label}>
          <span class="fa-fw ${icon}"></span>
          <span class="label">${label}</span>
        </a>
      `
    }
    const showSubs = !(isSameOrigin(this.info.url, 'hyper://private') || this.info.writable && !this.info?.subCount)
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="content">
        <beaker-index-md .info=${this.info}></beaker-index-md>
        ${this.isDirectory ? this.renderDirectory() : this.renderFile()}
      </div>
      <div class="sidebar ${this.hasThumb ? '' : 'no-thumb'}">
        <div class="sidebar-inner">
          <div class="thumb">
            <a href="/">
              ${location.origin.startsWith('hyper://private') ? html`
                <span class="sysicon"><span class="fas fa-lock"></span></span>
              ` : html`
                <img src="/thumb" @error=${this.onThumbFail}>
              `}
            </a>
          </div>
          <div class="title"><a href="/">${this.info.title || 'Untitled'}</a></div>
          <div class="description">${this.info.description || ''}</div>
          ${!showSubs ? '' : html`
            <div class="known-subscribers">
              ${this.info?.isSubscriberToUser ? html`
                <span class="subscribed-to-you"><span>Subscribed to you</span></span>
              `: ''}
              <a
                href="#"
                class="tooltip-left"
                @click=${this.onClickShowSubscribers}
              >
                <strong>${this.info?.subCount}</strong>
                ${pluralize(this.info?.subCount || 0, 'subscriber')}
              </a>
            </div>
          `}
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
      <div class="btns">
        ${isSameOrigin(this.info.url, 'hyper://private') ? '' : this.info.writable ? html`
          <button class="transparent" @click=${this.onEditProperties}>
            Edit Profile
          </button>
          <button class="transparent" @click=${this.onClickMoreTools}>
            <span class="fas fa-caret-down"></span>
          </button>
        ` : html`
          <button class="transparent" @click=${this.onToggleSubscribe}>
            ${this.isSubscriber ? html`
              <span class="fas fa-fw fa-check"></span> Subscribed
            ` : html`
              <span class="fas fa-fw fa-rss"></span> Subscribe
            `}
          </button>
        `}
      </div>
    `
  }

  renderDirectory () {
    if (this.showFilesOverride) {
      return html`<beaker-files-list .info=${this.info}></beaker-files-list>`
    }
    switch (location.pathname) {
      case '/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.all}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
          ></beaker-record-feed>
        `
      case '/microblog/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.microblogposts}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
          ></beaker-record-feed>
        `
      case '/blog/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.blogposts}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
          ></beaker-record-feed>
        `
      case '/bookmarks/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.bookmarks}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
          ></beaker-record-feed>
        `
      case '/comments/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.comments}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
          ></beaker-record-feed>
        `
      case '/subscriptions/':
        return html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES.subscriptions}
            .sources=${[this.info.url]}
            show-date-titles
            date-title-range="month"
            no-merge
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
            @load-state-updated=${this.onFeedLoadStateUpdated}
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
        set-document-title
        profile-url=${this.profile?.url}
      ></beaker-record-thread>
    `
  }

  // events
  // =


  onFeedLoadStateUpdated (e) {
    if (e.detail?.isEmpty === true) {
      // on empty feeds, fallback to the files list view
      this.showFilesOverride = true
      this.requestUpdate()
    }
  }


  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile.url
    })
  }

  async onToggleSubscribe () {
    if (this.info.isSubscribedByUser) {
      this.info.isSubscribedByUser = 0
      this.info.subCount--
      this.requestUpdate()
      await beaker.subscriptions.remove(this.info.url)
    } else {
      this.info.isSubscribedByUser = 1
      this.info.subCount++
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: this.info.url,
        title: this.info.title,
        site: this.profile.url
      })
    }
    this.info = await this.fetchSiteInfo()
  }

  async onEditProperties () {
    await beaker.shell.drivePropertiesDialog(this.info.url)
    location.reload()
  }

  async onClickMoreTools (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    const items = [
      {icon: 'far fa-comment', label: 'New Post', click: this.onClickNewPost}
    ]
    if (!this.isSystem) {
      items.unshift('-')
      items.unshift(this.isSubscriber
        ? {icon: 'fas fa-times', label: 'Unsubscribe', click: this.onToggleSubscribe}
        : {icon: 'fas fa-rss', label: 'Subscribe', click: this.onToggleSubscribe},
      )
    }
    contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      noBorders: true,
      right: true,
      style: `padding: 6px 0`,
      items
    })
  }

  async onClickNewPost () {
    try {
      await NewPostPopup.create({driveUrl: location.origin})
    } catch (e) {
      // ignore, user probably cancelled
      console.log(e)
      return
    }
    window.location.reload()
  }

  async onClickShowSubscribers (e) {
    e.preventDefault()
    e.stopPropagation()
    let sites = /* dont await */ beaker.subscriptions.listNetworkFor(this.info.url).then(subs => subs.map(s => s.site))
    SitesListPopup.create('Subscribers', sites)
  }

  onThumbFail (e) {
    this.hasThumb = false
    this.requestUpdate()
  }
}

customElements.define('beaker-drive-view', DriveViewApp)
document.body.append(new DriveViewApp())