import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import { ucfirst } from '../../../app-stdlib/js/strings.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import drivesViewCSS from '../../css/views/drives.css.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import _groupBy from 'lodash.groupby'
import '../hover-menu.js'

const SUBVIEW_OPTIONS = {
  library: 'Saved',
  mine: 'Owned By Me',
  network: 'By Followed Users'
}

const SORT_OPTIONS = {
  mtime: 'Recently updated',
  title: 'Alphabetical'
}

const VIZ_OPTIONS = {
  grid: 'Grid',
  list: 'List'
}

const CORE_TYPES_MAP = {
  default: 'Shared Folder',
  website: 'Website',
  application: 'Application'
}

export class DrivesView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      items: {type: Array},
      currentView: {type: String},
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

  get groups () {
    return Object.entries(_groupBy(this.items, item => item.meta.type || 'default'))
  }

  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'library', ['library', 'mine', 'network'])
    this.currentSort = oneof(QP.getParam('sort'), 'mtime', ['mtime', 'title'])
    this.currentViz = oneof(QP.getParam('viz'), getSavedConfig('viz', 'grid'), ['grid', 'list'])
    this.typesMap = undefined
    this.items = []
  }

  async load () {
    if (!this.typesMap) {
      this.typesMap = Object.assign(
        {},
        CORE_TYPES_MAP,
        Object.fromEntries((await beaker.types.listDriveTypes()).map(t => ([t.id, `${t.title} (${t.id})`])))
      )
      console.log(this.typesMap)
    }

    let [isSaved, isOwner, visibility] = [undefined, undefined, undefined]
    if (this.currentSubview !== 'network') isSaved = true
    if (this.currentSubview === 'mine') isOwner = true
    else if (this.currentSubview === 'network') isOwner = false
    if (this.currentSubview === 'network') visibility = 'public'
    this.items = await uwg.library.list({isSaved, isOwner, visibility, sortBy: this.currentSort})

    console.log('loaded', this.items)
  }

  showMenu (item, x, y, isContextMenu) {
    let url = `dat://${item.key}`
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(url, {setActive: true}) },
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy URL',
        click: () => {
          writeToClipboard(url)
          toast.create('Copied to your clipboard')
        }
      },
      '-',
      {
        icon: 'fas fa-fw fa-code-branch',
        label: 'Fork this site',
        click: async () => {
          await DatArchive.fork(url)
          this.load()
        }
      }
    ]
    if (url !== this.userUrl) {
      items.push('-')
      if (item.isSaved) {
        items.push({
          icon: 'fas fa-trash',
          label: 'Move to trash',
          click: async () => {
            // TODO await uwg.library.configure(item.key, {isSaved: false})
            toast.create('Moved to trash')
            this.load()
          }
        })
      } else {
        if (item.meta.isOwner) {
          items.push({
            icon: 'fas fa-undo',
            label: 'Restore from trash',
            click: async () => {
              // TODO await uwg.library.configure(item.key, {isSaved: true})
              toast.create('Restored')
              this.load()
            }
          })
        } else {
          items.push({
            icon: 'fas fa-save',
            label: 'Save to library',
            click: async () => {
              // TODO await uwg.library.configure(item.key, {isSaved: true})
              toast.create('Saved')
              this.load()
            }
          })
        }
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
    document.title = 'Library'
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
        <hr>
        <hover-menu
          icon="fas fa-th-list"
          .options=${VIZ_OPTIONS}
          current=${VIZ_OPTIONS[this.currentViz]}
          @change=${this.onChangeViz}
        ></hover-menu>
        <hr>
        <button class="" @click=${this.onClickNew} style="margin-left: 10px">
          <span class="fas fa-fw fa-plus"></span> New Drive
        </button>
      </div>
      ${!items.length
        ? html`<div class="empty">No drives found.</div>`
        : html`${repeat(this.groups, ([type, items]) => this.renderGroup(type, items))}`}
    `
  }

  renderGroup (type, items) {
    return html`
      <h4>${this.typesMap[type] || type}</h4>
      <div class="listing ${this.currentViz}">
        ${repeat(items, item => this.renderItem(item))}
      </div>
    `
  }

  renderItem (item) {
    if (this.currentViz === 'grid') {
      return html`
        <a class="item" href=${item.url} @contextmenu=${e => this.onContextMenuDrive(e, item)}>
          <img src="asset:thumb:${item.url}?cache_buster=${Date.now()}">
          <div class="details">
            <div class="title">${item.meta.title || html`<em>Untitled</em>`}</div>
            <div class="author">by ${item.author ? item.author.title : html`<em>Unknown</em>`}</div>
            <div class="bottom-line">
              <span>${this.renderVisibility(item.visibility)}</span>
              ${item.meta.isOwner ? html`<span class="label">Owner</span>` : ''}
            </div>
          </div>
        </a>
      `
    } else {
      return html`
        <a class="item" href=${item.url} @contextmenu=${e => this.onContextMenuDrive(e, item)}>
          <img src="asset:favicon:${item.url}?cache_buster=${Date.now()}">
          <div class="title">${item.meta.title || html`<em>Untitled</em>`}</div>
          <div class="author">${item.author ? html`by ${item.author.title}` : undefined}</div>
          ${this.renderVisibility(item.visibility)}
          <div class="is-owner">${item.meta.isOwner ? html`<span class="label">Owner</span>` : ''}</div>
        </a>
      `      
    }
  }

  renderVisibility (visibility) {
    if (!visibility) return
    var icon = ''
    switch (visibility) {
      case 'public': icon = 'fa-globe-americas'; break
      case 'private': icon = 'fa-lock'; break
      case 'unlisted': icon = 'fa-eye'; break
    }
    return html`<span class="visibility ${visibility}"><span class="fa-fw fas ${icon}"></span> ${ucfirst(visibility)}</span>`
  }

  // events
  // =

  onChangeSubview (e) {
    this.currentSubview = e.detail.id
    QP.setParams({subview: this.currentSubview})
    this.load()
  }

  onChangeSort (e) {
    this.currentSort = e.detail.id
    QP.setParams({sort: this.currentSort})
    this.load()
  }

  onChangeViz (e) {
    this.currentViz = e.detail.id
    setSavedConfig('viz', this.currentViz)
    QP.setParams({viz: this.currentViz})
    this.requestUpdate()
  }

  onContextMenuDrive (e, item) {
    e.preventDefault()
    e.stopPropagation()

    this.showMenu(item, e.clientX, e.clientY, true)
  }

  onClickItemMenu (e, item) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    this.showMenu(item, rect.right + 4, rect.bottom + 8, false)
  }

  async onClickNew () {
    var archive = await DatArchive.create()
    toast.create('Drive created')
    beaker.browser.openUrl(archive.url, {setActive: true})
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