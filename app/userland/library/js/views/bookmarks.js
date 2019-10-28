import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import { bookmarks } from '../../../app-stdlib/js/uwg.js'
import { emit } from '../../../app-stdlib/js/dom.js'
// import { VIEW_OPTIONS } from '../lib/const'
import * as createNew from '../lib/create-new'
import { EditBookmarkPopup } from '../com/edit-bookmark-popup.js'
import bookmarksViewCSS from '../../css/views/bookmarks.css.js'
import '../hover-menu.js'

const SUBVIEW_OPTIONS = {
  mine: 'By Me',
  friends: 'By Friends'
}

const SORT_OPTIONS = {
  createdAt: 'Latest',
  name: 'Alphabetical'
}

class BookmarksView extends LitElement {
  static get properties () {
    return {
      items: {type: Array},
      currentSubview: {type: String},
      currentSort: {type: String}
    }
  }

  static get styles () {
    return bookmarksViewCSS
  }

  constructor () {
    super()
    this.currentSubview = 'mine'
    this.currentSort = 'createdAt'
    this.items = []
    this.load()
  }

  async load () {
    this.items = await bookmarks.list({
      author: this.currentSubview === 'mine' ? 'me' : undefined,
      sort: this.currentSort,
      reverse: this.currentSort === 'createdAt'
    })
    console.log('loaded', this.currentSort, this.items)
  }

  // rendering
  // =

  render () {
    document.title = 'Bookmarks'
    let items = this.items

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        <hover-menu
          .options=${VIEW_OPTIONS}
          .current=${VIEW_OPTIONS.find(v => v.id === 'bookmarks').label}
          @change=${this.onChangeView}
        ></hover-menu>
        <hr>
        <hover-menu
          icon="fas fa-filter"
          .options=${SUBVIEW_OPTIONS}
          @change=${this.onChangeSubview}
        ></hover-menu>
        <hover-menu
          icon="fas fa-sort-amount-down"
          .options=${SORT_OPTIONS}
          @change=${this.onChangeSort}
        ></hover-menu>
        <hr>
        <button class="" @click=${this.onClickNew} style="margin-left: 10px">
          New <span class="fas fa-fw fa-caret-down"></span>
        </button>
        <div class="spacer"></div>
      </div>
      <div class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </div>
      ${!items.length
        ? html`<div class="empty">No bookmarks found.</div>`
        : ''}
    `
  }

  renderItem (item) {
    return html`
      <a class="bookmark" href=${item.content.href} @contextmenu=${e => this.onContextMenu(e, item)}>
        <span class="favicon"><img src="asset:favicon:${item.content.href}"></span>
        <span class="title">${item.content.title}</span>
        <span class="href">${item.content.href}</span>
        <span class="description">${item.content.description}</span>
        <span class="visibility">
          <span class="fas fa-fw fa-${item.path.startsWith('/public') ? 'globe-americas' : 'lock'}"></span>
        </span>
        ${item.path.startsWith('/public') === 'public' ? html`
          <span
            class="author tooltip-left"
            data-tooltip=${item.drive.title || 'Anonymous'}
            @click=${e => this.onClickAuthor(e, item)}
          >
            <img src="asset:thumb:${item.drive.url}">
          </span>
        ` : ''}
      </a>
    `
  }

  // events
  // =

  onChangeView (e) {
    emit(this, 'change-view', {detail: {view: e.detail.id}})
  }

  onChangeSubview (e) {
    this.currentSubview = e.detail.id
    this.load()
  }

  onChangeSort (e) {
    this.currentSort = e.detail.id
    this.load()
  }

  onClickAuthor (e, item) {
    e.preventDefault()
    e.stopPropagation()
    window.open(item.author.url)
  }

  onContextMenu (e, item) {
    e.preventDefault()
    e.stopPropagation()

    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(item.href, {setActive: true}) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy URL',
          click: () => {
          writeToClipboard(item.content.href)
          toast.create('Copied to your clipboard')
        }
      },
      '-',
      {
        icon: 'fas fa-fw fa-pencil-alt',
        label: 'Edit bookmark',
        click: async () => {
          var values = await EditBookmarkPopup.create(item.content)
          await bookmarks.update(item.path, values)
          this.load()
        }
      },
      {
        icon: 'fas fa-fw fa-trash',
        label: 'Delete bookmark',
        click: async () => {
          if (confirm('Are you sure?')) {
            await bookmarks.remove(item.path)
            toast.create('Bookmark deleted')
            this.load()
          }
        }
      }
    ]

    contextMenu.create({
      x: e.clientX,
      y: e.clientY,
      right: true,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items
    })
  }

  onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    createNew.showContextMenu({
      x: rect.left,
      y: rect.bottom
    })
  }
}
customElements.define('bookmarks-view', BookmarksView)