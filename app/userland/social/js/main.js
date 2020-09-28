import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import { typeToQuery } from 'beaker://app-stdlib/js/records.js'
import * as QP from './lib/qp.js'
import * as addressBook from './lib/address-book.js'
import * as sourcesDropdown from './com/sources-dropdown.js'
import css from '../css/main.css.js'
import './com/indexer-state.js'
import 'beaker://app-stdlib/js/com/post-composer.js'
import 'beaker://app-stdlib/js/com/record-feed.js'
import 'beaker://app-stdlib/js/com/sites-list.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

const INTRO_STEPS = {SUBSCRIBE: 0, GET_LISTED: 1, MAKE_POST: 2}
const PATH_QUERIES = {
  comments: [typeToQuery('comment')],
  posts: [typeToQuery('microblogpost')],
  search: {
    discussion: [
      typeToQuery('microblogpost'),
      typeToQuery('comment')
    ]
  },
  all: [
    typeToQuery('microblogpost'),
    typeToQuery('comment'),
    typeToQuery('subscription')
  ]
}

class SocialApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      suggestedSites: {type: Array},
      isComposingPost: {type: Boolean},
      searchQuery: {type: String},
      sourceOptions: {type: Array},
      currentSource: {type: String},
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
    this.suggestedSites = undefined
    this.isComposingPost = false
    this.searchQuery = ''
    this.sourceOptions = []
    this.currentSource = 'all'
    this.isEmpty = false
    this.listingSelfState = undefined
    this.isProfileListedInBeakerNetwork = undefined

    this.configFromQP()
    this.load().then(() => {
      this.loadSuggestions()
    })

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
    this.currentSource = QP.getParam('source', 'all')
    
    if (this.searchQuery) {
      this.updateComplete.then(() => {
        this.shadowRoot.querySelector('.search-ctrl input').value = this.searchQuery
      })
    }
  }

  async load ({clearCurrent} = {clearCurrent: false}) {
    let sourceOptions
    if (this.shadowRoot.querySelector('beaker-record-feed')) {
      this.shadowRoot.querySelector('beaker-record-feed').load({clearCurrent})
    }
    ;[this.profile, sourceOptions] = await Promise.all([
      addressBook.loadProfile(),
      beaker.subscriptions.list()
    ])
    this.sourceOptions = [{href: 'hyper://private/', title: 'My Private Data'}, {href: this.profile.url, title: this.profile.title}].concat(sourceOptions)
    this.isProfileListedInBeakerNetwork = await beaker.browser.isProfileListedInBeakerNetwork()
    if (this.isProfileListedInBeakerNetwork) {
      this.listingSelfState = 'done'
      this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, true)
    }
  }

  async loadSuggestions () {
    let allSubscriptions = await beaker.index.query({
      path: '/subscriptions/*.goto',
      limit: 100,
      sort: 'crtime',
      reverse: true
    })
    var currentSubs = new Set(this.sourceOptions.map(source => (new URL(source.href)).origin))
    var candidates = allSubscriptions.filter(sub => !currentSubs.has((new URL(sub.metadata.href)).origin))
    var suggestedSiteUrls = candidates.reduce((acc, candidate) => {
      var url = candidate.metadata.href
      if (!acc.includes(url)) acc.push(url)
      return acc
    }, [])
    suggestedSiteUrls.sort(() => Math.random() - 0.5)
    var suggestedSites = await Promise.all(suggestedSiteUrls.map(beaker.index.getSite))
    if (suggestedSites.length < 12) {
      let moreSites = await beaker.index.listSites({index: 'network', limit: 12})
      moreSites = moreSites.filter(site => !currentSubs.has(site.url))

      // HACK
      // the network index for listSites() currently doesn't pull from index.json
      // (which is stupid but it's the most efficient option atm)
      // so we need to call getSite()
      // -prf
      moreSites = await Promise.all(moreSites.map(s => beaker.index.getSite(s.url)))
      suggestedSites = suggestedSites.concat(moreSites)
    }
    suggestedSites.sort(() => Math.random() - 0.5)
    this.suggestedSites = suggestedSites.slice(0, 12)
  }

  get sources () {
    if (this.currentSource === 'all') {
      return undefined // all data in the index this.sourceOptions.map(source => source.url)
    }
    if (this.currentSource === 'mine') {
      return ['hyper://private/', this.profile?.url]
    }
    if (this.currentSource === 'others') {
      return this.sourceOptions.slice(2).map(source => source.href)
    }
    return [this.currentSource]
  }

  get isLoading () {
    let queryViewEls = Array.from(this.shadowRoot.querySelectorAll('beaker-record-feed'))
    return !!queryViewEls.find(el => el.isLoading)
  }

  get isIntroActive () {
    if (this._isIntroActive === false) {
      return this._isIntroActive
    }
    var isActive = !this.isIntroStepCompleted(0) || !this.isIntroStepCompleted(1) || !this.isIntroStepCompleted(2)
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
    return html`
      <div class="sidebar">
        <div class="sticky">
          <div class="search-ctrl">
            ${this.isLoading ? html`<span class="spinner"></span>` : html`<span class="fas fa-search"></span>`}
            ${!!this.searchQuery ? html`
              <a class="clear-search" @click=${this.onClickClearSearch}><span class="fas fa-times"></span></a>
            ` : ''}
            <input @keyup=${this.onKeyupSearch} placeholder="Search" value=${this.searchQuery}>
          </div>
          ${this.suggestedSites?.length > 0 ? html`
            <section class="suggested-sites">
              <h3>Suggested Sites</h3>
              ${repeat(this.suggestedSites.slice(0, 3), site => html`
                <div class="site">
                  <div class="title">
                    <a href=${site.url} title=${site.title} target="_blank">${site.title}</a>
                  </div>
                  ${site.graph ? html`
                    <div class="subscribers">
                      ${site.graph.counts.network} ${pluralize(site.graph.counts.network, 'subscriber')}
                    </div>
                  ` : ''}
                  ${site.subscribed ? html`
                    <button class="transparent" disabled><span class="fas fa-check"></span> Subscribed</button>
                  ` : html`
                    <button @click=${e => this.onClickSuggestedSubscribe(e, site)}>Subscribe</button>
                  `}
                </div>
              `)}
            </section>
          ` : ''}
          <beaker-indexer-state></beaker-indexer-state>
        </div>
      </div>
    `
  }

  renderCurrentView () {
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
                .sources=${this.sources}
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
            ${this.renderIntro()}
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
            ${this.isEmpty && !this.isIntroActive ? this.renderEmptyMessage() : ''}
            <beaker-record-feed
              .pathQuery=${PATH_QUERIES.all}
              .sources=${this.sources}
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

  renderSourcesCtrl () {
    var label = ''
    switch (this.currentSource) {
      case 'all': label = 'All'; break
      case 'mine': label = 'My Data'; break
      case 'others': label = 'Others\' Data'; break
      default: label = this.sourceOptions.find(opt => opt.href === this.currentSource)?.title
    }
    return html`
      <a class="search-mod-btn" @click=${this.onClickSources}>
        <span class="label">Source: </span>${label} <span class="fas fa-fw fa-caret-down"></span>
      </a>
    `
  }

  renderIntro () {
    if (!this.isIntroActive) {
      return ''
    }
    return html`
      <div class="intro">
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
                ${repeat(this.suggestedSites.slice(0, 6), site => html`
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
                    ${site.graph ? html`
                      <div class="subscribers">
                        ${site.graph.counts.network} ${pluralize(site.graph.counts.network, 'subscriber')}
                      </div>
                    ` : ''}
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
        <section>
          <a class="icon">
            <span class="${this.isIntroStepCompleted(2) ? 'fas fa-check-circle' : 'far fa-circle'}"></span>
          </a>
          <div>
            <h4>
              3. Make your first post
              ${!this.isIntroStepCompleted(2) ? html`<a href="#" @click=${e => this.onClickSkipIntroStep(e, 2)}><small>(skip)</small></a>` : ''}
            </h4>
            ${!this.isIntroStepCompleted(2) ? html`
              <div class="btn-group">
                <button class="transparent block" @click=${this.onClickNewPost}>
                  <i class="far fa-fw fa-comment-alt"></i> New Post
                </button>
                <button class="transparent block" @click=${e => this.onClickEditBookmark(undefined)}>
                  <i class="far fa-fw fa-star"></i> New Bookmark
                </button>
                <button class="transparent block" @click=${e => this.onClickNewPage()}>
                  <i class="far fa-fw fa-file"></i> New Page
                </button>
                <button class="transparent block" @click=${e => this.onClickNewBlogpost()}>
                  <i class="fas fa-fw fa-blog"></i> New Blogpost
                </button>
              </div>
            ` : ''}
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

  onClickSources (e) {
    e.preventDefault()
    e.stopPropagation()
    const fixedClick = (v) => {
      this.currentSource = v
      QP.setParams({source: v})
      this.load()
    }
    const items = this.sourceOptions.slice(1).map(({href, title}) => ({
      icon: false,
      label: title,
      click: () => {
        this.currentSource = href
        QP.setParams({source: href})
        this.load()
      }
    }))
    var rect = e.currentTarget.getClientRects()[0]
    sourcesDropdown.create({x: (rect.left + rect.right) / 2, y: rect.bottom, items, fixedClick})
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
    if (this.isIntroActive) {
      this.setIntroStepCompleted(INTRO_STEPS.MAKE_POST, true)
    }
    this.load()
  }

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    if (this.isIntroActive) {
      this.setIntroStepCompleted(INTRO_STEPS.MAKE_POST, true)
    }
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
