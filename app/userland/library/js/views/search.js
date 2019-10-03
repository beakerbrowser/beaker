import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import searchViewCSS from '../../css/views/search.css.js'
import * as QP from '../lib/query-params.js'
import { oneof } from '../lib/validation.js'
import '../hover-menu.js'
import _debounce from 'lodash.debounce'
import '../com/search/person-result.js'
import '../com/search/dat-result.js'
import '../com/search/bookmark-result.js'
import '../com/search/status-result.js'

const FILTER_OPTIONS = {
  mine: 'By Me',
  network: 'In My Network'
}

class SearchView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      items: {type: Array},
      currentQuery: {type: String},
      currentFilter: {type: String}
    }
  }

  static get styles () {
    return searchViewCSS
  }

  get userUrl () {
    return this.user ? this.user.url : ''
  }

  constructor () {
    super()
    this.fs = undefined
    this.currentFilter = oneof(QP.getParam('subview'), 'mine', ['mine', 'network'])
    this.items = []
    this.highlightNonce = undefined
    this.$runQuery = _debounce(this.runQuery.bind(this), 50)
  }

  load () {
    // load() will get called repeatedly as the query changes
    // we use the debouncer to wait for the user to stop typing
    this.$runQuery()
  }

  async runQuery () {
    if (!this.fs) {
      this.fs = await navigator.filesystem.get()
    }

    var res = await beaker.search.query({
      query: this.currentQuery
    })
    console.log('query result', res)

    this.highlightNonce = res.highlightNonce
    this.items = res.results
  }

  // rendering
  // =

  render () {
    document.title = `Search for "${this.currentQuery}"`
    let items = this.items

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="header"><div class="header-title">Search results for "${this.currentQuery}"</div></div>
      ${!items.length
        ? html`<div class="empty">No results found.</div>`
        : ''}
      <div class="listing">
        ${repeat(items, item => this.renderItem(item))}
      </div>
      <div class="search-engines">
        <div class="label">
          Try your search on another engine:
        </div>
        <div class="list">
          <a class="tooltip-right" href="https://google.com/search?q=${encodeURIComponent(this.currentQuery)}" data-tooltip="Google"><img src="beaker://assets/search-engines/google.png"></a>
          <a class="tooltip-right" href="https://duckduckgo.com?q=${encodeURIComponent(this.currentQuery)}" data-tooltip="DuckDuckGo"><img src="beaker://assets/search-engines/duckduckgo.png"></a>
          <a class="tooltip-right" href="https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.currentQuery)}" data-tooltip="Wikipedia"><img src="beaker://assets/search-engines/wikipedia.png"></a>
        </div>
      </div>
    `
  }

  renderItem (item) {
    switch (item.resultType) {
      case 'person': return html`<search-person-result .user=${this.user} .item=${item} highlightNonce=${this.highlightNonce}></search-person-result>`
      case 'dat': return html`<search-dat-result userUrl=${this.user.url} .item=${item} highlightNonce=${this.highlightNonce}></search-dat-result>`
      case 'bookmark': return html`<search-bookmark-result fsUrl=${this.fs.url} userUrl=${this.user.url} .item=${item} highlightNonce=${this.highlightNonce}></search-bookmark-result>`
      case 'status': return html`<search-status-result .user=${this.user} .item=${item} highlightNonce=${this.highlightNonce}></search-status-result>`
    }
  }

  // events
  // =

  onChangeFilter (e) {
    this.currentFilter = e.detail.id
    QP.setParams({subview: this.currentFilter})
    this.load()
  }
}
customElements.define('search-view', SearchView)