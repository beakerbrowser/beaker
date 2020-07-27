import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from 'beaker://library/js/com/edit-bookmark-popup.js'
import { AddContactPopup } from 'beaker://library/js/com/add-contact-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'
import * as sourcesDropdown from './com/sources-dropdown.js'

import 'beaker://library/js/views/drives.js'
import 'beaker://library/js/views/bookmarks.js'
import 'beaker://library/js/views/address-book.js'
import './views/query.js'
import './views/recent.js'
import css from '../css/main.css.js'

const VERSION_ID = (major, minor, patch, pre) => major * 1e9 + minor * 1e6 + patch * 1e3 + pre
const CURRENT_VERSION = VERSION_ID(1, 0, 0, 7)
const RELEASES = [
  { label: '1.0, Beta 7', url: 'https://beakerbrowser.com/2020/07/15/beaker-1-0-beta-7.html' },
  { label: '1.0, Beta 6', url: 'https://beakerbrowser.com/2020/07/10/beaker-1-0-beta-6.html' },
  { label: '1.0, Beta 5', url: 'https://beakerbrowser.com/2020/06/19/beaker-1-0-beta-5.html' },
  { label: '1.0, Beta 4', url: 'https://beakerbrowser.com/2020/06/04/beaker-1-0-beta-4.html' },
  { label: '1.0, Beta 3', url: 'https://beakerbrowser.com/2020/05/28/beaker-1-0-beta-3.html' },
  { label: '1.0, Beta 2', url: 'https://beakerbrowser.com/2020/05/20/beaker-1-0-beta-2.html' },
  { label: '1.0, Beta 1', url: 'https://beakerbrowser.com/2020/05/14/beaker-1-0-beta.html' }
]
const DOCS_URL = 'https://docs.beakerbrowser.com'
const USERLIST_URL = 'https://userlist.beakerbrowser.com'
const BLAHBITY_BLOG_URL = 'hyper://a8e9bd0f4df60ed5246a1b1f53d51a1feaeb1315266f769ac218436f12fda830/'

var cacheBuster = Date.now()

