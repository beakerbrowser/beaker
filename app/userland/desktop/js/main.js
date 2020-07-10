import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from 'beaker://library/js/com/edit-bookmark-popup.js'
import { AddContactPopup } from 'beaker://library/js/com/add-contact-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import { AddPostPopup } from './com/add-post-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'

import 'beaker://library/js/views/drives.js'
import 'beaker://library/js/views/bookmarks.js'
import 'beaker://library/js/views/address-book.js'
import './views/recent.js'
import css from '../css/main.css.js'

const VERSION_ID = (major, minor, patch, pre) => major * 1e9 + minor * 1e6 + patch * 1e3 + pre
const CURRENT_VERSION = VERSION_ID(1, 0, 0, 6)
const RELEASES = [
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
      filter: {type: String},
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
    this.currentNav = 'drives'
    this.filter = ''
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
    await this.requestUpdate()
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())
    ;[this.profile, this.pins] = await Promise.all([
      addressBook.loadProfile(),
      desktop.load()
    ])
    console.log(this.pins)
    this.legacyArchives = await beaker.datLegacy.list()
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`<a class=${id === this.currentNav ? 'active' : ''} @click=${e => {this.currentNav = id}}>${label}</a>`
    const hiddenCls = id => this.currentNav === id ? '' : 'hidden'
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div id="topleft">
        ${this.profile ? html`
          <a class="profile-ctrl" href=${this.profile.url}>
            <beaker-img-fallbacks>
              <img src="${this.profile.url}/thumb?cache_buster=${cacheBuster}" slot="img1">
              <img src="beaker://assets/default-user-thumb" slot="img2">
            </beaker-img-fallbacks>
            <span>${this.profile.title}</span>
          </a>
        ` : ''}
      </div>
      <div id="topright">
        <a href="#" title="Release Notes" @click=${this.onClickReleaseNotes}><span class="fas fa-fw fa-rocket"></span> What's new in Beaker<span class="fas fa-fw fa-caret-down"></span></a>
        <a href="beaker://settings/" title="Settings"><span class="fas fa-cog"></span></a>
      </div>
      ${this.renderReleaseNotice()}
      ${this.renderFiles()}
      <nav>
        ${navItem('drives', 'My Drives')}
        ${navItem('recent', 'Recent')}
        ${navItem('bookmarks', 'Bookmarks')}
        ${navItem('address-book', 'Address Book')}
        <a @click=${this.onClickNavMore} title="More"><span class="fas fa-fw fa-ellipsis-h"></span></a>
        <span class="spacer"></span>
        ${this.currentNav !== 'feed' ? html`
          <div class="search-ctrl">
            <span class="fas fa-search"></span>
            <input @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
          </div>
        ` : ''}
        ${this.currentNav === 'feed' ? html`
          <a class="new-btn" @click=${this.onClickSyncFeed}><span class="fas fa-sync"></span> Sync Feed</a>
          <a class="new-btn" @click=${this.onClickNewPost}><span class="fas fa-plus"></span> New Post</a>
        ` : ''}
        ${this.currentNav === 'drives' ? html`
          <a class="new-btn" @click=${this.onClickNewDrive}><span class="fas fa-plus"></span> New Drive</a>
        ` : ''}
        ${this.currentNav === 'bookmarks' ? html`
          <a class="new-btn" @click=${e => this.onClickNewBookmark(e, false)}><span class="fas fa-plus"></span> New Bookmark</a>
        ` : ''}
        ${this.currentNav === 'address-book' ? html`
          <a class="new-btn" @click=${this.onClickNewContact}><span class="fas fa-plus"></span> New Contact</a>
        ` : ''}
      </nav>
      <drives-view class="top-border ${hiddenCls('drives')}" loadable ?hide-empty=${!!this.filter || this.isIntroActive} .filter=${this.filter}></drives-view>
      <recent-view class="top-border ${hiddenCls('recent')}" loadable ?hide-empty=${!!this.filter || this.isIntroActive} filter=${this.filter}></recent-view>
      <bookmarks-view class="top-border ${hiddenCls('bookmarks')}" loadable ?hide-empty=${!!this.filter || this.isIntroActive} .filter=${this.filter}></bookmarks-view>
      <address-book-view class="top-border ${hiddenCls('address-book')}" loadable ?hide-empty=${!!this.filter || this.isIntroActive} other-only .filter=${this.filter}></address-book-view>
      ${this.renderIntro()}
      ${this.renderLegacyArchivesNotice()}
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

  renderFiles () {
    var pins = this.pins || []
    return html`
      <div class="pins">
        <a class="add" @click=${e => this.onClickNewBookmark(e, true)}>
          <span class="fas fa-fw fa-plus"></span>
        </a>
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
    contextMenu.create({x: rect.left, y: rect.bottom + 10, roomy: true, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }

  onCloseReleaseNotes (e) {
    localStorage.lastDismissedReleaseNotice = CURRENT_VERSION
    this.requestUpdate()
  }

  onClickNavMore (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fas fa-share-alt', label: 'Hosting', click: () => { window.location = `beaker://library/hosting` }}
    ]
    contextMenu.create({x: rect.left, y: rect.bottom, noBorders: true, roomy: true, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }

  async onClickSyncFeed (e) {
    toast.create('Syncing...')
    await this.shadowRoot.querySelector('feed-view').forceLoad()
    toast.destroy()
    toast.create('Feed Synced', '', 2e3)
  }

  async onClickNewPost (e) {
    try {
      let post = await AddPostPopup.create()
      post.filename = post.filename || `${Date.now()}.md`
      if (/\.(md|txt|htm|html)$/i.test(post.filename) === false) post.filename += '.md'
      await beaker.hyperdrive.drive(this.profile.url).writeFile(joinPath('microblog', post.filename), post.body)
      toast.create('Post published', '', 3e3)
    } catch (e) {
      // ignore, user probably cancelled
      console.log(e)
      return
    }
    await this.shadowRoot.querySelector('feed-view').forceLoad()
  }

  async onClickNewDrive (e) {
    var drive = await beaker.hyperdrive.createDrive()
    window.location = drive.url
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