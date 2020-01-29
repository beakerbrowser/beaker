/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'
import { writeToClipboard } from 'beaker://app-stdlib/js/clipboard.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { toNiceUrl, normalizeUrl } from 'beaker://app-stdlib/js/strings.js'

// exported api
// =

export class AddLinkPopup extends BasePopup {
  static get styles () {
    return [buttonsCSS, popupsCSS, css`
    .popup-inner {
      width: 1000px;
    }

    .popup-inner .body {
      padding: 0;
    }

    .popup-inner .body > div:not(:first-child) {
      margin-top: 0px; /* override this rule */
    }

    .filter-control {
      padding: 8px 10px;
      background: #f1f1f6;
      border-bottom: 1px solid #e0e0ee;
    }

    .filter-control input {
      height: 26px;
      margin: 0;
      width: 100%;
    }

    main {
      max-height: calc(100vh - 300px);
      overflow-y: auto;
    }

    footer {
      padding: 8px 10px;
      background: #f1f1f6;
      border-top: 1px solid #e0e0ee;
      text-align: right;
    }

    footer button {
      font-size: 14px;
    }

    nav {
      padding: 4px;
      margin: 10px;
      border-radius: 8px;
      background: #f6f6fd;
    }

    nav button {
      background: #fff;
      box-shadow: rgba(0, 0, 0, 0.15) 0px 1px 1px;
    }

    nav .path {
      margin-left: 4px;
    }

    nav .path span {
      margin-left: 4px;
      letter-spacing: 0.3px;
      color: #667;
    }

    .history {
      margin-top: 0 !important;
    }

    .empty {
      color: rgba(0, 0, 0, 0.5);
      padding: 20px;
    }

    .suggestion {
      display: flex;
      align-items: center;
      padding: 10px;
      overflow: hidden;
      user-select: none;
    }

    .suggestion .thumb {
      flex: 0 0 80px;
      width: 80px;
      height: 64px;
      object-fit: scale-down;
      background: #fff;
      margin: 0 20px 0 10px;
      border: 1px solid #aaa;
      border-radius: 3px;
    }

    .suggestion .details {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion .title,
    .suggestion .url {
      display: block;
      white-space: nowrap;
      line-height: 1.7;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion .title {
      font-size: 14px;
      font-weight: 500;
    }

    .suggestion .url {
      font-size: 12px;
      color: var(--blue);
    }

    .suggestion:hover {
      background: #eee;
    }
    `]
  }

  constructor () {
    super()
    this.query = ''
    this.history = []
    this.selection = []

    this.initialLoad()
  }

  // management
  //

  static async create () {
    return BasePopup.create(AddLinkPopup)
  }

  static destroy () {
    return BasePopup.destroy('add-link-popup')
  }

  async initialLoad () {
    await this.load()
  }

  reset () {
    this.selection = []
    this.history = []
  }

  async load () {
    this.reset()
    this.runQuery()
  }

  async runQuery () {
    this.reset()
    this.history = await (this.query ? beaker.history.search(this.query) : beaker.history.getVisitHistory(0))
    if (this.query) {
      let queryEntry = normalizeUrl(this.query)
      if (!this.history.find(item => normalizeUrl(item.url) === queryEntry)) {
        this.history.unshift({
          title: queryEntry,
          url: queryEntry
        })
      }
    }
    console.log(this.history)
    this.requestUpdate()
  }

  // rendering
  // =

  renderTitle () {
    return 'Create shortcut'
  }

  renderBody () {
    var hasResults = this.history.length > 0
    return html`  
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="filter-control">
        <input type="text" id="search-input" name="url" placeholder="Search my history or input a URL" @keyup=${e => delay(this.onChangeQuery.bind(this), e)} />
      </div>
      <main>
        <div class="history ${this.query ? 'query-results' : 'defaults'}">
          ${hasResults ? '' : html`<div class="empty">No results</div>`}
          ${repeat(this.history, item => this.renderHistoryItem(item))}
        </div>
      </main>
    `
  }

  renderHistoryItem (item) {
    const title = item.title || 'Untitled'
    return html`
      <a href=${item.url} class="suggestion" title=${title} @click=${this.onClickHistory} @contextmenu=${this.onContextMenuHistory}>
        <img class="thumb" src="asset:thumb:${item.url}"/>
        <span class="details">
          <span class="title">${title}</span>
          <span class="url">${toNiceUrl(item.url)}</span>
        </span>
      </a>
    `
  }

  firstUpdated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  async onChangeQuery (e) {
    this.query = this.shadowRoot.querySelector('input').value
    if (this.query) this.runQuery()
    else this.load()
  }

  onClickHistory (e) {
    e.preventDefault()
    const detail = {
      href: e.currentTarget.getAttribute('href'),
      title: e.currentTarget.getAttribute('title')
    }
    this.dispatchEvent(new CustomEvent('resolve', {detail}))
  }

  onContextMenuHistory (e) {
    e.preventDefault()
    var url = e.currentTarget.getAttribute('href')
    const items = [
      {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(url)},
      {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(url)}
    ]
    contextMenu.create({x: e.clientX, y: e.clientY, items, fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'})
  }
}
customElements.define('add-link-popup', AddLinkPopup)

// helpers
// =

function delay (cb, param) {
  window.clearTimeout(cb)
  setTimeout(cb, 150, param)
}
