import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import _debounce from 'lodash.debounce'
import moment from 'moment'
import mainCSS from '../css/main.css.js'

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500
// how many to load in a batch?
const BATCH_SIZE = 20

export class HistoryApp extends LitElement {
  static get styles () {
    return mainCSS
  }

  constructor () {
    super()

    this.onUpdateSearchQueryDebounced = _debounce(this.onUpdateSearchQuery.bind(this), 500)
    this.visits = []
    this.isAtEnd = false
    this.query = ''
    this.currentPeriodFilter = 'all'
    this.lastRenderedDate = undefined
    this.isFetching = false

    this.fillPage()
    this.addEventListener('scroll', this.onScroll.bind(this))
  }

  async fetchMore () {
    if (this.isFetching) return
    if (this.isAtEnd) return
    return this.loadVisits(this.visits.length)
  }

  // load history until the scroll bar is visible, or no more history is found
  async fillPage () {
    this.visits.length = 0 // reset
    this.isAtEnd = false
    do {
      await this.fetchMore()
      this.requestUpdate()
    } while (this.shadowRoot.scrollHeight < this.shadowRoot.clientHeight && !this.isAtEnd)
  }

  async loadVisits (offset) {
    // reset isAtEnd if starting from 0
    if (offset === 0) {
      this.isAtEnd = false
    }

    this.isFetching = true
    var before
    var after
    if (this.currentPeriodFilter === 'today') {
      after = moment().startOf('day')
    } else if (this.currentPeriodFilter === 'yesterday') {
      after = moment().subtract(1, 'day').startOf('day')
      before = moment().startOf('day')
    }
    var rows = await beaker.history.getVisitHistory({
      before: +before,
      after: +after,
      offset,
      limit: BATCH_SIZE,
      search: this.query ? this.query : false
    })
    console.log('hit', rows)
    // did we reach the end?
    if (rows.length === 0) {
      this.isAtEnd = true
    }

    if (offset > 0) {
      // append to the end
      this.visits = this.visits.concat(rows)
    } else {
      // new results
      this.visits = rows
    }
    this.requestUpdate()

    this.isFetching = false
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <nav>
        <h1><img src="asset:favicon:beaker://history/"> History</h1>
        <div class="section">
          <a @click=${this.onUpdatePeriodFilter} data-period="all" class="${this.currentPeriodFilter === 'all' ? 'active' : ''}">
            <i class="fas fa-angle-right"></i>
            All history
          </a>
          <a @click=${this.onUpdatePeriodFilter} data-period="today" class="${this.currentPeriodFilter === 'today' ? 'active' : ''}">
            <i class="fas fa-angle-right"></i>
            Today
          </a>
          <a @click=${this.onUpdatePeriodFilter} data-period="yesterday" class="${this.currentPeriodFilter === 'yesterday' ? 'active' : ''}">
            <i class="fas fa-angle-right"></i>
            Yesterday
          </a>
        </div>
      </nav>
  
      <main>
        ${this.renderSubheader()}
        <div class="rows">${this.renderRows()}</div>
      </main>
    `
  }

  renderRows () {
    var rowEls = []
    this.lastRenderedDate = moment().startOf('day').add(1, 'day')

    this.visits.forEach((row, i) => {
      // render a date heading if this post is from a different day than the last
      var oldLastDate = this.lastRenderedDate
      this.lastRenderedDate = moment(row.ts).endOf('day')
      if (!this.lastRenderedDate.isSame(oldLastDate, 'day')) {
        rowEls.push(html`
          <div class="heading">
            ${ucfirst(niceDate(this.lastRenderedDate, { noTime: true }))}
          </div>
        `)
      }

      // render row
      rowEls.push(this.renderRow(row, i))
    })

    // empty state
    if (rowEls.length === 0) {
      if (this.isFetching) {
        rowEls.push(html`<p class="empty">Loading...</p>`)
      } else if (this.query) {
        rowEls.push(html`<p class="view empty">No results for "${this.query}"</p>`)
      } else {
        rowEls.push(html`<p class="empty">No history... yet!</p>`)
      }
    }

    return rowEls
  }

  renderClearHistoryButton () {
    if (this.query && this.query.length) return ''

    return html`
      <div class="clear-history">
        <a @click=${this.onClickDeleteBulk}>
          Clear history
        </a>
  
        <select id="delete-period">
          <option value="day" selected>from today</option>
          <option value="week">from this week</option>
          <option value="month">from this month</option>
          <option value="all">from all time</option>
        </select>
      </div>
    `
  }

  renderRow (row, i) {
    return html`
      <div class="row">
        <a class="link" href=${row.url} title=${row.title}>
          <img class="favicon" src=${'asset:favicon:' + row.url}/>
          <span class="title">${row.title.replace(/[^\x00-\x7F]/g, '')}</span>
          <span class="url">${getHostname(row.url)}</span>
        </a>
        <div class="actions">
          <div class="action" @click=${e => this.onClickDelete(e, i)} title="Remove from history">
            <i class="fa fa-times icon"></i>
          </div>
        </div>
      </div>
    `
  }

  renderSubheader () {
    return html`
      <div class="search-container">
        <input autofocus @keyup=${this.onUpdateSearchQueryDebounced} placeholder="Search your browsing history" type="text" class="search"/>
        ${this.query ? html`
          <span @click=${this.onClearQuery} class="close-btn">
            <span class="fas fa-fw fa-times"></span>
          </span>
        ` : ''}
        <i class="fa fa-search"></i>
      </div>

      ${this.renderClearHistoryButton()}
    `
  }

  // events
  // =

  onUpdateSearchQuery (e) {
    var newQuery = this.shadowRoot.querySelector('.search').value.toLowerCase()
    if (newQuery !== this.query) {
      this.query = newQuery
      this.fillPage()
    }
  }

  onClearQuery () {
    this.shadowRoot.querySelector('input.search').value = ''
    this.query = ''
    this.fillPage()
  }

  onUpdatePeriodFilter (e) {
    this.shadowRoot.querySelector('input.search').value = ''
    this.query = ''
    this.currentPeriodFilter = e.target.dataset.period
    this.fillPage()
  }

  onScroll (e) {
    if (this.isAtEnd) return

    var el = this
    if (el.offsetHeight + el.scrollTop + BEGIN_LOAD_OFFSET >= el.scrollHeight) {
      // hit bottom
      this.fetchMore()
    }
  }

  onClickDelete (e, i) {
    if (!confirm('Are you sure?')) return
    var v = this.visits[i]
    this.visits.splice(i, 1)
    beaker.history.removeVisit(v.url)
    this.requestUpdate()
  }

  onClickDeleteBulk () {
    if (!confirm('Are you sure?')) return
    var period = this.shadowRoot.querySelector('#delete-period').value

    // clear all history
    if (period === 'all') {
      this.visits = []
      beaker.history.removeAllVisits()
      this.requestUpdate()
    } else {
      var threshold = moment().startOf(period).valueOf()

      // filter out visits that with a timestamp >= threshold
      this.visits = this.visits.filter(v => v.ts < threshold)
      beaker.history.removeVisitsAfter(threshold)

      // fetch and render more visits if possible
      this.fetchMore()
    }
  }
}

customElements.define('history-app', HistoryApp)

// internal
// =

function getHostname (str) {
  try {
    const u = new URL(str)
    if (u.protocol === 'hyper:' && u.hostname.length === 64) {
      return 'hyper://' + shortenHash(u.hostname)
    }
    return u.hostname
  } catch (e) {
    return str
  }
}

function shortenHash (str, n = 6) {
  if (str.startsWith('hyper://')) {
    return 'hyper://' + shortenHash(str.slice('hyper://'.length).replace(/\/$/, '')) + '/'
  }
  if (str.length > (n + 5)) {
    return str.slice(0, n) + '..' + str.slice(-2)
  }
  return str
}

function ucfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function niceDate (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts === 'number') { ts = moment(ts) }
  if (ts.isSame(endOfToday, 'day')) {
    if (opts && opts.noTime) { return 'today' }
    return ts.fromNow()
  } else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day')) { return 'yesterday' } else if (ts.isSame(endOfToday, 'month')) { return ts.fromNow() }
  return ts.format('ll')
}
