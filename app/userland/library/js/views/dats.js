import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import { ucfirst } from '../../../app-stdlib/js/strings.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import * as contextMenu from '../../../app-stdlib/js/com/context-menu.js'
import datsViewCSS from '../../css/views/dats.css.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import libTools from '@beaker/library-tools'
import '../hover-menu.js'

const SUBVIEW_OPTIONS = {
  library: 'Saved',
  mine: 'By Me',
  network: 'By Followed Users'
}

const SORT_OPTIONS = {
  mtime: 'Recently updated',
  title: 'Alphabetical'
}

class DatsView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      items: {type: Array},
      currentView: {type: String},
      currentSubview: {type: String},
      currentSort: {type: String},
    }
  }

  static get styles () {
    return datsViewCSS
  }

  get userUrl () {
    return this.user ? this.user.url : ''
  }

  constructor () {
    super()
    this.currentSubview = oneof(QP.getParam('subview'), 'library', ['library', 'mine', 'network'])
    this.currentSort = oneof(QP.getParam('sort'), 'mtime', ['mtime', 'title'])
    this.items = []
  }

  async load () {
    // fetch listing
    var items
    if (this.currentView === 'trash') {
      items = await beaker.archives.listTrash()
    } else {
      let type = 'unwalled.garden/website'
      let [isSaved, isOwner, visibility] = [undefined, undefined, undefined]
      if (this.currentSubview !== 'network') isSaved = true
      if (this.currentSubview === 'mine') isOwner = true
      else if (this.currentSubview === 'network') isOwner = false
      if (this.currentSubview === 'network') visibility = 'public'
      items = await uwg.library.list({type, isSaved, isOwner, visibility, sortBy: this.currentSort})
    }

    // manually filter for 'archives' view
    if (this.currentView === 'archives') {
      items = items.filter(item => !libTools.typeToCategory(item.meta.type))
    }

    this.items = items
    console.log('loaded', this.items)
  }

  showMenu (item, x, y, isContextMenu) {
    let url = `dat://${item.key}`
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => beaker.browser.openUrl(url, {setActive: true}) },
      {icon: 'fas fa-fw fa-link', label: 'Copy URL', click: () => {
        writeToClipboard(url)
        toast.create('Copied to your clipboard')
      }},
      '-',
      {icon: 'fas fa-fw fa-code-branch', label: 'Fork this site', click: async () => {
        await DatArchive.fork(url)
        this.load()
      }}
    ]
    if (url !== this.userUrl) {
      items.push('-')
      if (item.isSaved) {
        items.push({icon: 'fas fa-trash', label: 'Move to trash', click: async () => {
          await uwg.library.configure(item.key, {isSaved: false})
          toast.create('Moved to trash')
          this.load()
        }})
      } else {
        if (item.meta.isOwner) {
          items.push({icon: 'fas fa-undo', label: 'Restore from trash', click: async () => {
            await uwg.library.configure(item.key, {isSaved: true})
            toast.create('Restored')
            this.load()
          }})
        } else {
          items.push({icon: 'fas fa-save', label: 'Save to library', click: async () => {
            await uwg.library.configure(item.key, {isSaved: true})
            toast.create('Saved')
            this.load()
          }})
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
    const isViewingTrash = this.currentView === 'trash'
    document.title = isViewingTrash ? 'Trash' : 'Websites'
    let items = this.items

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header">
        ${isViewingTrash 
          ? html`<button @click=${this.onEmptyTrash}><span class="fas fa-fw fa-trash"></span> Empty trash</button>`
          : html`
            <hover-menu
              icon="fas fa-filter"
              .options=${SUBVIEW_OPTIONS}
              current=${SUBVIEW_OPTIONS[this.currentSubview]}
              @change=${this.onChangeSubview}
            ></hover-menu>
          `}
        <hr>
        ${!isViewingTrash ? html`
          <hover-menu
            icon="fas fa-sort-amount-down"
            .options=${SORT_OPTIONS}
            current=${SORT_OPTIONS[this.currentSort]}
            @change=${this.onChangeSort}
          ></hover-menu>
        ` : ''}
        <hr>
        <button class="" @click=${this.onClickNew} style="margin-left: 10px">
          <span class="fas fa-fw fa-plus"></span> New Website
        </button>
      </div>
      ${!items.length
        ? html`<div class="empty"><div><span class="${isViewingTrash ? 'fas fa-trash' : 'far fa-sad-tear'}"></span></div>No ${this.currentView} found.</div>`
        : ''}
      <div class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </div>
    `
  }

  renderItem (item) {
    return html`
      <a class="item" href=${`dat://`+item.key} @contextmenu=${e => this.onContextMenuDat(e, item)}>
        <img src="asset:thumb:dat://${item.key}?cache_buster=${Date.now()}">
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
  }

  renderVisibility (visibility) {
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

  onContextMenuDat (e, item) {
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
    toast.create('Dat created')
    beaker.browser.openUrl(archive.url, {setActive: true})
  }

  async onEmptyTrash () {
    if (!confirm('Empty your trash? This will delete the dats from you computer.')) {
      return
    }
    await beaker.archives.collectTrash()
    this.load()
  }
}
customElements.define('dats-view', DatsView)