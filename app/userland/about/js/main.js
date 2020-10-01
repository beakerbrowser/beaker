import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { typeToQuery } from 'beaker://app-stdlib/js/records.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import css from '../css/main.css.js'
import './com/site-info.js'
import 'beaker://app-stdlib/js/com/record-feed.js'

const NAV_ITEMS = [
  {type: undefined, id: 'home', icon: 'fas fa-home', label: 'Home'},
  {type: 'bookmark', id: 'bookmarks', icon: 'far fa-star', label: 'Bookmarks'},
  {type: 'blogpost', id: 'blogposts', icon: 'fas fa-blog', label: 'Blog'},
  {type: 'page', id: 'pages', icon: 'far fa-file', label: 'Pages'},
  {type: 'microblogpost', id: 'posts', icon: 'far fa-comment-alt', label: 'Posts'},
  {type: 'comment', id: 'comments', icon: 'far fa-comments', label: 'Comments'},
  {type: 'subscription', id: 'subscriptions', icon: 'fas fa-rss', label: 'Subscriptions'}
]
const PATH_QUERIES = {
  bookmarks: [typeToQuery('bookmark')],
  blogposts: [typeToQuery('blogpost')],
  pages: [typeToQuery('page')],
  microblogposts: [typeToQuery('microblogpost')],
  comments: [typeToQuery('comment')],
  subscriptions: [typeToQuery('subscription')]
}
PATH_QUERIES.home = Object.values(PATH_QUERIES).flat()

class AboutApp extends LitElement {
  static get styles () {
    return [css]
  }

  static get properties () {
    return {
      isLoading: {type: Boolean},
      currentView: {type: String}
    }
  }

  constructor () {
    super()
    beaker.panes.setAttachable()
    this.isLoading = true
    this.currentView = 'home'
    this.url = undefined
    this.profile = undefined
    this.siteInfo = undefined
    this.contentCounts = undefined

    var ignoreNextAttachEvent = false
    beaker.panes.addEventListener('pane-attached', e => {
      if (!ignoreNextAttachEvent) {
        this.load(beaker.panes.getAttachedPane().url)
      }
      ignoreNextAttachEvent = false
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      this.load(e.detail.url)
    })
    
    window.addEventListener('click', e => {
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor && anchor.getAttribute('href')) {
        e.stopPropagation()
        e.preventDefault()
        if (e.metaKey || anchor.getAttribute('target') === '_blank') {
          window.open(anchor.getAttribute('href'))
        } else {
          let pane = beaker.panes.getAttachedPane()
          if (pane) {
            beaker.panes.navigate(pane.id, anchor.getAttribute('href'))
          } else {
            window.location = anchor.getAttribute('href')
          }
        }
        return
      }
    })

