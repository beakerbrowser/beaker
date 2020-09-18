import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { getRecordType, typeToQuery } from '../records.js'
import css from '../../css/com/record-feed.css.js'
import { emit } from '../dom.js'

import './record.js'

const DEFAULT_SEARCH_PATH_QUERIES = [
  typeToQuery('blogpost'),
  typeToQuery('bookmark'),
  typeToQuery('microblogpost'),
  typeToQuery('comment'),
  typeToQuery('page')
]

export class RecordFeed extends LitElement {
  static get properties () {
    return {
      pathQuery: {type: Array},
      showDateTitles: {type: Boolean, attribute: 'show-date-titles'},
      dateTitleRange: {type: String, attribute: 'date-title-range'},
      forceRenderMode: {type: String, attribute: 'force-render-mode'},
      title: {type: String},
      sort: {type: String},
      limit: {type: Number},
      filter: {type: String},
      sources: {type: Array},
      results: {type: Array},
      emptyMessage: {type: String, attribute: 'empty-message'},
      noMerge: {type: Boolean, attribute: 'no-merge'},
      profileUrl: {type: String, attribute: 'profile-url'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.pathQuery = undefined
    this.showDateTitles = false
    this.dateTitleRange = undefined
    this.forceRenderMode = undefined
    this.title = undefined
    this.sort = 'ctime'
    this.limit = undefined
    this.filter = undefined
    this.sources = undefined
    this.results = undefined
    this.emptyMessage = undefined
    this.noMerge = false
    this.profileUrl = ''

    // query state
    this.activeQuery = undefined
    this.abortController = undefined
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
    } else if (changedProperties.has('pathQuery') && changedProperties.get('pathQuery') != this.pathQuery) {
      // NOTE ^ to correctly track this, the query arrays must be reused
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
    var results = []
    if (this.pathQuery?.[0] === 'notifications') {
      if (this.filter) {
        results = await beaker.index.search(this.filter, {
          notification: true,
          limit: this.limit,
          sort: 'rtime',
          reverse: true,
          includeContent: true
        })
      } else {
        results = await beaker.index.query({
          notification: true,
          limit: this.limit,
          sort: 'rtime',
          reverse: true
        })
      }
    } else {
      if (this.filter) {
        results = await beaker.index.search(this.filter, {
          path: this.pathQuery || DEFAULT_SEARCH_PATH_QUERIES,
          origin: this.sources,
          limit: this.limit,
          sort: 'crtime',
          reverse: true,
          includeContent: true
        })
      } else {
        // because we collapse results, we need to run the query until the limit is fulfilled
        let offset = 0
        do {
          let subresults = await beaker.index.query({
            path: this.pathQuery,
            origin: this.sources,
            limit: this.limit,
            offset,
            sort: 'crtime',
            reverse: true
          })
          if (subresults.length === 0) break
          
          offset += subresults.length
          if (!this.noMerge) {
            subresults = subresults.reduce(reduceMultipleActions, [])
          }
          results = results.concat(subresults)
        } while (results.length < this.limit)
      }
    }
    console.log(results)
    this.results = results
    this.activeQuery = undefined
    emit(this, 'load-state-updated', {detail: {isEmpty: this.results.length === 0}})
  }

  // rendering
  // =

  render () {
    if (!this.results) {
      return html``
    }
    if (!this.results.length) {
      if (!this.emptyMessage) return html``
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        ${this.title ? html`<h2 class="title">${this.title}</h2>` : ''}
        <div class="results empty">
          <span>${this.emptyMessage}</div></span>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.title ? html`<h2 class="title">${this.title}</h2>` : ''}
      ${this.renderResults()}
    `
  }

  renderResults () {
    this.lastResultNiceDate = undefined // used by renderDateTitle
    if (!this.filter) {
      return html`
        <div class="results">
          ${repeat(this.results, result => result.url, result => html`
            ${this.renderDateTitle(result)}
            ${this.renderNormalResult(result)}
          `)}
        </div>
      `
    }
    return html`
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
    var renderMode = this.forceRenderMode || ({
      'comment': 'card',
      'microblogpost': 'card',
      'subscription': 'action',
    })[getRecordType(result)] || 'link'
    return html`
      <beaker-record
        .record=${result}
        render-mode=${renderMode}
        show-context
        constrain-height
        profile-url=${this.profileUrl}
      ></beaker-record>
    `
  }

  renderSearchResult (result) {
    var renderMode = this.forceRenderMode || ({
      'comment': 'card',
      'microblogpost': 'card',
      'subscription': 'action',
    })[getRecordType(result)] || 'expanded-link'
    return html`
      <beaker-record
        .record=${result}
        render-mode=${renderMode}
        show-context
        profile-url=${this.profileUrl}
      ></beaker-record>
    `
  }

  // events
  // =
}

customElements.define('beaker-record-feed', RecordFeed)

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
    if (last.site.url === result.site.url && getRecordType(result) === 'subscription') {
      last.mergedItems = last.mergedItems || []
      last.mergedItems.push(result)
      return acc
    }
  }
  acc.push(result)
  return acc
}