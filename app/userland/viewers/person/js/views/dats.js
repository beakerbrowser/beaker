import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import datsViewCSS from '../../css/views/dats.css.js'

export class DatsView extends LitElement {
  static get properties() {
    return {
      user: {type: Object},
      info: {type: Object},
      items: {type: Array}
    }
  }

  static get styles () {
    return datsViewCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.info = undefined
    this.items = []
  }

  async load () {
    if (!this.info) return
    // fetch listing
    var items = await uwg.library.list({
      type: 'unwalled.garden/website',
      author: `dat://${this.info.key}`,
      sortBy: 'mtime'
    })

    this.items = items
    console.log('loaded', this.items)
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${!this.items.length
        ? html`
          <div class="empty">
            ${this.info && this.info.title || 'Anonymous'} has not published any websites.
          </div>`
        : ''}
      <div class="listing">
        ${repeat(this.items, item => this.renderItem(item))}
      </div>
    `    
  }

  renderItem (item) {
    return html`
      <div class="item" @contextmenu=${e => this.onContextMenuDat(e, item)}>
        <a class="thumb" href=${item.url}>
          <img src="asset:thumb:${item.url}?cache_buster=${Date.now()}">
        </a>
        <div class="details">
          <a href=${item.url} class="title">${item.meta.title}</a>
          <div class="description">
            ${item.meta.description}
          </div>
          <div class="author">by ${item.author ? item.author.title : 'You'}</div>
        </div>
      </div>
    `
  }

  // events
  // =

  onContextMenuDat (e, item) {
    e.preventDefault()
    e.stopPropagation()
    let url = `dat://${item.key}`
    var items = [
      {icon: 'fas fa-fw fa-external-link-alt', label: 'Open in new tab', click: () => window.open(url)},
      {icon: 'fas fa-fw fa-link', label: 'Copy URL', click: () => {
        writeToClipboard(url)
        toast.create('Copied to your clipboard')
      }},
      '-',
      {icon: 'fas fa-fw fa-code-branch', label: 'Fork this dat', click: async () => {
        var f = await DatArchive.fork(url)
        window.open(f.url)
      }}
    ]
    items.push('-')
    if (item.isSaved) {
      items.push({icon: 'fas fa-trash', label: 'Move to trash', click: async () => {
        await uwg.library.configure(item.key, {isSaved: false})
        toast.create('Moved to trash')
        this.load()
      }})
    } else {
      items.push({icon: 'fas fa-undo', label: 'Save to my library', click: async () => {
        await uwg.library.configure(item.key, {isSaved: true})
        toast.create('Restored')
        this.load()
      }})
    }
  
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

customElements.define('dats-view', DatsView)