    ;(async () => {
      var url = new URLSearchParams(location.search).get('url')
      var attachedPane = await beaker.panes.attachToLastActivePane()
      ignoreNextAttachEvent = !!attachedPane
      if (url) {
        this.load(url)
      } else {
        if (attachedPane) this.load(attachedPane.url)
      }
    })()
  }

  async load (url) {
    if (!this.profile) {
      this.profile = await beaker.browser.getProfile()
    }

    url = (new URL(url)).origin
    if (this.url === url) return

    // TEMP just give up if not hyper
    if (!url.startsWith('hyper://')) {
      return window.close()
    }

    this.isLoading = true
    this.url = url
    this.siteInfo = undefined
    this.requestUpdate()

    if (url) {
      if (this.url.startsWith('hyper://')) {
        this.siteInfo = await this.fetchSiteInfo()
        console.log(this.siteInfo)
      } 
      
      if (!this.siteInfo) {
        this.siteInfo = {
          url: (new URL(this.url)).origin,
          title: (new URL(this.url)).hostname
        }
      }
      this.requestUpdate()
      
      this.contentCounts = await beaker.index.gql(`
        bookmark: recordCount(paths: ["${PATH_QUERIES.bookmarks.join('", "')}"] origins: ["${this.siteInfo.url}"])
        blogpost: recordCount(paths: ["${PATH_QUERIES.blogposts.join('", "')}"] origins: ["${this.siteInfo.url}"])
        page: recordCount(paths: ["${PATH_QUERIES.pages.join('", "')}"] origins: ["${this.siteInfo.url}"])
        microblogpost: recordCount(paths: ["${PATH_QUERIES.microblogposts.join('", "')}"] origins: ["${this.siteInfo.url}"])
        comment: recordCount(paths: ["${PATH_QUERIES.comments.join('", "')}"] origins: ["${this.siteInfo.url}"])
        subscription: recordCount(paths: ["${PATH_QUERIES.subscriptions.join('", "')}"] origins: ["${this.siteInfo.url}"])
      `)
    }
    
    this.isLoading = false
    this.requestUpdate()
  }

  async fetchSiteInfo () {
    let {site} = await beaker.index.gql(`
      site(url: "${this.url}") {
        url
        title
        description
        writable
        isSubscribedByUser: backlinksCount(
          origins: ["${this.profile.url}"]
          paths: ["/subscriptions/*.goto"]
        )
        isSubscriberToUser: recordCount(
          links: {origin: "${this.profile.url}"}
          paths: ["/subscriptions/*.goto"]
        )
        subscribers: backlinks(paths: ["/subscriptions/*.goto"]) {
          site {
            url
            title
            description
            writable
          }
        }
      }
    `).catch(e => undefined)
     return site
  }

  setView (view) {
    this.currentView = view
  }

  get hasContent () {
    if (!this.contentCounts) return false
    return this.contentCounts && Object.values(this.contentCounts).reduce((acc, v) => acc + v, 0) > 0
  }

  // rendering
  // =

  render () {
    if (!this.url) {
      return html``
    }
    const navItem = ({type, id, icon, label}) => {
      let count = this.contentCounts?.[type]
      if (type && !count) return ''
      else if (count > 0) label += ` (${count})`
      return html`
        <a
          class="nav-item ${this.currentView === id ? 'current' : ''}"
          @click=${() => this.setView(id)}
          data-tooltip=${label}
        >
          <span class="fa-fw ${icon}"></span>
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <header>
        <site-info
          url=${this.url}
          .siteInfo=${this.siteInfo}
          profile-url=${this.profile.url}
          @toggle-subscribe=${this.onToggleSubscribe}
          @edit-properties=${this.onEditProperties}
        ></site-info>
        ${this.hasContent ? html`
          <div class="nav ${this.url.startsWith('hyper://private') ? 'private' : ''}">
            ${NAV_ITEMS.map(navItem)}
          </div>
        ` : ''}
      </header>
      <div class="feed">
        ${this.renderLoading()}
        ${this.siteInfo ? html`
          <beaker-record-feed
            .pathQuery=${PATH_QUERIES[this.currentView]}
            .sources=${[this.siteInfo.url]}
            show-date-titles
            ?no-merge=${this.currentView === 'subscriptions'}
            limit="50"
            empty-message="This site hasn't posted anything yet."
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        ` : ''}
      </div>
    `
  }

  renderLoading () {
    if (this.isLoading) {
      return html`<div class="loading"><span class="spinner"></span> Loading...</div>`
    }
  }

  // events
  // =

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile.url
    })
  }

  async onToggleSubscribe (e) {
    if (!this.siteInfo.graph) return // cant operate :|
    if (this.siteInfo.graph.user.isSubscriber) {
      this.siteInfo.graph.user.isSubscriber = false
      this.siteInfo.graph.counts.network--
      this.siteInfo.graph.counts.local--
      this.requestUpdate()
      await beaker.subscriptions.remove(this.siteInfo.url)
    } else {
      this.siteInfo.graph.user.isSubscriber = true
      this.siteInfo.graph.counts.network++
      this.siteInfo.graph.counts.local++
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: this.siteInfo.url,
        title: this.siteInfo.title,
        site: this.profile.url
      })
    }
    this.siteInfo = await this.fetchSiteInfo()
  }

  async onEditProperties () {
    await beaker.shell.drivePropertiesDialog(this.siteInfo.url)
    location.reload()
  }
}

customElements.define('about-app', AboutApp)
