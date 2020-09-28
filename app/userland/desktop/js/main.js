import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { ViewThreadPopup } from 'beaker://app-stdlib/js/com/popups/view-thread.js'
import { EditBookmarkPopup } from 'beaker://app-stdlib/js/com/popups/edit-bookmark.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import { typeToQuery } from 'beaker://app-stdlib/js/records.js'
import * as QP from './lib/qp.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'
import * as sourcesDropdown from './com/sources-dropdown.js'
import css from '../css/main.css.js'
import 'beaker://app-stdlib/js/com/record-feed.js'
import 'beaker://app-stdlib/js/com/sites-list.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

const VERSION_ID = (major, minor, patch, pre) => major * 1e9 + minor * 1e6 + patch * 1e3 + pre
const CURRENT_VERSION = VERSION_ID(1, 0, 0, 7)
const RELEASES = [
  { label: '1.0 - Beta 7', url: 'https://beakerbrowser.com/2020/07/15/beaker-1-0-beta-7.html' },
  { label: '1.0 - Beta 6', url: 'https://beakerbrowser.com/2020/07/10/beaker-1-0-beta-6.html' },
  { label: '1.0 - Beta 5', url: 'https://beakerbrowser.com/2020/06/19/beaker-1-0-beta-5.html' },
  { label: '1.0 - Beta 4', url: 'https://beakerbrowser.com/2020/06/04/beaker-1-0-beta-4.html' },
  { label: '1.0 - Beta 3', url: 'https://beakerbrowser.com/2020/05/28/beaker-1-0-beta-3.html' },
  { label: '1.0 - Beta 2', url: 'https://beakerbrowser.com/2020/05/20/beaker-1-0-beta-2.html' },
  { label: '1.0 - Beta 1', url: 'https://beakerbrowser.com/2020/05/14/beaker-1-0-beta.html' }
]
const INTRO_STEPS = {SUBSCRIBE: 0, GET_LISTED: 1, MAKE_POST: 2}
const DOCS_URL = 'https://docs.beakerbrowser.com'
const PATH_QUERIES = {
  blogposts: [typeToQuery('blogpost')],
  bookmarks: [typeToQuery('bookmark')],
  discussion: [typeToQuery('microblogpost'), typeToQuery('comment')],
  all: [
    typeToQuery('blogpost'),
    typeToQuery('bookmark'),
    typeToQuery('page')
  ],
  feed: [typeToQuery('bookmark'), typeToQuery('blogpost')]
}

