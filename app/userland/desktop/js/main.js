import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from 'beaker://library/js/com/edit-bookmark-popup.js'
import { AddContactPopup } from 'beaker://library/js/com/add-contact-popup.js'
import { NewPagePopup } from 'beaker://library/js/com/new-page-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'
import * as sourcesDropdown from './com/sources-dropdown.js'

import './views/query.js'
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

  get currentNavAsIndex () {
    switch (this.currentNav) {
      case 'microblogposts': return 'beaker/index/microblogposts'
      case 'comments': return 'beaker/index/comments'
      case 'bookmarks': return 'beaker/index/bookmarks'
      case 'blogposts': return 'beaker/index/blogposts'
      case 'pages': return 'beaker/index/pages'
      default: return undefined
    }
  }

  get sources () {
    if (this.currentSource === 'all') {
      return undefined // all data in the index this.sourceOptions.map(source => source.url)
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
    const navItem = (id, label, count) => html`
      <a
        class="nav-item ${id === this.currentNav ? 'active' : ''} ${count ? 'show-count' : ''}"
        @click=${e => {this.currentNav = id}}
        data-count=${count}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
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
        ${navItem('microblogposts', html`<span class="fas fa-fw fa-stream"></span> Microblog Posts`)}
        ${navItem('comments', html`<span class="far fa-fw fa-comment-alt"></span> Comments`)}
        ${navItem('notifications', html`<span class="far fa-fw fa-bell"></span> Notifications`, 10)}
        ${''/*TODOnavItem('images', html`<span class="far fa-fw fa-images"></span> Images`)*/}
        ${''/*<a class="nav-item" @click=${this.onClickNavMore} title="More">
          More...
        </a>*/}
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

  renderSidebar () {
    return html`
      <div class="sidebar">
        ${this.renderTagsList()}
        <section class="quick-links">
          <h3>Quick Links</h3>
          <div>
            <a href="hyper://system/">
              <img src="asset:favicon-32:hyper://system/">
              <span>My Private Site</span>
            </a>
          </div>
          <div>
            <a href=${this.profile?.url}>
              <beaker-img-fallbacks>
                <img src="asset:favicon-32:${this.profile?.url}" slot="img1">
                <img src="beaker://assets/default-user-thumb" slot="img2">
              </beaker-img-fallbacks>
              <span>${this.profile?.title}</span>
            </a>
          </div>
          <div>
            <a href="beaker://library/">
              <img class="favicon" src="asset:favicon-32:beaker://library/">
              <span>My Library</span>
            </a>
          </div>
          <div>
            <a href="https://docs.beakerbrowser.com/">
              <span class="far fa-fw fa-life-ring"></span>
              <span>Help</span>
            </a>
          </div>
        </section>
      </div>
    `
  }

  renderTagsList () {
    return ''
    return html`
      <section>
        <h3>Popular Tags</h3>
        <div class="tags">
          <a href="#">beaker</a>
          <a href="#">hyperspace</a>
          <a href="#">p2p</a>
          <a href="#">web</a>
          <a href="#">news</a>
          <a href="#">politics</a>
        </div>
      </section>
    `
  }

  renderCurrentView () {
    let hasSearchQuery = !!this.searchQuery
    if (hasSearchQuery) {
      return html`
        <div class="all-view">
          <div class="twocol">
            <div>
              <query-view
                class="subview"
                .index=${this.currentNavAsIndex}
                .filter=${this.searchQuery}
                .sources=${this.sources}
                limit="50"
                @load-state-updated=${e => this.requestUpdate()}
              ></query-view>
            </div>
            ${this.renderSidebar()}
          </div>
        </div>
      `
    } else {
      return html`
        <div class="all-view">
          ${this.renderPins()}
          <div class="twocol">
            <query-view
              content-type="all"
              show-date-titles
              .index=${this.currentNavAsIndex}
              .sources=${this.sources}
              limit="50"
              @load-state-updated=${e => this.requestUpdate()}
            ></query-view>
            ${this.renderSidebar()}
          </div>
        </div>
      `
    }
  }

  renderSourcesCtrl () {
    var label = ''
    switch (this.currentSource) {
      case 'all': label = 'All'; break
      case 'mine': label = 'My Data'; break
      case 'others': label = 'Others\'s Data'; break
      default: label = this.sourceOptions.find(opt => opt.url === this.currentSource)?.title
    }
    return html`
      <a class="nav-item" @click=${this.onClickSources}>Source: ${label} <span class="fas fa-fw fa-caret-down"></span></a>
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
      {
        icon: 'fa-fw fas fa-file-upload',
        label: 'New Site from Folder',
        click: this.onClickNewSiteFromFolder.bind(this)
      },
      '-',
      {icon: 'fa-fw far fa-file-alt', label: 'New Page Draft', click: () => this.onClickNewPage({type: 'beaker/page', draft: true})},
      {icon: 'fa-fw fas fa-blog', label: 'New Blog Draft', click: () => this.onClickNewPage({type: 'beaker/blogpost', draft: true})},
      '-',
      {
        icon: html`
          <span class="icon-stack" style="position: relative;">
            <i class="far fa-file-alt fa-fw" style="position: relative; left: -2px;"></i>
            <i class="fas fa-lock" style="position: absolute; width: 4px; font-size: 50%; bottom: 0; left: 6px; background: #fff; padding: 0 1px"></i>
          </span>
        `,
        label: 'New Private Page',
        click: () => this.onClickNewPage({type: 'beaker/page', private: true})
      },
      {icon: 'fa-fw far fa-star', label: 'New Bookmark', click: () => this.onClickEditBookmark(undefined)}
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
      (file.isFixed) ? undefined : {label: 'Edit', click: () => this.onClickEditBookmark(file)},
      (file.isFixed) ? undefined : {label: 'Unpin', click: () => this.onClickUnpinBookmark(file)}
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

  async onClickNewPage (opts) {
    try {
      var res = await NewPagePopup.create(opts)
      beaker.browser.openUrl(res.url, {setActive: true, addedPaneUrls: ['beaker://editor/']})
    } catch (e) {
      // ignore
      console.log(e)
    }
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

  async onClickUnpinBookmark (file) {
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