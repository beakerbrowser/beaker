/* globals beaker */

const yo = require('yo-yo')
const moment = require('moment')
import renderSidebar from '../com/sidebar'
import renderTrashIcon from '../icon/trash'
import renderCloseIcon from '../icon/close'

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500

// visits, cached in memory
var visits = []
var filteredVisits = []
var isAtEnd = false
var query = []
var currentPeriodFilter = 'all'

// main
// =

render()
fetchMore(render)

// data
// =

var isFetching = false
function fetchMore (cb) {
  if (isFetching) { return }

  if (isAtEnd) { return cb() }

  isFetching = true
  beaker.history.getVisitHistory({ offset: visits.length, limit: 100 }).then(rows => {
    if (rows.length == 0) {
      isAtEnd = true
    } else {
      visits = visits.concat(rows || [])
      filteredVisits = visits
    }
    isFetching = false
    cb()
  })
}

// rendering
// =

function renderRows () {
  var rowEls = []
  var lastDate = moment().startOf('day').add(1, 'day')

  filteredVisits.forEach((row, i) => {
    // render a date heading if this post is from a different day than the last
    var oldLastDate = lastDate
    lastDate = moment(row.ts).endOf('day')
    if (!lastDate.isSame(oldLastDate, 'day')) {
      rowEls.push(yo`<h2>${ucfirst(niceDate(lastDate, { noTime: true }))}</h2>`)
    }

    // render row
    rowEls.push(
      yo`
        <div class="ll-row">
          <a class="link" href=${row.url} title=${row.title}>
            <img class="favicon" src=${'beaker-favicon:' + row.url}/>
            <span class="title">${row.title.replace(/[^\x00-\x7F]/g, "")}</span>
            <span class="url">${row.url}</span>
          </a>
          <div class="actions">
            <div class="action" onclick=${onClickDelete.bind(window, i)} title="Remove from history">
              ${renderTrashIcon()}
            </div>
          </div>
        </div>`)
  })

  // empty state
  if (rowEls.length == 0) {
    rowEls.push(yo`<em class="empty">No results</em>`)
  }

  return rowEls
}

function renderHistoryListing () {
  yo.update(document.querySelector('.links-list.history'), yo`
    <div class="links-list history">
      ${renderRows()}
    </div>`)
}

function render () {
  yo.update(
    document.querySelector('.history-wrapper'),
    yo`
      <div class="history-wrapper builtin-wrapper">
        ${renderSidebar('history')}
        <div onscroll=${onScrollContent}>
          <div class="builtin-sidebar">
            <h1>History</h1>
            <div class="section">
              <div onclick=${onUpdatePeriodFilter} data-period="all" class="nav-item ${currentPeriodFilter === 'all' ? 'active' : ''}">
                All history
              </div>
              <div onclick=${onUpdatePeriodFilter} data-period="today" class="nav-item ${currentPeriodFilter === 'today' ? 'active' : ''}">
                Today
              </div>
              <div onclick=${onUpdatePeriodFilter} data-period="yesterday" class="nav-item ${currentPeriodFilter === 'yesterday' ? 'active' : ''}">
                Yesterday
              </div>
            </div>
          </div>

          <div class="builtin-main">
            <div class="builtin-header">
              <div class="search-container">
                <input required autofocus onkeyup=${onFilterVisits} placeholder="Search your browsing history" type="text" class="search"/>
                <span onclick=${onClearQuery} class="close-container">
                  ${renderCloseIcon()}
                </span>
              </div>

              <div class="btn" onclick=${onClickDeleteBulk.bind(window)}>
                Clear browsing history
              </div>

              <select id="delete-period">
                <option value="day" selected>from today</option>
                <option value="week">from this week</option>
                <option value="month">from this month</option>
                <option value="all">from all time</option>
              </select>
            </div>

            <div class="links-list history">
              ${renderRows()}
            </div>
          </div>
        </div>
      </div>`)
}

// event handlers
// =

function onClearQuery () {
  document.querySelector('input.search').value = ''
  query = ''
  filteredVisits = visits
  render()
}

function onFilterVisits (e) {
  query = e.target.value.toLowerCase()
  filteredVisits = visits.filter(v => {
    return v.title.toLowerCase().includes(query) || v.url.toLowerCase().includes(query)
  })

  renderHistoryListing()
}

function onUpdatePeriodFilter (e) {
  // reset the search query
  query = ''
  document.querySelector('input.search').value = ''

  currentPeriodFilter = e.target.dataset.period
  if (currentPeriodFilter === 'all') {
    filteredVisits = visits
  } else {
    var dayOffset = currentPeriodFilter === 'yesterday' ? 1 : 0
    filteredVisits = visits.filter(v => {
      var ts = moment(v.ts)
      return ts.isSame(moment().endOf('day').subtract(dayOffset, 'day'), 'day')
    })
  }
  render()
}

function onScrollContent (e) {
  if (isAtEnd) { return }

  var el = e.target
  if (el.offsetHeight + el.scrollTop + BEGIN_LOAD_OFFSET >= el.scrollHeight) {
    // hit bottom
    fetchMore(render)
  }
}

function onClickDelete (i) {
  // remove
  var v = visits[i]
  visits.splice(i, 1)
  filteredVisits = visits
  beaker.history.removeVisit(v.url)
  render()
}

function onClickDeleteBulk () {
  var period = document.querySelector('#delete-period').value

  // clear all history
  if (period === 'all') {
    visits = []
    filteredVisits = visits
    beaker.history.removeAllVisits()
    render()
  } else {
    var threshold = moment().startOf(period).valueOf()

    // filter out visits that with a timestamp >= threshold
    visits = visits.filter(v => v.ts < threshold)
    filteredVisits = visits
    beaker.history.removeVisitsAfter(threshold)

    // fetch and render more visits if possible
    fetchMore(render)
  }
}

// internal methods
// =

function ucfirst (str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function niceDate (ts, opts) {
  const endOfToday = moment().endOf('day')
  if (typeof ts == 'number') { ts = moment(ts) }
  if (ts.isSame(endOfToday, 'day')) {
    if (opts && opts.noTime) { return 'today' }
    return ts.fromNow()
  } else if (ts.isSame(endOfToday.subtract(1, 'day'), 'day')) { return 'yesterday' } else if (ts.isSame(endOfToday, 'month')) { return ts.fromNow() }
  return ts.format('ll')
}