class DesktopApp extends LitElement {
  static get properties () {
    return {
      currentNav: {type: String},
      profile: {type: Object},
      pins: {type: Array},
      searchQuery: {type: String},
      sourceOptions: {type: Array},
      currentSource: {type: String},
      legacyArchives: {type: Array},
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
    this.currentNav = 'all'
    this.profile = undefined
    this.pins = []
    this.searchQuery = ''
    this.sourceOptions = []
    this.currentSource = 'all'
    this.legacyArchives = []
    this.isEmpty = false
    this.listingSelfState = undefined
    this.isProfileListedInBeakerNetwork = undefined

    this.configFromQP()
    this.load()

    if (!localStorage.lastDismissedReleaseNotice) {
      localStorage.lastDismissedReleaseNotice = CURRENT_VERSION
    }

    window.addEventListener('popstate', (event) => {
      this.configFromQP()
    })

    window.addEventListener('focus', e => {
      if (!this.searchQuery) {
        this.load()
      }
    })
    this.addEventListener('update-pins', async (e) => {
      this.pins = await desktop.load()
    })
  }

  configFromQP () {
    this.currentNav = QP.getParam('view', 'all')
    this.searchQuery = QP.getParam('q', undefined)
    this.currentSource = QP.getParam('source', 'all')
    
    if (this.searchQuery) {
      this.updateComplete.then(() => {
        this.shadowRoot.querySelector('.search-ctrl input').value = this.searchQuery
      })
    }
  }

  async load ({clearCurrent} = {clearCurrent: false}) {
    console.log({currentNav: this.currentNav, searchQuery: this.searchQuery, currentSource: this.currentSource})

    let sourceOptions
    if (this.shadowRoot.querySelector('beaker-record-feed')) {
      this.shadowRoot.querySelector('beaker-record-feed').load({clearCurrent})
    }
    ;[this.profile, this.pins, sourceOptions] = await Promise.all([
      addressBook.loadProfile(),
      desktop.load(),
      beaker.subscriptions.list()
    ])
    this.sourceOptions = [{href: 'hyper://private/', title: 'My Private Data'}, {href: this.profile.url, title: this.profile.title}].concat(sourceOptions)
    console.log(this.pins)
    this.isProfileListedInBeakerNetwork = await beaker.browser.isProfileListedInBeakerNetwork()
    if (this.isProfileListedInBeakerNetwork) {
      this.listingSelfState = 'done'
      this.setIntroStepCompleted(INTRO_STEPS.GET_LISTED, true)
    }
    this.legacyArchives = await beaker.datLegacy.list()
  }

  get currentNavAsPathQuery () {
    return PATH_QUERIES[this.currentNav]
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

  get publicSources () {
    return this.sourceOptions.slice(1).map(source => source.href)
  }

  async setCurrentNav (nav) {
    this.currentNav = nav
    QP.setParams({view: nav})
    await this.requestUpdate()
    this.shadowRoot.scrollTop = 0
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
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div id="topright">
          ${this.renderSettingsBtn()}
        </div>
        <header>
          <div class="search-ctrl">
            <span class="fas fa-search"></span>
            ${!!this.searchQuery ? html`
              <a class="clear-search" @click=${this.onClickClearSearch}><span class="fas fa-times"></span></a>
            ` : ''}
            <input @keyup=${this.onKeyupSearch} placeholder="Search privately" value=${this.searchQuery}>
          </div>
          ${this.renderContentNav()}
        </header>
        ${this.renderReleaseNotice()}
        <main>
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
                <beaker-record-feed
                  .pathQuery=${this.currentNavAsPathQuery}
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
            <div class="sidebar">
              ${this.profile ? html`
                <beaker-sites-list
                  listing="all"
                  filter=${this.searchQuery || ''}
                  empty-message="No results found${this.searchQuery ? ` for "${this.searchQuery}"` : ''}"
                  .profile=${this.profile}
                ></beaker-sites-list>
              ` : ''}
            </div>
          </div>
        </main>
      `
    } else {
      const appLink = (url, label) => html`
        <a href=${url} title=${label}><img src="asset:favicon:${url}"> ${label}</a>
      `
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div id="topright">
          ${this.renderSettingsBtn()}
        </div>
        ${this.renderReleaseNotice()}
        <main>
          <div class="onecol">
            <div class="search-ctrl big">
              <span class="fas fa-search"></span>
              ${!!this.searchQuery ? html`
                <a class="clear-search" @click=${this.onClickClearSearch}><span class="fas fa-times"></span></a>
              ` : ''}
              <input @keyup=${this.onKeyupSearch} placeholder="Search privately">
            </div>
            <div class="apps">
              ${appLink('beaker://social', 'Social')}
              ${appLink('beaker://uplink', 'Uplink')}
              ${appLink('beaker://reader', 'Reader')}
              ${appLink('beaker://library', 'Library')}
              ${appLink('beaker://history', 'History')}
              ${appLink('beaker://settings', 'Settings')}
            </div>
            ${this.renderPins()}
            <div>
              ${this.currentNav === 'legacy-archives' ? html`
                ${this.renderLegacyArchivesView()}
              ` : html`
                ${this.renderIntro()}
                <beaker-record-feed
                  .pathQuery=${PATH_QUERIES.feed}
                  title="Recent Activity"
                  force-render-mode="action"
                  record-class="small"
                  .sources=${this.publicSources}
                  limit="50"
                  @load-state-updated=${this.onFeedLoadStateUpdated}
                  @view-thread=${this.onViewThread}
                  @publish-reply=${this.onPublishReply}
                  profile-url=${this.profile ? this.profile.url : ''}
                ></beaker-record-feed>
              `}
            </div>
          </div>
        </main>
      `
    }
  }

  renderContentNav () {
    const navItem = (id, label) => html`
      <a
        class="content-nav-item ${id === this.currentNav ? 'current' : ''}"
        @click=${e => this.setCurrentNav(id)}
      >${label}</a>
    `
    return html`
      <div class="content-nav">
        ${navItem('all', html`<span class="fas fa-fw fa-search"></span> All`)}
        ${navItem('bookmarks', html`<span class="far fa-fw fa-star"></span> <span class="label">Bookmarks</span>`)}
        ${navItem('blogposts', html`<span class="fas fa-fw fa-blog"></span> <span class="label">Blogposts</span>`)}
        ${navItem('discussion', html`<span class="far fa-fw fa-comments"></span> <span class="label">Discussion</span>`)}
        <div class="sep"></div>
        ${this.renderSourcesCtrl()}
      </div>
    `
  }

  renderRightSidebar () {
    // TODO
    return html`
      <div class="sidebar">
        <div class="sticky">
          ${this.renderLegacyArchivesNotice()}
          <section class="quick-links">
            <h3>Beaker</h3>
            <div>
              <a href="#" @click=${this.onClickReleaseNotes}>
                <span>Release Notes</span>
              </a>
            </div>
            <div>
              <a href="https://docs.beakerbrowser.com/">
                <span>Help</span>
              </a>
            </div>
          </section>
        </div>
      </div>
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
    let thing = this.currentNav
    if (this.currentNav === 'all') thing = 'what\'s new'
    var icon = ({
      bookmarks: 'far fa-star',
      blogposts: 'fas fa-blog',
      posts: 'far fa-comment-alt',
      comments: 'far fa-comments',
      sites: 'fas fa-sitemap'
    })[this.currentNav] || 'fas fa-stream'
    return html`
      <div class="empty">
          <div class=${icon}></div>
        <div>Subscribe to sites to see ${thing}</div>
      </div>
    `
  }

  renderSettingsBtn () {
    return html`
      <a href="beaker://settings/" title="Settings"><span class="fas fa-fw fa-cog"></span></a>
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
      <a class="sources-ctrl" @click=${this.onClickSources}>
        <span class="label">Source: </span>${label} <span class="fas fa-fw fa-caret-down"></span>
      </a>
    `
  }

  renderReleaseNotice () {
    if (localStorage.lastDismissedReleaseNotice >= CURRENT_VERSION) {
      return ''
    }
    return html`
      <div class="release-notice">
        <a href=${RELEASES[0].url} class="view-release-notes" @click=${this.onCloseReleaseNotes} target="_blank">
          <span class="fas fa-fw fa-rocket"></span>
          <strong>Welcome to Beaker ${RELEASES[0].label}!</strong>
          Click here to see what's new.
        </a>
        <a class="close" @click=${this.onCloseReleaseNotes}><span class="fas fa-times"></span></a>
      </div>
    `
  }

  renderPins () {
    if (this.hidePins) return ''
    var pins = this.pins || []
    return html`
      <div class="pins">
        ${repeat(pins, pin => pin.href, pin => html`
          <a
            class="pin"
            href=${pin.href}
            @contextmenu=${e => this.onContextmenuPin(e, pin)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot-180:' + pin.href} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${pin.title}</div>
            </div>
          </a>
        `)}
        <a class="pin add" @click=${e => this.onClickNewBookmark(e, true)}>
          <span class="fas fa-fw fa-plus thumb"></span>
        </a>
      </div>
    `
  }

  renderIntro () {
    if (!this.isIntroActive) {
      return ''
    }
    return html`
      <div class="intro">
        <section>
          <a class="icon" href="${DOCS_URL}/getting-started-with-beaker" target="_blank">
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
          <a class="icon" href="${DOCS_URL}/getting-started-with-beaker" target="_blank">
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
          <a class="icon" href="${DOCS_URL}/getting-started-with-beaker" target="_blank">
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

  renderLegacyArchivesNotice () {
    if (this.legacyArchives.length === 0) {
      return ''
    }
    return html`
      <section class="legacy-archives notice">
        <h3>Legacy Dats</h3>
        <p>You have ${this.legacyArchives.length} legacy Dat ${pluralize(this.legacyArchives.length, 'archive')} which can be converted to Hyperdrive.</p>
        <div class="archives">
          ${this.legacyArchives.slice(0, 3).map(archive => html`
            <div class="archive">
              <a href="dat://${archive.key}" title=${archive.title} target="_blank">${archive.title || archive.key}</a>
              <div class="btn-group">
                <button @click=${e => {window.location = `dat://${archive.key}`}}>View</button>
                <button @click=${e => this.onClickRemoveLegacyArchive(e, archive)}>Remove</button>
              </div>
            </div>
          `)}
          ${this.legacyArchives.length > 3 ? html`
            <a @click=${e => { this.currentNav = 'legacy-archives' }}>View All &raquo;</a>
          ` : ''}
        </div>
      </section>
    `
  }

  renderLegacyArchivesView () {
    if (this.legacyArchives.length === 0) {
      return ''
    }
    return html`
      <section class="legacy-archives view">
        <h3>Legacy Dats</h3>
        <p>You have ${this.legacyArchives.length} legacy Dat ${pluralize(this.legacyArchives.length, 'archive')} which can be converted to Hyperdrive.</p>
        <div class="archives">
          ${this.legacyArchives.map(archive => html`
            <div class="archive">
              <a href="dat://${archive.key}" title=${archive.title} target="_blank">${archive.title || archive.key}</a>
              <div class="btn-group">
                <button @click=${e => {window.location = `dat://${archive.key}`}}>View</button>
                <button @click=${e => this.onClickRemoveLegacyArchive(e, archive)}>Remove</button>
              </div>
            </div>
          `)}
        </div>
      </section>
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

  onClickReleaseNotes (e) {
    e.preventDefault()
    e.stopPropagation()
    const items = RELEASES.slice().reverse().map(({label, url}) => ({
      icon: false,
      label: `Beaker ${label}`,
      click: () => window.open(url)
    }))
    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left - 5,
      y: rect.bottom + 15,
      noBorders: true,
      roomy: true,
      top: true,
      right: true,
      items,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'
    })
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

  onCloseReleaseNotes (e) {
    localStorage.lastDismissedReleaseNotice = CURRENT_VERSION
    this.requestUpdate()
  }

  onKeyupSearch (e) {
    if (e.code === 'Enter') {
      this.searchQuery = e.currentTarget.value.toLowerCase()
      QP.setParams({q: this.searchQuery})
    }
  }

  onClickClearSearch (e) {
    this.searchQuery = ''
    this.currentNav = 'all'
    QP.setParams({q: false, view: 'all'})
    this.shadowRoot.querySelector('.search-ctrl input').value = ''
  }

  async onClickNewBookmark (e, pinned) {
    try {
      await desktop.createLink(await AddLinkPopup.create(), pinned)
      toast.create('Link added', '', 10e3)
      if (this.isIntroActive) {
        this.setIntroStepCompleted(INTRO_STEPS.MAKE_POST, true)
      }
    } catch (e) {
      // ignore, user probably cancelled
      console.log(e)
      return
    }
    this.isEmpty = false
    this.load({clearCurrent: true})
  }

  async onContextmenuPin (e, pin) {
    e.preventDefault()
    const items = [
      {label: 'Open Link in New Tab', click: () => window.open(pin.href)},
      {label: 'Copy Link Address', click: () => writeToClipboard(pin.href)},
      (pin.isFixed) ? undefined : {type: 'separator'},
      (pin.isFixed) ? undefined : {label: 'Edit', click: () => this.onClickEditBookmark(pin)},
      (pin.isFixed) ? undefined : {label: 'Unpin', click: () => this.onClickUnpinBookmark(pin)}
    ].filter(Boolean)
    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }
    var choice = await beaker.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
  }

  async onClickEditBookmark (file) {
    try {
      await EditBookmarkPopup.create(file)
      this.load()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  async onClickUnpinBookmark (bookmark) {
    await beaker.bookmarks.add(Object.assign({}, bookmark, {pinned: false}))
    toast.create('Bookmark unpinned', '', 10e3)
    this.load()
  }

  onViewThread (e) {
    ViewThreadPopup.create({
      recordUrl: e.detail.record.url,
      profileUrl: this.profile.url
    })
  }

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    if (this.isIntroActive) {
      this.setIntroStepCompleted(INTRO_STEPS.MAKE_POST, true)
    }
    this.load()
  }

  async onClickRemoveLegacyArchive (e, archive) {
    e.preventDefault()
    if (!confirm('Are you sure?')) return
    await beaker.datLegacy.remove(archive.key)
    this.legacyArchives.splice(this.legacyArchives.indexOf(archive), 1)
    toast.create('Archive removed')
    this.requestUpdate()
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

customElements.define('desktop-app', DesktopApp)
