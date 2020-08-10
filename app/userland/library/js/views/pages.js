import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import pagesCSS from '../../css/views/pages.css.js'

function _title (page) {
  return page?.stat?.metadata?.title
}

function _draft (page) {
  return !!page?.stat?.metadata?.['beaker/draft']
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
    var addressBook = await beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json')
    var pages = await beaker.hyperdrive.query({
      type: 'file',
      drive: ['hyper://private', addressBook.profiles[0].key],
      path: ['/*', '/*/*', '/*/*/*', '/*/*/*/*'],
      metadata: {type: 'beaker/page'}
    })
    pages.sort((a, b) => _title(a).localeCompare(_title(b)))
    this.pages = pages
    console.log(this.pages)
  }

  async pageMenu (page) {
    var items = [
      {label: 'Open Link in New Tab', click: () => window.open(page.stat.metadata.href)},
      {label: 'Copy Link Address', click: () => writeToClipboard(page.stat.metadata.href)},
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
      pages = pages.filter(bookmark => (
        _title(bookmark).toLowerCase().includes(this.filter)
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
    var isPrivate = page.origin.url.startsWith('hyper://private/')
    return html`
      <a
        class="page"
        href=${page.url}
        title=${title || ''}
        @contextmenu=${e => this.onContextmenuPage(e, page)}
      >
        <img class="favicon" src="asset:favicon:${page.origin.url}">
        <div class="title">${title}</div>
        <div class="info">
          ${isPrivate ? 'Private' : 'Public'}
          ${_draft(page) ? 'Draft' : ''}</div>
        </div>
        <div class="ctrls">
          <button class="transparent" @click=${e => this.onClickPageMenuBtn(e, page)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        </div>
      </div>
    `
  }

  // events
  // =

  async onContextmenuPage (e, bookmark) {
    e.preventDefault()
    e.stopPropagation()
    await this.pageMenu(bookmark)
  }

  onClickPageMenuBtn (e, bookmark) {
    e.preventDefault()
    e.stopPropagation()
    this.pageMenu(bookmark)
  }

  async onClickRemove (file) {
    if (!confirm('Are you sure?')) return
    await beaker.hyperdrive.unlink(file.url)
    toast.create('Page deleted', '', 10e3)
    this.load()
  }
}

customElements.define('pages-view', PagesView)