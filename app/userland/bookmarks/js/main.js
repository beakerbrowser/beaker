import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from './com/edit-bookmark-popup.js'
import bookmarksViewCSS from '../css/main.css.js'
import './hover-menu.js'

const SUBVIEW_OPTIONS = {
  mine: 'By Me',
  friends: 'By Friends'
}

const SORT_OPTIONS = {
  createdAt: 'Latest',
  title: 'Alphabetical'
}

class BookmarksApp extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
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
    if (!this.user) {
      this.user = await beaker.users.getCurrent()
    }

    var author = undefined
    if (this.currentSubview === 'friends') {
      author = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
    } else {
      author = [
        this.user.url,
        navigator.filesystem.root.url
      ]
    }
    var items = await uwg.bookmarks.list({
      author,
      isOwner: this.currentSubview === 'mine' ? true : undefined,
      sortBy: this.currentSort,
      reverse: this.currentSort === 'createdAt'
    })
    this.items = items
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
          icon="fas fa-filter"
          .options=${SUBVIEW_OPTIONS}
          current=${SUBVIEW_OPTIONS[this.currentSubview]}
          @change=${this.onChangeSubview}
        ></hover-menu>
        <hr>
        <hover-menu
          icon="fas fa-sort-amount-down"
          .options=${SORT_OPTIONS}
          current=${SORT_OPTIONS[this.currentSort]}
          @change=${this.onChangeSort}
        ></hover-menu>
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
      <a class="bookmark" href=${item.href} @contextmenu=${e => this.onContextMenu(e, item)}>
        <span class="favicon"><img src="asset:favicon:${item.href}"></span>
        <span class="title">${item.title}</span>
        <span class="href">${item.href}</span>
        <span class="description">${item.description}</span>
        <span class="tags">${item.tags.join(', ')}</span>
        <span class="visibility">
          <span class="fas fa-fw fa-${item.visibility === 'public' ? 'globe-americas' : 'lock'}"></span>
        </span>
        ${item.visibility === 'public' ? html`
          <span
            class="author tooltip-left"
            data-tooltip=${item.author.title || 'Anonymous'}
            @click=${e => this.onClickAuthor(e, item)}
          >
            <img src="asset:thumb:${item.author.url}">
          </span>
        ` : ''}
      </a>
    `
  }

  // events
  // =

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
          writeToClipboard(item.href)
          toast.create('Copied to your clipboard')
        }
      },
      '-',
      {
        icon: 'fas fa-fw fa-pencil-alt',
        label: 'Edit bookmark',
        click: async () => {
          var values = await EditBookmarkPopup.create(item)
          await uwg.bookmarks.edit(item.href, values)
          this.load()
        }
      },
      {
        icon: 'fas fa-fw fa-trash',
        label: 'Delete bookmark',
        click: async () => {
          if (confirm('Are you sure?')) {
            await uwg.bookmarks.remove(item.href)
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
}
customElements.define('bookmarks-app', BookmarksApp)