import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from 'beaker://library/js/com/edit-bookmark-popup.js'
import { AddContactPopup } from 'beaker://library/js/com/add-contact-popup.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import { AddPostPopup } from './com/add-post-popup.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'
import '/js/views/feed.js'
import 'beaker://library/js/views/drives.js'
import 'beaker://library/js/views/bookmarks.js'
import 'beaker://library/js/views/address-book.js'
import css from '../css/main.css.js'

var cacheBuster = Date.now()

class DesktopApp extends LitElement {
  static get properties () {
    return {
      files: {type: Array},
      profile: {type: Object},
      currentNav: {type: String},
      filter: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.files = []
    this.currentNav = 'feed'
    this.filter = ''
    this.load()

    window.addEventListener('focus', e => {
      this.load()
    })
    this.addEventListener('update-pins', async (e) => {
      this.files = await desktop.load()
    })
  }

  async load () {
    cacheBuster = Date.now()
    await this.requestUpdate()
    Array.from(this.shadowRoot.querySelectorAll('[loadable]'), el => el.load())
    ;[this.profile, this.files] = await Promise.all([
      addressBook.loadProfile(),
      desktop.load()
    ])
    console.log(this.files)
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
        <a href="https://beaker-browser.gitbook.io/docs/" title="Help"><span class="far fa-question-circle"></span> Help</a>
        <a href="beaker://settings/" title="Settings"><span class="fas fa-cog"></span></a>
      </div>
      ${this.renderFiles()}
      <nav>
        ${navItem('feed', 'Feed')}
        ${navItem('drives', 'My Drives')}
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
      <feed-view class="${hiddenCls('feed')}" loadable></feed-view>
      <drives-view class="top-border ${hiddenCls('drives')}" loadable ?hide-empty=${!!this.filter} .filter=${this.filter}></drives-view>
      <bookmarks-view class="top-border ${hiddenCls('bookmarks')}" loadable ?hide-empty=${!!this.filter} .filter=${this.filter}></bookmarks-view>
      <address-book-view class="top-border ${hiddenCls('address-book')}" loadable ?hide-empty=${!!this.filter} other-only .filter=${this.filter}></address-book-view>
    `
  }

  renderFiles () {
    var files = this.files || []
    return html`
      <div class="files">
        ${repeat(files, file => html`
          <a
            class="file"
            href=${getHref(file)}
            @contextmenu=${e => this.onContextmenuFile(e, file)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot-180:' + getHref(file)} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${getTitle(file)}</div>
            </div>
          </a>
        `)}
        ${!this.filter ? html`
          <a class="file add" @click=${e => this.onClickNewBookmark(e, true)}>
            <span class="fas fa-fw fa-plus"></span>
          </a>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  onClickNavMore (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fas fa-share-alt', label: 'Seeding', click: () => { window.location = `beaker://library/seeding` }}
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
      {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(getHref(file))},
      {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(getHref(file))},
      (file.isFixed) ? undefined : '-',
      (file.isFixed) ? undefined : {icon: 'fa fa-pencil-alt', label: 'Edit', click: () => this.onClickEdit(file)},
      (file.isFixed) ? undefined : {icon: 'fa fa-times', label: 'Delete', click: () => this.onClickRemove(file)}
    ].filter(Boolean)
    await contextMenu.create({x: e.clientX, y: e.clientY, noBorders: true, roomy: true, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
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
    if (!confirm('Are you sure?')) return
    await desktop.remove(file)
    toast.create('Item removed', '', 10e3)
    this.load()
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