class DesktopApp extends LitElement {
  static get properties () {
    return {
      pins: {type: Array},
      profile: {type: Object},
      currentNav: {type: String},
      searchQuery: {type: String},
      sourceOptions: {type: Array},
      currentSource: {type: String},
      isIntroActive: {type: Boolean},
      legacyArchives: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.pins = []
    this.currentNav = 'all'
    this.searchQuery = ''
    this.sourceOptions = []
    this.currentSource = 'all'
    this.isIntroActive = false
    this.legacyArchives = []
    this.load()
    
    if (!('isIntroHidden' in localStorage)) {
      this.isIntroActive = true
    }

    window.addEventListener('focus', e => {
      this.load()
    })
    this.addEventListener('update-pins', async (e) => {
      this.pins = await desktop.load()
    })
  }

  async load () {
    cacheBuster = Date.now()
    let sourceOptions
    ;[this.profile, this.pins, sourceOptions] = await Promise.all([
      addressBook.loadProfile(),
      desktop.load(),
      beaker.contacts.list()
    ])
    this.sourceOptions = [{url: 'hyper://system/', title: 'My Private Data'}, {url: this.profile.url, title: this.profile.title}].concat(sourceOptions)
    console.log(this.pins)
    this.legacyArchives = await beaker.datLegacy.list()
  }

  get sources () {
    if (this.currentSource === 'all') {
      return this.sourceOptions.map(source => source.url)
    }
    if (this.currentSource === 'mine') {
      return ['hyper://system/', this.profile.url]
    }
    if (this.currentSource === 'others') {
      return this.sourceOptions.slice(2).map(source => source.url)
    }
    return [this.currentSource]
  }

  get isLoading () {
    let queryViewEls = Array.from(this.shadowRoot.querySelectorAll('query-view'))
    return !!queryViewEls.find(el => el.isLoading)
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`<a class="nav-item ${id === this.currentNav ? 'active' : ''}" @click=${e => {this.currentNav = id}}>${label}</a>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${''/*<div id="topleft">
        ${this.profile ? html`
          <a class="profile-ctrl" href=${this.profile.url}>
            <beaker-img-fallbacks>
              <img src="${this.profile.url}/thumb?cache_buster=${cacheBuster}" slot="img1">
              <img src="beaker://assets/default-user-thumb" slot="img2">
            </beaker-img-fallbacks>
            <span>${this.profile.title}</span>
          </a>
        ` : ''}
      </div>*/}
      <div id="topright">
        <a href="beaker://settings/" title="Settings"><span class="fas fa-fw fa-cog"></span></a>
      </div>
      ${this.renderReleaseNotice()}
      <div class="search-ctrl">
        ${this.isLoading ? html`<span class="spinner"></span>` : html`<span class="fas fa-search"></span>`}
        <input @keyup=${this.onKeyupSearch}>
        <button class="rounded primary" @click=${this.onClickNew}>New <span class="fas fa-fw fa-plus"></span></button>
      </div>
      <nav>
        ${navItem('all', html`<span class="fas fa-fw fa-search"></span> All`)}
        ${navItem('bookmarks', html`<span class="far fa-fw fa-star"></span> Bookmarks`)}
        ${navItem('blogposts', html`<span class="fas fa-fw fa-blog"></span> Blog Posts`)}
        ${navItem('pages', html`<span class="far fa-fw fa-file-alt"></span> Pages`)}
        ${navItem('images', html`<span class="far fa-fw fa-images"></span> Images`)}
        <a class="nav-item" @click=${this.onClickNavMore} title="More">
          More...
        </a>
        <hr>
        ${this.renderSourcesCtrl()}
      </nav>
      <main>
        <div class="views">
          ${this.renderCurrentView()}
        </div>
      </main>
      ${this.renderIntro()}
      ${this.renderLegacyArchivesNotice()}
    `
  }

  renderCurrentView () {
    let hasSearchQuery = !!this.searchQuery
    if (this.currentNav === 'all') {
      if (hasSearchQuery) {
        return html`
          <div class="all-view">
            <query-view
              class="subview"
              content-type="images"
              render-mode="simple-grid"
              hide-empty
              limit="5"
              .filter=${this.searchQuery}
              .sources=${this.sources}
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
            <div class="twocol">
              <div>
                <query-view
                  class="subview"
                  content-type="bookmarks"
                  render-mode="row"
                  hide-empty
                  limit="5"
                  .filter=${this.searchQuery}
                  .sources=${this.sources}
                  @load-state-updated=${e => this.requestUpdate()}
                ></query-view>
                <query-view
                  class="subview"
                  content-type="blogposts"
                  render-mode="row"
                  hide-empty
                  limit="5"
                  .filter=${this.searchQuery}
                  .sources=${this.sources}
                  @load-state-updated=${e => this.requestUpdate()}
                ></query-view>
                <query-view
                  class="subview"
                  content-type="pages"
                  render-mode="row"
                  hide-empty
                  limit="5"
                  .filter=${this.searchQuery}
                  .sources=${this.sources}
                  @load-state-updated=${e => this.requestUpdate()}
                ></query-view>
                <query-view
                  class="subview"
                  content-type="comments"
                  render-mode="row"
                  hide-empty
                  limit="5"
                  .filter=${this.searchQuery}
                  .sources=${this.sources}
                  @load-state-updated=${e => this.requestUpdate()}
                ></query-view>
                <query-view
                  class="subview"
                  content-type="microblogposts"
                  render-mode="row"
                  hide-empty
                  limit="5"
                  .filter=${this.searchQuery}
                  .sources=${this.sources}
                  @load-state-updated=${e => this.requestUpdate()}
                ></query-view>
              </div>
            </div>
          </div>
        `
      } else {
        return html`
          <div class="all-view">
            ${this.currentSource !== 'all' ? '' : this.renderPins()}
            <div class="twocol">
              <query-view
                content-type="all"
                show-date-titles
                render-mode="action"
                show-view-more
                .sources=${this.sources}
                limit="50"
                @view-more=${e => {this.currentNav = e.detail.contentType}}
                @load-state-updated=${e => this.requestUpdate()}
              ></query-view>
              <div class="sidebar">
                <section>
                  <h3>Sites</h3>
                  <input placeholder="Filter...">
                  <drives-view simple ?hide-empty=${!!this.searchQuery || this.isIntroActive} .filter=${this.searchQuery}></drives-view>
                </section>
              </div>
            </div>
          </div>
        `
      }
    }
    if (this.currentNav === 'bookmarks') {
      return html`
        <div class="content-view">
          <div class="twocol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="bookmarks"
              render-mode=${hasSearchQuery ? 'row' : 'action'}
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
            ${hasSearchQuery ? '' : html`
              <div class="sidebar">
                <section>
                  <h3>My Private Bookmarks</h3>
                  <input placeholder="Filter...">
                  <query-view
                    content-type="bookmarks"
                    render-mode="simple-list"
                    hide-empty
                    show-view-more
                    .sources=${this.sources.slice(0, 1)}
                    @view-more=${e => {this.currentNav = e.detail.contentType}}
                    @load-state-updated=${e => this.requestUpdate()}
                  ></query-view>
                </section>
              </div>
            `}
          </div>
        </div>
      `
    }
    if (this.currentNav === 'blogposts') {
      return html`
        <div class="content-view">
          <div class="twocol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="blogposts"
              render-mode=${hasSearchQuery ? 'row' : 'action'}
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
            ${hasSearchQuery ? '' : html`
              <div class="sidebar">
                <section>
                  <h3>My Blogposts</h3>
                  <input placeholder="Filter...">
                  <query-view
                    content-type="blogposts"
                    render-mode="simple-list"
                    hide-empty
                    show-view-more
                    .sources=${this.sources.slice(0, 2)}
                    @view-more=${e => {this.currentNav = e.detail.contentType}}
                    @load-state-updated=${e => this.requestUpdate()}
                  ></query-view>
                </section>
              </div>
            `}
          </div>
      </div>
      `
    }
    if (this.currentNav === 'microblogposts') {
      return html`
        <div class="content-view">
          <div class="twocol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="microblogposts"
              render-mode=${hasSearchQuery ? 'row' : 'action'}
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
          </div>
        </div>
      `
    }
    if (this.currentNav === 'comments') {
      return html`
        <div class="content-view">
          <div class="twocol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="comments"
              render-mode=${hasSearchQuery ? 'row' : 'action'}
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
          </div>
        </div>
      `
    }
    if (this.currentNav === 'pages') {
      return html`
        <div class="content-view">
          <div class="twocol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="pages"
              render-mode=${hasSearchQuery ? 'row' : 'action'}
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
            ${hasSearchQuery ? '' : html`
              <div class="sidebar">
                <section>
                  <h3>My Pages</h3>
                  <input placeholder="Filter...">
                  <query-view
                    content-type="pages"
                    render-mode="simple-list"
                    hide-empty
                    show-view-more
                    .sources=${this.sources.slice(0, 2)}
                    @view-more=${e => {this.currentNav = e.detail.contentType}}
                    @load-state-updated=${e => this.requestUpdate()}
                  ></query-view>
                </section>
              </div>
            `}
          </div>
        </div>
      `
    }
    if (this.currentNav === 'images') {
      return html`
        <div class="content-view">
          <div class="onecol">
            <query-view
              ?show-date-titles=${!hasSearchQuery}
              content-type="images"
              render-mode="simple-grid"
              .filter=${this.searchQuery}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
          </div>
        </div>
      `
    }
  }

  renderSourcesCtrl () {
    var label = 'Custom'
    switch (this.currentSource) {
      case 'all': label = 'All Sources'; break
      case 'mine': label = 'My Data'; break
      case 'others': label = 'Others\' Data'; break
      default: label = this.sourceOptions.find(opt => opt.url === this.currentSource).title
    }
    return html`
      <a class="nav-item sources-ctrl" @click=${this.onClickSources}>${label} <span class="fas fa-fw fa-caret-down"></span></a>
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
    var pins = this.pins || []
    return html`
      <div class="pins">
        ${repeat(pins, pin => getHref(pin), pin => html`
          <a
            class="pin"
            href=${getHref(pin)}
            @contextmenu=${e => this.onContextmenuFile(e, pin)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot-180:' + getHref(pin)} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${getTitle(pin)}</div>
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
        <a class="close" @click=${this.onClickCloseIntro}><span class="fas fa-times"></span></a>
        <h3>Welcome to Beaker!</h3>
        <h5>Let's set up your network and get you familiar with Beaker.</h5>
        <div class="col3">
          <div>
            ${this.profile ? html`
              <a href=${this.profile.url} target="_blank">
                <beaker-img-fallbacks class="avatar">
                  <img src="${this.profile.url}/thumb?cache_buster=${cacheBuster}" slot="img1">
                  <img src="beaker://assets/default-user-thumb" slot="img2">
                </beaker-img-fallbacks>
              </a>
            ` : ''}
            <h4>1. Customize your <a href=${this.profile ? this.profile.url : ''} target="_blank">profile</a></h4>
            <p class="help-link">
              <a href="${DOCS_URL}/joining-the-social-network#customizing-your-profile-drive" target="_blank">
                <span class="fas fa-fw fa-info-circle"></span> Get help with this step
              </a>
            </p>
          </div>
          <div>
            <a class="icon" href="${USERLIST_URL}" target="_blank">
              <span class="fas fa-user-plus"></span>
            </a>
            <h4>2. Add yourself to <a href="${USERLIST_URL}" target="_blank">the directory</a></h4>
            <p class="help-link">
              <a href="${DOCS_URL}/joining-the-social-network#finding-other-users" target="_blank">
                <span class="fas fa-fw fa-info-circle"></span> Get help with this step
              </a>
            </p>
          </div>
          <div>
            <a class="icon" href=${BLAHBITY_BLOG_URL} target="_blank">
              <span class="fas fa-stream"></span>
            </a>
            <h4>3. Say hello on <a href=${BLAHBITY_BLOG_URL} target="_blank">your feed</a></h4>
            <p class="help-link">
              <a href="${DOCS_URL}/joining-the-social-network#say-hello-on-your-feed" target="_blank">
                <span class="fas fa-fw fa-info-circle"></span> Get help with this step
              </a>
            </p>
          </div>
        </div>
        <div class="col1">
          <a class="icon" href="${DOCS_URL}/getting-started-with-beaker" target="_blank">
            <span class="fas fa-book"></span>
          </a>
          <h4>4. Read the <a href="${DOCS_URL}/getting-started-with-beaker" target="_blank">Getting Started Guide</a>.</h4>
        </div>
      </div>
    `
  }

  renderLegacyArchivesNotice () {
    if (this.legacyArchives.length === 0) {
      return ''
    }
    return html`
      <div class="legacy-archives-notice">
        <details>
          <summary>You have ${this.legacyArchives.length} legacy Dat ${pluralize(this.legacyArchives.length, 'archive')} which can be converted to Hyperdrive.</summary>
          <div class="archives">
          ${this.legacyArchives.map(archive => html`
            <div class="archive">
              <a href="dat://${archive.key}" title=${archive.title} target="_blank">${archive.title || archive.key}</a>
              <button @click=${e => {window.location = `dat://${archive.key}`}}>View</button>
              <button @click=${e => this.onClickRemoveLegacyArchive(e, archive)}>Remove</button>
            </div>
          `)}
          </div>
        </details>
      </div>
    `
  }

  // events
  // =

  onClickCloseIntro (e) {
    this.isIntroActive = false
    localStorage.isIntroHidden = 1
  }

  onClickReleaseNotes (e) {
    e.preventDefault()
    e.stopPropagation()
    const items = RELEASES.map(({label, url}) => ({
      icon: false,
      label: `Beaker ${label}`,
      click: () => window.open(url)
    }))
    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({x: rect.left, y: rect.bottom + 10, noBorders: true, roomy: true, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }

  onClickSources (e) {
    e.preventDefault()
    e.stopPropagation()
    const fixedClick = (v) => {
      this.currentSource = v
      this.load()
    }
    const items = this.sourceOptions.slice(1).map(({url, title}) => ({
      icon: false,
      label: title,
      click: () => {
        this.currentSource = url
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
    var value = e.currentTarget.value.toLowerCase()
    if (this.keyupSearchTo) {
      clearTimeout(this.keyupSearchTo)
    }
    this.keyupSearchTo = setTimeout(() => {
      this.searchQuery = value
      this.keyupSearchTo = undefined
    }, 500)
  }

  onClickNew (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fa-fw fas fa-sitemap', label: 'New Site', click: this.onClickNewSite.bind(this)},
      {icon: 'fa-fw fas fa-file-upload', label: 'New Site from Folder', click: this.onClickNewSiteFromFolder.bind(this)},
      '-',
      {icon: 'fa-fw far fa-file', label: 'New Page'},
      {icon: 'fa-fw fas fa-blog', label: 'New Blog Post'},
      {icon: 'fa-fw far fa-star', label: 'New Bookmark'}
    ]
    contextMenu.create({
      x: (rect.left + rect.right) / 2,
      y: rect.bottom + 10,
      center: true,
      noBorders: true,
      roomy: true,
      style: `padding: 8px 0`,
      rounded: true,
      items,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'
    })
  }

  onClickNavMore (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fas fa-stream', label: 'Micro Blog Posts', click: () => { this.currentNav = 'microblogposts' }},
      {icon: 'far fa-comments', label: 'Comments', click: () => { this.currentNav = 'comments' }}
    ]
    contextMenu.create({
      x: (rect.left + rect.right) / 2,
      y: rect.bottom,
      center: true,
      noBorders: true,
      roomy: true,
      rounded: true,
      style: `padding: 6px 0`,
      items,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'
    })
  }

  async onClickNewSite (e) {
    var drive = await beaker.hyperdrive.createDrive()
    beaker.browser.openUrl(drive.url, {setActive: true, addedPaneUrls: ['beaker://editor/']})
  }

  async onClickNewSiteFromFolder (e) {
    var folder = await beaker.browser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    var drive = await beaker.hyperdrive.createDrive({
      title: folder[0].split('/').pop(),
      prompt: false
    })
    await beaker.hyperdrive.importFromFilesystem({src: folder[0], dst: drive.url})
    window.open(drive.url)
  }

  async onClickNewBookmark (e, pinned) {
    try {
      await desktop.createLink(await AddLinkPopup.create(), pinned)
      toast.create('Link added', '', 10e3)
    } catch (e) {
      // ignore, user probably cancelled
      console.log(e)
      return
    }
    this.load()
  }

  async onClickNewContact (e) {
    try {
      await AddContactPopup.create()
      toast.create('Contact added', '', 10e3)
    } catch (e) {
      // ignore
      console.log(e)
    }
    this.load()
  }

  async onContextmenuFile (e, file) {
    e.preventDefault()
    const items = [
      {label: 'Open Link in New Tab', click: () => window.open(getHref(file))},
      {label: 'Copy Link Address', click: () => writeToClipboard(getHref(file))},
      (file.isFixed) ? undefined : {type: 'separator'},
      (file.isFixed) ? undefined : {label: 'Edit', click: () => this.onClickEdit(file)},
      (file.isFixed) ? undefined : {label: 'Unpin', click: () => this.onClickRemove(file)}
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

  async onClickEdit (file) {
    try {
      await EditBookmarkPopup.create(file)
      this.load()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  async onClickRemove (file) {
    await beaker.hyperdrive.deleteMetadata(`hyper://system/bookmarks/${file.name}`, 'pinned')
    toast.create('Bookmark unpinned', '', 10e3)
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
}

customElements.define('desktop-app', DesktopApp)

// internal
// =

function getHref (file) {
  if (file.name.endsWith('.goto')) return file.stat.metadata.href
  return `hyper://system/bookmarks/${file.name}`
}

function getTitle (file) {
  return file.stat.metadata.title || file.name
}