import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { pluralize, getOrigin } from 'beaker://app-stdlib/js/strings.js'
import { typeToQuery } from 'beaker://app-stdlib/js/records.js'
import * as QP from './lib/qp.js'
import * as addressBook from './lib/address-book.js'
import css from '../css/main.css.js'
import './com/indexer-state.js'
import 'beaker://app-stdlib/js/com/post-composer.js'
import 'beaker://app-stdlib/js/com/record-feed.js'
import 'beaker://app-stdlib/js/com/sites-list.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

const INTRO_STEPS = {SUBSCRIBE: 0, GET_LISTED: 1}
const PATH_QUERIES = {
  search: {
    discussion: [
      typeToQuery('microblogpost'),
      typeToQuery('comment')
    ]
  },
  all: [typeToQuery('microblogpost')],
  comments: [typeToQuery('comment')],
  notifications: [
    typeToQuery('microblogpost'),
    typeToQuery('comment'),
    typeToQuery('subscription'),
    typeToQuery('vote')
  ]
}

class SocialApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      unreadNotificationCount: {type: Number},
      suggestedSites: {type: Array},
      isComposingPost: {type: Boolean},
      searchQuery: {type: String},
      isEmpty: {type: Boolean},
      listingSelfState: {type: String},
      isProfileListedInBeakerNetwork: {type: Boolean}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.unreadNotificationCount = 0
    this.suggestedSites = undefined
    this.isComposingPost = false
    this.searchQuery = ''
    this.isEmpty = false
    this.listingSelfState = undefined
    this.isProfileListedInBeakerNetwork = undefined

    this.configFromQP()
    this.load().then(() => {
      this.loadSuggestions()
    })

    setInterval(this.checkNotifications.bind(this), 5e3)

    window.addEventListener('popstate', (event) => {
      this.configFromQP()
    })

    window.addEventListener('focus', e => {
      if (!this.searchQuery) {
        this.load()
      }
    })
  }

  configFromQP () {
    this.searchQuery = QP.getParam('q', '')
    
    if (this.searchQuery) {
      this.updateComplete.then(() => {
        this.shadowRoot.querySelector('.search-ctrl input').value = this.searchQuery
      })
    }
  }

  async load ({clearCurrent} = {clearCurrent: false}) {
    this.profile = await addressBook.loadProfile()
    this.checkNotifications()
    if (this.shadowRoot.querySelector('beaker-record-feed')) {
      this.shadowRoot.querySelector('beaker-record-feed').load({clearCurrent})
    }
    if (location.pathname === '/notifications') {
      setTimeout(() => beaker.index.clearNotifications(), 5e3)
    }
    this.isProfileListedInBeakerNetwork = await beaker.browser.isProfileListedInBeakerNetwork()
    if (this.isProfileListedInBeakerNetwork) {
      this.listingSelfState = 'done'
      this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, true)
    }
  }

  async checkNotifications () {
    this.unreadNotificationCount = await beaker.index.count({
      index: ['local', 'network'],
      notification: {unread: true}
    })
    if (this.unreadNotificationCount > 0) {
      document.title = `Beaker Social (${this.unreadNotificationCount})`
    } else {
      document.title = `Beaker Social`
    }
  }

  async loadSuggestions () {
    const getSite = async (url) => {
      let {site} = await beaker.index.gql(`
        site(url: "${url}") {
          url
          title
          description
          subCount: backlinkCount(paths: ["/subscriptions/*.goto"] indexes: ["local", "network"])
        }
      `)
      return site
    }
    let {allSubscriptions} = await beaker.index.gql(`
      allSubscriptions: records(paths: ["/subscriptions/*.goto"] limit: 100 sort: crtime reverse: true) {
        metadata
      }
    `)
    var currentSubs = new Set((await beaker.subscriptions.list()).map(source => (getOrigin(source.href))))
    currentSubs.add(getOrigin(this.profile.url))
    var candidates = allSubscriptions.filter(sub => !currentSubs.has((getOrigin(sub.metadata.href))))
    var suggestedSiteUrls = candidates.reduce((acc, candidate) => {
      var url = candidate.metadata.href
      if (!acc.includes(url)) acc.push(url)
      return acc
    }, [])
    suggestedSiteUrls.sort(() => Math.random() - 0.5)
    var suggestedSites = await Promise.all(suggestedSiteUrls.slice(0, 12).map(url => getSite(url).catch(e => undefined)))
    suggestedSites = suggestedSites.filter(site => site && site.title)
    if (suggestedSites.length < 12) {
      let {moreSites} = await beaker.index.gql(`
        moreSites: sites(indexes: ["network"] limit: 12) { url }
      `)
      moreSites = moreSites.filter(site => !currentSubs.has(site.url))

      // HACK
      // the network index for listSites() currently doesn't pull from index.json
      // (which is stupid but it's the most efficient option atm)
      // so we need to call getSite()
      // -prf
      moreSites = await Promise.all(moreSites.map(s => getSite(s.url).catch(e => undefined)))
      suggestedSites = suggestedSites.concat(moreSites).filter(Boolean)
    }
    suggestedSites.sort(() => Math.random() - 0.5)
    this.suggestedSites = suggestedSites.slice(0, 12)
  }

  get isLoading () {
    let queryViewEls = Array.from(this.shadowRoot.querySelectorAll('beaker-record-feed'))
    return !!queryViewEls.find(el => el.isLoading)
  }

  get isIntroActive () {
    if (this._isIntroActive === false) {
      return this._isIntroActive
    }
    var isActive = !this.isIntroStepCompleted(0) || !this.isIntroStepCompleted(1)
    if (!isActive) this._isIntroActive = false // cache
    return isActive
  }

  isIntroStepCompleted (step) {
    return localStorage.getItem(`introStepCompleted:${step}`) == '1'
  }

  setIntroStepCompleted (step, v) {
    this._isIntroActive = undefined
    localStorage.setItem(`introStepCompleted:${step}`, v ? '1' : undefined)
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <main>
        ${this.renderCurrentView()}
      </main>
    `
  }

  renderRightSidebar () {
    const navItem = (path, label) => html`
      <a class=${location.pathname === path ? 'current' : ''} href=${path}>${label}</a>
    `
    let n = this.unreadNotificationCount > 0 ? html` <sup>${this.unreadNotificationCount}</sup>` : ''
    return html`
      <div class="sidebar">
        <div class="sticky">
          <div class="search-ctrl">
            <span class="fas fa-search"></span>
            ${!!this.searchQuery ? html`
              <a class="clear-search" @click=${this.onClickClearSearch}><span class="fas fa-times"></span></a>
            ` : ''}
            <input @keyup=${this.onKeyupSearch} placeholder="Search" value=${this.searchQuery}>
          </div>
          <section class="nav">
            ${navItem('/', html`<span class="fas fa-fw fa-stream"></span> Feed`)}
            ${navItem('/comments', html`<span class="far fa-fw fa-comments"></span> Comments`)}
            ${navItem('/notifications', html`<span class="far fa-fw fa-bell"></span> Notifications${n}`)}
          </section>
          ${this.suggestedSites?.length > 0 ? html`
            <section class="suggested-sites">
              <h3>Suggested Sites</h3>
              ${repeat(this.suggestedSites.slice(0, 3), site => html`
                <div class="site">
                  <div class="title">
                    <a href=${site.url} title=${site.title} target="_blank">${site.title}</a>
                  </div>
                  <div class="subscribers">
                    ${site.subCount} ${pluralize(site.subCount, 'subscriber')}
                  </div>
                  ${site.subscribed ? html`
                    <button class="transparent" disabled><span class="fas fa-check"></span> Subscribed</button>
                  ` : html`
                    <button @click=${e => this.onClickSuggestedSubscribe(e, site)}>Subscribe</button>
                  `}
                </div>
              `)}
            </section>
          ` : ''}
          <beaker-indexer-state @site-first-indexed=${e => this.load()}></beaker-indexer-state>
        </div>
      </div>
    `
  }

  renderCurrentView () {
    if (!this.profile) return ''
    var hasSearchQuery = !!this.searchQuery
    if (hasSearchQuery) {
      const searchLink = (label, url) => {
        return html`
          <a class="search-engine" title=${label} href=${url} data-tooltip=${label}>
            <img src="beaker://assets/search-engines/${label.toLowerCase()}.png">
          </a>
        `
      }
      return html`
        <div class="twocol">
          <div>
            <div class="alternatives">
              Try your search on:
              ${searchLink('DuckDuckGo', `https://duckduckgo.com?q=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('Google', `https://google.com/search?q=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('Twitter', `https://twitter.com/search?q=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('Reddit', `https://reddit.com/search?q=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('GitHub', `https://github.com/search?q=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(this.searchQuery)}`)}
              ${searchLink('Wikipedia', `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.searchQuery)}`)}
            </div>
              ${this.renderSites('all')}
              <h3 class="feed-heading">Discussion</h3>
              <beaker-record-feed
                .pathQuery=${PATH_QUERIES.search.discussion}
                .filter=${this.searchQuery}
                limit="50"
                empty-message="No results found${this.searchQuery ? ` for "${this.searchQuery}"` : ''}"
                @load-state-updated=${this.onFeedLoadStateUpdated}
                @view-thread=${this.onViewThread}
                @publish-reply=${this.onPublishReply}
                profile-url=${this.profile ? this.profile.url : ''}
              ></beaker-record-feed>
          </div>
          ${this.renderRightSidebar()}
        </div>
      `
    } else {
      return html`
        <div class="twocol">
          <div>
            <div class="composer">
              <img class="thumb" src="asset:thumb:${this.profile?.url}">
              ${this.isComposingPost ? html`
                <beaker-post-composer
                  drive-url=${this.profile?.url || ''}
                  @publish=${this.onPublishPost}
                  @cancel=${this.onCancelPost}
                ></beaker-post-composer>
              ` : html`
                <div class="compose-post-prompt" @click=${this.onComposePost}>
                  What's new?
                </div>
              `}
            </div>
            ${this.renderIntro()}
            ${this.isEmpty && !this.isIntroActive ? this.renderEmptyMessage() : ''}
            <beaker-record-feed
              .pathQuery=${PATH_QUERIES[location.pathname.slice(1) || 'all']}
              ?notifications=${location.pathname === '/notifications'}
              limit="50"
              @load-state-updated=${this.onFeedLoadStateUpdated}
              @view-thread=${this.onViewThread}
              @publish-reply=${this.onPublishReply}
              profile-url=${this.profile ? this.profile.url : ''}
            ></beaker-record-feed>
          </div>
          ${this.renderRightSidebar()}
        </div>
      `
    }
  }

  renderSites (id) {
    var listing = ({
      all: 'all',
      'my-sites': 'mine',
      subscriptions: 'subscribed',
      subscribers: 'subscribers'
    })[id]
    var title = ({
      all: 'Sites',
      'my-sites': 'My sites',
      subscriptions: 'My subscriptions',
      subscribers: 'Subscribed to me'
    })[id]
    var allSearch = !!this.searchQuery && id === 'all'
    return html`
      ${title ? html`<h3 class="feed-heading">${title}</h3>` : ''}
      <beaker-sites-list
        listing=${listing}
        filter=${this.searchQuery || ''}
        .limit=${allSearch ? 6 : undefined}
        empty-message="No results found${this.searchQuery ? ` for "${this.searchQuery}"` : ''}"
        .profile=${this.profile}
      ></beaker-sites-list>
    `
  }

  renderEmptyMessage () {
    if (this.searchQuery) {
      return html`
        <div class="empty">
            <div class="fas fa-search"></div>
          <div>No results found for "${this.searchQuery}"</div>
        </div>
      `
    }
    return html`
      <div class="empty">
        <div class="fas fa-stream"></div>
        <div>Subscribe to sites to see what's new</div>
      </div>
    `
  }

  renderIntro () {
    if (!this.isIntroActive) {
      return ''
    }
    return html`
      <div class="intro">
        <div class="explainer">
          <h3>Welcome to Beaker Social!</h3>
          <p>Share posts on your feed and stay connected with friends.</p>
          <p>(You know. Like Twitter.)</p>
        </div>
        <section>
          <a class="icon">
            <span class="${this.isIntroStepCompleted(0) ? 'fas fa-check-circle' : 'far fa-circle'}"></span>
          </a>
          <div>
            <h4>
              1. Subscribe to sites to see what's happening
              ${!this.isIntroStepCompleted(0) ? html`<a href="#" @click=${e => this.onClickSkipIntroStep(e, 0)}><small>(skip)</small></a>` : ''}
            </h4>
            ${!this.suggestedSites ? html`<div><span class="spinner"></span></div>` : ''}
            ${this.suggestedSites?.length > 0 ? html`
              <div class="suggested-sites">
                ${repeat(this.suggestedSites.slice(0, 4), site => html`
                  <div class="site">
                    <div class="title">
                      <a href=${site.url} title=${site.title} target="_blank">${site.title}</a>
                    </div>
                    <div class="description">
                      ${site.description}
                    </div>
                    ${site.subscribed ? html`
                      <button class="transparent" disabled><span class="fas fa-check"></span> Subscribed</button>
                    ` : html`
                      <button @click=${e => this.onClickSuggestedSubscribe(e, site)}>Subscribe</button>
                    `}
                    <div class="subscribers">
                      ${site.subCount} ${pluralize(site.subCount, 'subscriber')}
                    </div>
                  </div>
                `)}
              </div>
            ` : ''}
          </div>
        </section>
        <section>
          <a class="icon">
            <span class="${this.isIntroStepCompleted(1) ? 'fas fa-check-circle' : 'far fa-circle'}"></span>
          </a>
          <div>
            <h4>
              2. Get listed
              ${!this.isIntroStepCompleted(1) ? html`<a href="#" @click=${e => this.onClickSkipIntroStep(e, 1)}><small>(skip)</small></a>` : ''}
            </h4>
            <p>Add your <a href=${this.profile?.url} target="_blank">personal site</a> to the Beaker Network so people can find you.</p>
            <p>
              ${this.listingSelfState === 'no' ? html`
                <button class="primary" disabled>List my site</button>
                <button class="transparent" @click=${this.onClickMaybeListMyself}>
                  <span class="fas fa-fw fa-check"></span> No thanks, I don't want to be listed
                </button>
              ` : this.listingSelfState === 'attempting' ? html`
                <button class="primary" disabled><span class="spinner"></span></button>
                <button class="transparent" disabled>No thanks, I don't want to be listed</button>
              ` : this.listingSelfState === 'done' ? html`
                <button class="transparent" disabled><span class="fas fa-fw fa-check"></span> Site listed</button>
              ` : html`
                <button class="primary" @click=${this.onClickListMyself}>List my site</button>
                <button class="transparent" @click=${this.onClickDontListMyself}>No thanks, I don't want to be listed</button>
              `}
            </p>
          </div>
        </section>
      </div>
    `
  }

  // events
  // =

  onFeedLoadStateUpdated (e) {
    if (typeof e.detail?.isEmpty !== 'undefined') {
      this.isEmpty = e.detail.isEmpty
    }
    this.requestUpdate()
  }

  onClickSkipIntroStep (e, step) {
    this.setIntroStepCompleted(step, true)
  }

  onKeyupSearch (e) {
    if (e.code === 'Enter') {
      window.location = `/search?q=${e.currentTarget.value.toLowerCase()}`
    }
  }

  onClickClearSearch (e) {
    window.location = '/'
  }

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile.url
    })
  }

  onComposePost (e) {
    this.isComposingPost = true
  }

  onCancelPost (e) {
    this.isComposingPost = false
  }

  onPublishPost (e) {
    this.isComposingPost = false
    toast.create('Post published', '', 10e3)
    this.load()
  }

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    this.load()
  }

  async onClickSuggestedSubscribe (e, site) {
    e.preventDefault()
    site.subscribed = true
    this.requestUpdate()
    await beaker.subscriptions.add({
      href: site.url,
      title: site.title,
      site: this.profile.url
    })
    // wait 1s then replace/remove the suggestion
    setTimeout(() => {
      this.suggestedSites = this.suggestedSites.filter(s => s !== site)
    }, 1e3)
    if (this.isIntroActive) {
      this.setIntroStepCompleted(INTRO_STEPS.SUBSCRIBE, true)
    }
  }

  async onClickListMyself (e) {
    this.listingSelfState = 'attempting'
    await beaker.browser.addProfileToBeakerNetwork()
    this.isProfileListedInBeakerNetwork = true
    this.listingSelfState = 'done'
    this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, true)
  }

  async onClickDontListMyself (e) {
    this.listingSelfState = 'no'
    this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, true)
  }

  async onClickMaybeListMyself (e) {
    this.listingSelfState = undefined
    this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, false)
  }
}

customElements.define('social-app', SocialApp)
