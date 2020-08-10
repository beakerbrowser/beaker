import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from '../com/edit-bookmark-popup.js'
import bookmarksCSS from '../../css/views/bookmarks.css.js'

function _href (bookmark) {
  return bookmark?.stat?.metadata?.href
}

function _title (bookmark) {
  return bookmark?.stat?.metadata?.title
}

function _pinned (bookmark) {
  return bookmark?.stat?.metadata?.pinned
}

export class BookmarksView extends LitElement {
  static get properties () {
    return {
      bookmarks: {type: Array},
      filter: {type: String},
      showHeader: {type: Boolean, attribute: 'show-header'},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'}
    }
  }

  static get styles () {
    return bookmarksCSS
  }

  constructor () {
    super()
    this.bookmarks = undefined
    this.filter = undefined
    this.showHeader = false
    this.hideEmpty = false
    this.load()
  }

  async load () {
    var bookmarks = await beaker.hyperdrive.drive('hyper://private/').query({
      type: 'file',
      path: ['/bookmarks/*.goto']
    })
    bookmarks.sort((a, b) => _title(a).localeCompare(_title(b)))
    this.bookmarks = bookmarks
    console.log(this.bookmarks)
  }

  async bookmarkMenu (bookmark) {
    var items = [
      {label: 'Open Link in New Tab', click: () => window.open(bookmark.stat.metadata.href)},
      {label: 'Copy Link Address', click: () => writeToClipboard(bookmark.stat.metadata.href)},
      {label: 'Edit', click: () => this.onClickEdit(bookmark)},
      {type: 'separator'},
      {type: 'checkbox', checked: _pinned(bookmark), label: 'Pin to start page', click: () => this.onToggleBookmarkPinned(null, bookmark)},
      {type: 'separator'},
      {label: 'Delete', click: () => this.onClickRemove(bookmark)}
    ]
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

  // rendering
  // =

  render () {
    var bookmarks = this.bookmarks
    if (bookmarks && this.filter) {
      bookmarks = bookmarks.filter(bookmark => (
        _href(bookmark).toLowerCase().includes(this.filter)
        || _title(bookmark).toLowerCase().includes(this.filter)
      ))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${bookmarks ? html`
        ${this.showHeader && !(this.hideEmpty && bookmarks.length === 0) ? html`
          <h4>Bookmarks</h4>
        ` : ''}
        <div class="bookmarks">
          ${repeat(bookmarks, bookmark => this.renderBookmark(bookmark))}
          ${bookmarks.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderBookmark (bookmark) {
    var {href, title, pinned} = bookmark.stat.metadata
    return html`
      <a
        class="bookmark"
        href=${href}
        title=${title || ''}
        @contextmenu=${e => this.onContextmenuBookmark(e, bookmark)}
      >
       <img class="favicon" src="asset:favicon:${href}">
       <div class="title">${title}</div>
       <div class="href">${href}</div>
        <div class="ctrls">
          <button class="transparent" @click=${e => this.onClickBookmarkMenuBtn(e, bookmark)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
      </div>
    `
  }

  // events
  // =

  async onContextmenuBookmark (e, bookmark) {
    e.preventDefault()
    e.stopPropagation()
    await this.bookmarkMenu(bookmark)
  }

  onClickBookmarkMenuBtn (e, bookmark) {
    e.preventDefault()
    e.stopPropagation()
    this.bookmarkMenu(bookmark)
  }

  async onToggleBookmarkPinned (e, bookmark) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    if (_pinned(bookmark)) {
      await beaker.hyperdrive.drive('hyper://private/').deleteMetadata(bookmark.path, ['pinned'])
    } else {
      await beaker.hyperdrive.drive('hyper://private/').updateMetadata(bookmark.path, {pinned: '1'})
    }
    this.load()
    emit(this, 'update-pins')
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
    await beaker.hyperdrive.drive('hyper://private/').unlink(file.path)
    toast.create('Bookmark removed', '', 10e3)
    this.load()
  }
}

customElements.define('bookmarks-view', BookmarksView)