import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import pagesCSS from '../../css/views/pages.css.js'

function _title (page) {
  return page?.metadata?.title || 'Untitled'
}

export class PagesView extends LitElement {
  static get properties () {
    return {
      pages: {type: Array},
      filter: {type: String},
      showHeader: {type: Boolean, attribute: 'show-header'},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'}
    }
  }

  static get styles () {
    return pagesCSS
  }

  constructor () {
    super()
    this.pages = undefined
    this.filter = undefined
    this.showHeader = false
    this.hideEmpty = false
    this.load()
  }

  async load () {
    var profile = await beaker.browser.getProfile()
    var pages = await beaker.index.listRecords({
      file: {extension: '.md', prefix: '/pages'},
      site: ['hyper://private', `hyper://${profile.key}`],
      limit: 1e9
    })
    console.log(pages)
    pages.sort((a, b) => _title(a).localeCompare(_title(b)))
    this.pages = pages
  }

  async pageMenu (page) {
    var items = [
      {label: 'Open Link in New Tab', click: () => window.open(page.metadata.href)},
      {label: 'Copy Link Address', click: () => writeToClipboard(page.metadata.href)},
      {type: 'separator'},
      {label: 'Delete', click: () => this.onClickRemove(page)}
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
    var pages = this.pages
    if (pages && this.filter) {
      pages = pages.filter(page => (
        _title(page).toLowerCase().includes(this.filter)
      ))
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${pages ? html`
        ${this.showHeader && !(this.hideEmpty && pages.length === 0) ? html`
          <h4>Pages</h4>
        ` : ''}
        <div class="pages">
          ${repeat(pages, page => this.renderPage(page))}
          ${pages.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderPage (page) {
    var title = _title(page)
    var isPrivate = page.site.url.startsWith('hyper://private')
    return html`
      <a
        class="page"
        href=${page.url}
        title=${title || ''}
        @contextmenu=${e => this.onContextmenuPage(e, page)}
      >
        <img class="favicon" src="asset:favicon:${page.site.url}">
        <div class="title">${title}</div>
        <div class="info">
          ${isPrivate ? 'Private' : 'Public'}
        </div>
        <div class="ctrls">
          <button class="transparent" @click=${e => this.onClickPageMenuBtn(e, page)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
      </div>
    `
  }

  // events
  // =

  async onContextmenuPage (e, page) {
    e.preventDefault()
    e.stopPropagation()
    await this.pageMenu(page)
  }

  onClickPageMenuBtn (e, page) {
    e.preventDefault()
    e.stopPropagation()
    this.pageMenu(page)
  }

  async onClickRemove (file) {
    if (!confirm('Are you sure?')) return
    await beaker.hyperdrive.unlink(file.url)
    toast.create('Page deleted', '', 10e3)
    this.load()
  }
}

customElements.define('pages-view', PagesView)