import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import drivesViewCSS from '../../css/views/drives.css.js'
import { bookmarks, friends, library, profiles } from '../../../app-stdlib/js/uwg.js'
import { EditBookmarkPopup } from '../com/edit-bookmark-popup.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import * as createNew from '../lib/create-new'
import _groupBy from 'lodash.groupby'
import '../../../app-stdlib/js/com/hover-menu.js'

const SUBVIEW_OPTIONS = {
  library: 'My Library',
  network: 'Network Library'
}

const SORT_OPTIONS = {
  mtime: 'Recently updated',
  title: 'Alphabetical'
}

const VIZ_OPTIONS = {
  grid: 'Grid',
  list: 'List'
}

const TYPES_MAP = {
  default: 'Hyperdrives',
  website: 'Websites',
  application: 'Applications',
  'webterm.sh': 'Webterm Commands',
  'unwalled.garden/person': 'People'
}

export class DrivesView extends LitElement {
  static get properties () {
    return {
      currentSubview: {type: String},
      currentSort: {type: String},
      currentViz: {type: String}
    }
  }

  static get styles () {
    return drivesViewCSS
  }

  get userUrl () {
    return this.user ? this.user.url : ''
  }

  get driveGroups () {
    return Object.entries(_groupBy(this.drives, item => item.mount.type || 'default'))
  }

  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'library', ['library', 'network'])
    this.currentSort = oneof(getSavedConfig('sort', 'mtime'), 'mtime', ['mtime', 'title'])
    this.currentViz = oneof(getSavedConfig('viz', 'list'), 'list', ['grid', 'list'])
    this.user = undefined
    this.bookmarks = []
    this.drives = []
    this.contacts = []
  }

  get drivesQueryPath () {
    if (this.currentSubview === 'network') {
      return [`/library/*`, `/public/library/*`, `/public/friends/*/library/*`]
    }
    return [`/library/*`, `/public/library/*`]
  }

  get contactsQueryPath () {
    if (this.currentSubview === 'network') {
      return [`/public`, `/public/friends/*`, `/public/friends/*/friends/*`]
    }
    return [`/public`, `/public/friends/*`]
  }

  async load () {
    this.bookmarks = await bookmarks.list({
      author: this.currentSubview === 'library' ? 'me' : undefined,
      sort: this.currentSort,
      reverse: this.currentSort === 'createdAt'
    })
    this.drives = await navigator.filesystem.query({type: 'mount', path: this.drivesQueryPath})
    for (let item of this.drives) {
      if (item.mount && item.mount.author) {
        item.author = await profiles.get(item.mount.author)
      }
    }
    this.contacts = await navigator.filesystem.query({type: 'mount', path: this.contactsQueryPath})
    this.user = this.contacts.find(item => item.path === '/public').drive

    console.log('loaded', {bookmarks: this.bookmarks, drives: this.drives, contacts: this.contacts})
    this.requestUpdate()
  }

  showMenu (type, item, x, y, isContextMenu) {
    var url = (type === 'bookmark') ? item.content.href : item.mount.url
    
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(url, {setActive: true}) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy URL',
        click: () => {
          writeToClipboard(url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    items.push('-')
    if (type === 'bookmark') {
      items.push({
        icon: 'fas fa-fw fa-pencil-alt',
        label: 'Edit bookmark',
        click: async () => {
          var values = await EditBookmarkPopup.create(item.content)
          await bookmarks.update(item.path, values)
          this.load()
        }
      })
      items.push({
        icon: 'fas fa-fw fa-trash',
        label: 'Delete bookmark',
        click: async () => {
          if (confirm('Are you sure?')) {
            await bookmarks.remove(item.path)
            toast.create('Bookmark deleted')
            this.load()
          }
        }
      })
    } else if (type === 'drive') {
      items.push({
        icon: 'fas fa-fw fa-code-branch',
        label: 'Fork this site',
        click: async () => {
          var drive = await DatArchive.fork(url)
          toast.create('Drive created')
          beaker.browser.openUrl(drive.url, {setActive: true})
          this.load()
        }
      })
      items.push('-')
      if (item.path.startsWith('/library')) {
        items.push({
          icon: 'fas fa-fw fa-trash',
          label: 'Remove from My Library',
          click: async () => {
            await library.remove(item.mount.url)
            const undo = async () => {
              await library.add(item.mount.url, item.mount.title)
              this.load()
            }
            toast.create('Removed from My Library', '', 10e3, {label: 'Undo', click: undo})
            this.load()
          }
        })
      } else {
        items.push({
          icon: 'fas fa-fw fa-plus',
          label: 'Add to My Library',
          click: async () => {
            await library.add(item.mount.url, item.mount.title)
            toast.create('Saved to My Library')
            this.load()
          }
        })
      }
    } else if (type === 'contact') {
      if (item.path === '/public') {
        items.push({
          icon: 'fas fa-fw fa-pencil-alt',
          label: 'Edit my profile',
          click: async () => {
            await beaker.browser.showEditProfileModal()
            this.load()
          }
        })
      } else if (/\/public\/friends\/([^\/])$/i.test(item.path)) {
        items.push({
          icon: 'fas fa-fw fa-user-minus',
          label: 'Remove from My Friends',
          click: async () => {
            await friends.remove(item.mount.url)
            const undo = async () => {
              await friends.add(item.mount.url, item.mount.title)
              this.load()
            }
            toast.create('Removed from My Friends', '', 10e3, {label: 'Undo', click: undo})
            this.load()
          }
        })
      } else {
        items.push({
          icon: 'fas fa-fw fa-user-plus',
          label: 'Add to My Friends',
          click: async () => {
            await friends.add(item.mount.url, item.mount.title)
            this.load()
          }
        })
      }
    }

    contextMenu.create({
      x,
      y,
      right: !isContextMenu,
      withTriangle: !isContextMenu,
      roomy: !isContextMenu,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items
    })
  }

  // rendering
  // =

  render () {
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
          @change=${this.onChangeSort}
        ></hover-menu>
        <hover-menu
          icon="fas fa-th-list"
          .options=${VIZ_OPTIONS}
          @change=${this.onChangeViz}
        ></hover-menu>
        <hr>
        <button class="" @click=${this.onClickNew} style="margin-left: 10px">
          New <span class="fas fa-fw fa-caret-down"></span>
        </button>
      </div>

      <h4>Bookmarks</h4>
      <div class="listing ${this.currentViz}">
        ${repeat(this.bookmarks, item => this.renderBookmark(item))}
      </div>

      ${repeat(this.driveGroups, ([type, items]) => this.renderDriveGroup(type, items))}

      <h4>Contacts</h4>
      <div class="listing ${this.currentViz}">
        ${repeat(this.contacts, item => this.renderContact(item))}
      </div>
    `
  }

  renderDriveGroup (type, items) {
    return html`
      <h4>${TYPES_MAP[type] || type}</h4>
      <div class="listing ${this.currentViz}">
        ${repeat(items, item => this.renderDrive(item))}
      </div>
    `
  }

  renderBookmark (item) {
    const isPublic = !item.path.startsWith('/.data')
    const isMine = item.path.startsWith('/.data') || item.path.startsWith('/public/.data')
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.content.href} @contextmenu=${e => this.onContextMenu(e, 'bookmark', item)}>
          <img src="asset:thumb:${item.content.href}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.content.title || html`<em>Untitled</em>`}</div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.content.href} @contextmenu=${e => this.onContextMenu(e, 'bookmark', item)}>
          <span class="favicon"><img src="asset:favicon:${item.content.href}"></span>
          <span class="title">${item.content.title}</span>
          <span class="href">${item.content.href}</span>
          <span class="description">${item.content.description}</span>
          <span class="flex1"></span>
          <div class="writable">${isMine ? html`<span class="label">Mine</span>` : ''}</div>
          <span class="visibility ${isPublic ? 'public' : 'private'}">
            <span class="fas fa-fw fa-${isPublic ? 'globe-americas' : 'lock'}"></span>
            ${isPublic ? 'Public' : 'Private'}
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
          <button class="transparent" @click=${e => this.onClickMenu(e, 'bookmark', item)}>
            <span class="fas fa-fw fa-ellipsis-h"></span>
          </button>
        </a>
      `
    }
  }

  renderDrive (item) {
    const isPublic = !item.path.startsWith('/library')
    const isMine = true // TODO
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'drive', item)}>
          <img src="asset:thumb:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'drive', item)}>
          <img src="asset:favicon:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
          <div class="author">by ${item.author ? item.author.title : '(unknown)'}</div>
          <span class="flex1"></span>
          <div class="writable">${isMine ? html`<span class="label">Mine</span>` : ''}</div>
          <span class="visibility ${isPublic ? 'public' : 'private'}">
            <span class="fas fa-fw fa-${isPublic ? 'globe-americas' : 'lock'}"></span>
            ${isPublic ? 'Public' : 'Private'}
          </span>
          <button class="transparent" @click=${e => this.onClickMenu(e, 'drive', item)}>
            <span class="fas fa-fw fa-ellipsis-h"></span>
          </button>
        </a>
      `
    }
  }

  renderContact (item) {
    const isYou = item.path === '/public'
    const isMine = isYou || item.drive.url === this.userUrl
    const isPublic = true // all contacts are currently public
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'contact', item)}>
          <img src="asset:thumb:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
            <div class="provenance">
              ${isYou
                ? html`This is you`
                : isMine
                  ? html`Your friend`
                  : html`Friend of ${item.drive.title}`}
            </div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.mount.url} @contextmenu=${e => this.onContextMenu(e, 'contact', item)}>
          <img class="avatar" src="asset:thumb:${item.mount.url}?cache_buster=${Date.now()}">
          <div class="title">${item.mount.title || html`<em>Untitled</em>`}</div>
          ${item.mount.description ? html`<div class="description">${item.mount.description}</div>` : ''}
          <div class="provenance">
            ${isYou
              ? html`This is you`
              : isMine
                ? html`Your friend`
                : html`Friend of ${item.drive.title}`}
          </div>
          <span class="flex1"></span>
          <div class="writable">${isMine ? html`<span class="label">Mine</span>` : ''}</div>
          <span class="visibility ${isPublic ? 'public' : 'private'}">
            <span class="fas fa-fw fa-${isPublic ? 'globe-americas' : 'lock'}"></span>
            ${isPublic ? 'Public' : 'Private'}
          </span>
          <button class="transparent" @click=${e => this.onClickMenu(e, 'contact', item)}>
            <span class="fas fa-fw fa-ellipsis-h"></span>
          </button>
        </a>
      `
    }
  }

  // events
  // =

  onChangeSubview (e) {
    this.currentSubview = e.detail.id
    QP.setParams({subview: this.currentSubview})
    location.reload()
  }

  onChangeSort (e) {
    this.currentSort = e.detail.id
    setSavedConfig('sort', this.currentSort)
    this.load()
  }

  onChangeViz (e) {
    this.currentViz = e.detail.id
    setSavedConfig('viz', this.currentViz)
    this.requestUpdate()
  }

  onContextMenu (e, type, item) {
    e.preventDefault()
    e.stopPropagation()

    this.showMenu(type, item, e.clientX, e.clientY, true)
  }

  onClickMenu (e, type, item) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    this.showMenu(type, item, rect.right + 6, rect.bottom + 8, false)
  }

  async onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    await createNew.showContextMenu({
      x: rect.left,
      y: rect.bottom
    })
    this.load()
  }
}
customElements.define('drives-view', DrivesView)

// internal methods
// =

function getSavedConfig (name, fallback = undefined) {
  return localStorage.getItem(`drives-setting-${name}`) || fallback
}

function setSavedConfig (name, value) {
  localStorage.setItem(`drives-setting-${name}`, value)
}