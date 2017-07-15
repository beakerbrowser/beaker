/* globals beaker */

const yo = require('yo-yo')
const moment = require('moment')

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500

// visits, cached in memory
var visits = []
var isAtEnd = false

// main
// =

fetchMore(render)

// data
// =

var isFetching = false
function fetchMore (cb) {
  if (isFetching) { return }

  if (isAtEnd) { return cb() }

  isFetching = true
  beaker.history.getVisitHistory({ offset: visits.length, limit: 100 }).then(rows => {
    if (rows.length == 0) { isAtEnd = true } else { visits = visits.concat(rows || []) }
    isFetching = false
    cb()
  })
}

// rendering
// =

function render () {
  var rowEls = []
  var lastDate = moment().startOf('day').add(1, 'day')

  visits.forEach((row, i) => {
    // render a date heading if this post is from a different day than the last
    var oldLastDate = lastDate
    lastDate = moment(row.ts).endOf('day')
    if (!lastDate.isSame(oldLastDate, 'day')) {
      rowEls.push(yo`<h2 class="ll-heading">${ucfirst(niceDate(lastDate, { noTime: true }))}</h2>`)
    }

    // render row
    rowEls.push(
      yo`
        <div class="ll-row">
          <a class="link" href=${row.url} title=${row.title}>
            <img class="favicon" src=${'beaker-favicon:' + row.url} />
            <span class="title">${row.title}</span>
            <span class="url">${row.url}</span>
          </a>
          <div class="actions">
            <i class="fa fa-window-close" onclick=${onClickDelete.bind(window, i)} title="Remove from history"></i>
          </div>
        </div>`)
  })

  // empty state
  if (rowEls.length == 0) {
    rowEls.push(yo`<div class="ll-help">
      <span class="icon icon-info-circled"></span> Your history is empty
    </div>`)
  }

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content" onscroll=${onScrollContent}>
    <div class="page-toolbar">
     <button class="clear" onclick=${onClickDeleteBulk.bind(window)}>
       Clear Browsing History
     </button>
     <select id="delete-period">
       <option value="day" selected>from today</option>
       <option value="week">from this week</option>
       <option value="month">from this month</option>
       <option value="all">from all time</option>
     </select>
    </div>

    <div class="history links-list">
      ${rowEls}
    </div>
  </div>`)
}

// event handlers
// =

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
  beaker.history.removeVisit(v.url)
  render()
}

function onClickDeleteBulk () {
  var period = document.querySelector('#delete-period').value

  // clear all history
  if (period === 'all') {
    visits = []
    beaker.history.removeAllVisits()
    render()
  } else {
    var threshold = moment().startOf(period).valueOf()

    // filter out visits that with a timestamp >= threshold
    visits = visits.filter(v => v.ts < threshold)
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
