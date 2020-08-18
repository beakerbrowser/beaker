import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/resource-feed.css.js'
import { emit } from '../dom.js'

import './resource.js'

const DEFAULT_SEARCH_INDEXES = [
  'beaker/index/blogposts',
  'beaker/index/bookmarks',
  'beaker/index/microblogposts',
  'beaker/index/pages'
]

export class ResourceFeed extends LitElement {
  static get properties () {
    return {
      index: {type: Array},
      title: {type: String},
      showDateTitles: {type: Boolean, attribute: 'show-date-titles'},
      dateTitleRange: {type: String, attribute: 'date-title-range'},
      sort: {type: String},
      limit: {type: Number},
      filter: {type: String},
      sources: {type: Array},
      results: {type: Array},
      hideEmpty: {type: Boolean, attribute: 'hide-empty'},
      profileUrl: {type: String, attribute: 'profile-url'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.index = undefined
    this.title = ''
    this.showDateTitles = false
    this.dateTitleRange = undefined
    this.sort = 'ctime'
    this.limit = undefined
    this.filter = undefined
    this.sources = undefined
    this.results = undefined
    this.hideEmpty = false
    this.profileUrl = ''

    // query state
    this.activeQuery = undefined
    this.abortController = undefined

    // helper state
    this.lastQueryTime = undefined
  }

  get isLoading () {
    return !this.results || !!this.activeQuery
  }

  async load () {
    this.queueQuery()
  }

  updated (changedProperties) {
    if (typeof this.results === 'undefined') {
      if (!this.activeQuery) {
        this.queueQuery()
      }
      return
    } else if (changedProperties.has('filter') && changedProperties.get('filter') != this.filter) {
      this.queueQuery()
    } else if (changedProperties.has('index') && !isArrayEq(this.index, changedProperties.get('index'))) {
      this.results = undefined // clear results while loading
      this.queueQuery()
    } else if (changedProperties.has('sources') && !isArrayEq(this.sources, changedProperties.get('sources'))) {
      this.queueQuery()
    }
  }

  queueQuery () {
    if (!this.activeQuery) {
      this.activeQuery = this.query()
      this.requestUpdate()
    } else {
      if (this.abortController) this.abortController.abort()
      this.activeQuery = this.activeQuery.catch(e => undefined).then(r => {
        this.activeQuery = undefined
        this.queueQuery()
      })
    }
  }

  async query () {
    emit(this, 'load-state-updated')
    this.abortController = new AbortController()
    var startTs = Date.now()
    var results = []
    if (this.index?.[0] === 'notifications') {
      results = await beaker.indexer.listNotifications({
        filter: {search: this.filter},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
      })
    } else if (this.filter) {
      results = await beaker.indexer.search(this.filter, {
        filter: {index: this.index || DEFAULT_SEARCH_INDEXES, site: this.sources},
        limit: this.limit,
        sort: 'ctime',
        reverse: true
      })
    } else {
      // because we collapse results, we need to run the query until the limit is fulfilled
      let offset = 0
      do {
        let subresults = await beaker.indexer.list({
          filter: {index: this.index, site: this.sources},
          limit: this.limit,
          offset,
          sort: 'ctime',
          reverse: true
        })
        if (subresults.length === 0) break
        
        offset += subresults.length
        subresults = subresults.reduce(reduceMultipleActions, [])
        results = results.concat(subresults)
      } while (results.length < this.limit)
    }
    console.log(results)
    this.lastQueryTime = Date.now() - startTs
    this.results = results
    this.activeQuery = undefined
    emit(this, 'load-state-updated')
  }

  // rendering
  // =

  render () {
    if (!this.results) {
      return html``
    }
    if (!this.results.length) {
      if (this.hideEmpty) return html``
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        ${this.title ? html`<h2 class="results-header"><span>${this.title}</span></h2>` : ''}
        <div class="results empty">
          ${this.filter ? html`
            <span>No matches found for "${this.filter}".</div></span>
          ` : html`
            <span>Click "${this.createLabel}" to get started</div></span>
          `}
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.title ? html`<h2 class="results-header"><span>${this.title}</span></h2>` : ''}
      ${this.renderResults()}
    `
  }

  renderResults () {
    this.lastResultNiceDate = undefined // used by renderDateTitle
    if (!this.filter) {
      return html`
        <div class="results">
          ${repeat(this.results, result => result.url, result => this.renderNormalResult(result))}
        </div>
      `
    }
    const searchLink = (label, url) => {
      return html`
        <a class="search-engine" title=${label} href=${url} data-tooltip=${label}>
          <img src="beaker://assets/search-engines/${label.toLowerCase()}.png">
        </a>
      `
    }
    return html`
      ${this.lastQueryTime ? html`
        <div class="bragging">
          Query executed in ${this.lastQueryTime / 1e3} seconds
          &nbsp;|&nbsp;
          Try your search on:
          ${searchLink('DuckDuckGo', `https://duckduckgo.com?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Google', `https://google.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Twitter', `https://twitter.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Reddit', `https://reddit.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('GitHub', `https://github.com/search?q=${encodeURIComponent(this.filter)}`)}
          ${searchLink('YouTube', `https://www.youtube.com/results?search_query=${encodeURIComponent(this.filter)}`)}
          ${searchLink('Wikipedia', `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(this.filter)}`)}
        </div>
      ` : ''}
      <div class="results">
        ${repeat(this.results, result => result.url, result => this.renderSearchResult(result))}
      </div>
    `
  }

  renderDateTitle (result) {
    if (!this.showDateTitles) return ''
    var resultNiceDate = dateHeader(result.ctime, this.dateTitleRange)
    if (this.lastResultNiceDate === resultNiceDate) return ''
    this.lastResultNiceDate = resultNiceDate
    return html`
      <h2 class="results-header"><span>${resultNiceDate}</span></h2>
    `
  }
  
  renderNormalResult (result) {
    var renderMode = ({
      'beaker/index/microblogposts': 'card',
      'beaker/index/subscriptions': 'action',
    })[result.index] || 'link'
    return html`
      <beaker-resource
        .resource=${result}
        render-mode=${renderMode}
        profile-url=${this.profileUrl}
        @reply=${this.onReply}
      ></beaker-resource>
    `
  }

  renderSearchResult (result) {
    var renderMode = ({
      'beaker/index/microblogposts': 'card'
    })[result.index] || 'expanded-link'
    return html`
      <beaker-resource
        .resource=${result}
        render-mode=${renderMode}
        profile-url=${this.profileUrl}
        @reply=${this.onReply}
      ></beaker-resource>
    `
  }

  // events
  // =

  onClickReply (e) {
    e.preventDefault()
    beaker.panes.create(`${e.detail.resource.url}?reply`, {attach: false})
    // var pane = beaker.panes.getAttachedPane()
    // if (pane) {
    //   await beaker.panes.navigate(pane.id, url)
    // } else {
    //   await beaker.panes.create(url, {attach: true})
    // }
    // beaker.browser.openUrl(url, {setActive: true, addedPaneUrls: [`beaker://activity/?url=${url}`]})
  }
}

customElements.define('beaker-resource-feed', ResourceFeed)

function isArrayEq (a, b) {
  if (!a && !!b) return false
  if (!!a && !b) return false
  return a.sort().toString() == b.sort().toString() 
}

const HOUR = 1e3 * 60 * 60
const DAY = HOUR * 24
function dateHeader (ts, range) {
  const endOfTodayMs = +((new Date).setHours(23,59,59,999))
  var diff = endOfTodayMs - ts
  if (diff < DAY) return 'Today'
  if (diff < DAY * 6) return (new Date(ts)).toLocaleDateString('default', { weekday: 'long' })
  if (range === 'month') return (new Date(ts)).toLocaleDateString('default', { month: 'short', year: 'numeric' })
  return (new Date(ts)).toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })
}

function reduceMultipleActions (acc, result) {
  let last = acc[acc.length - 1]
  if (last) {
    if (last.site.url === result.site.url && result.index === 'beaker/index/subscriptions') {
      last.mergedItems = last.mergedItems || []
      last.mergedItems.push(result)
      return acc
    }
  }
  acc.push(result)
  return acc
}