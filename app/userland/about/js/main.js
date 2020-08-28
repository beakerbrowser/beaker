import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import css from '../css/main.css.js'
import './com/site-info.js'
import 'beaker://app-stdlib/js/com/record-feed.js'

const NAV_ITEMS = [
  {index: undefined, id: 'home', icon: 'fas fa-home', label: 'Home'},
  {index: 'beaker/index/bookmarks', id: 'bookmarks', icon: 'far fa-star', label: 'Bookmarks'},
  {index: 'beaker/index/blogposts', id: 'blogposts', icon: 'fas fa-blog', label: 'Blog'},
  {index: 'beaker/index/pages', id: 'pages', icon: 'far fa-file', label: 'Pages'},
  {index: 'beaker/index/microblogposts', id: 'posts', icon: 'far fa-comment-alt', label: 'Posts'},
  {index: 'beaker/index/comments', id: 'comments', icon: 'far fa-comments', label: 'Comments'},
  {index: 'beaker/index/subscriptions', id: 'subscriptions', icon: 'fas fa-rss', label: 'Subscriptions'}
]

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
    this.subscribers = []

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
      this.profile.url = `hyper://${this.profile.key}`
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
        this.siteInfo = await beaker.hyperdrive.getInfo(this.url).catch(e => undefined)
      } else {
        this.siteInfo = {
          url: (new URL(this.url)).origin,
          title: (new URL(this.url)).hostname
        }
      }
      this.requestUpdate()
      let [subscribers, counts] = await Promise.all([
        beaker.subscriptions.listNetworkFor(this.siteInfo.url),
        beaker.index.countRecords({
          filter: {site: this.siteInfo.url}
        })
      ])
      this.subscribers = subscribers
      this.contentCounts = counts
    }
    
    this.isLoading = false
    this.requestUpdate()
  }

  setView (view) {
    this.currentView = view
  }

  get currentViewAsIndex () {
    switch (this.currentView) {
      case 'blogposts': return ['beaker/index/blogposts']
      case 'bookmarks': return ['beaker/index/bookmarks']
      case 'comments': return ['beaker/index/comments']
      case 'pages': return ['beaker/index/pages']
      case 'posts': return ['beaker/index/microblogposts']
      case 'subscriptions': return ['beaker/index/subscriptions']
      default:
        return [
          'beaker/index/blogposts',
          'beaker/index/bookmarks',
          'beaker/index/microblogposts',
          'beaker/index/comments',
          'beaker/index/pages',
          'beaker/index/subscriptions'
        ]
    }
  }

  // rendering
  // =

  render () {
    if (!this.url) {
      return html``
    }
    const navItem = ({index, id, icon, label}) => {
      let count = this.contentCounts?.[index]
      if (index && !count) return ''
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
      ${this.renderLoading()}
      <header>
        <site-info
          url=${this.url}
          .siteInfo=${this.siteInfo}
          .subscribers=${this.subscribers}
          profile-url=${this.profile.url}
          @toggle-subscribe=${this.onToggleSubscribe}
          @edit-properties=${this.onEditProperties}
        ></site-info>
        <div class="nav ${this.url.startsWith('hyper://private') ? 'private' : ''}">
          ${NAV_ITEMS.map(navItem)}
        </div>
      </header>
      <div class="feed">
        ${this.siteInfo ? html`
          <beaker-record-feed
            .index=${this.currentViewAsIndex}
            .sources=${[this.siteInfo.url]}
            show-date-titles
            ?no-merge=${this.currentView === 'subscriptions'}
            limit="50"
            profile-url=${this.profile.url}
            @view-thread=${this.onViewThread}
          ></beaker-record-feed>
        ` : ''}
      </div>
    `
  }

  renderLoading () {
    return ''
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
    const isSubscribed = this.subscribers.find(s => s.site.url === this.profile.url)
    if (isSubscribed) {
      this.subscribers = this.subscribers.filter(s => s.site.url !== this.profile.url)
      this.requestUpdate()
      await beaker.subscriptions.remove(this.siteInfo.url)
    } else {
      this.subscribers = this.subscribers.concat([{site: this.profile}])
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: this.siteInfo.url,
        title: this.siteInfo.title,
        site: this.profile.url
      })
    }
    this.subscribers = await beaker.subscriptions.listNetworkFor(this.siteInfo.url)
  }

  async onEditProperties () {
    await beaker.shell.drivePropertiesDialog(this.siteInfo.url)
    location.reload()
  }
}

customElements.define('about-app', AboutApp)
