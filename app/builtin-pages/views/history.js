/*
This uses the beakerHistory API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import * as moment from 'moment'
import { niceDate } from '../../lib/time'

// globals
// =

// how many px from bottom till more is loaded?
const BEGIN_LOAD_OFFSET = 500

// visits, cached in memory
var visits = []
var isAtEnd = false

// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'History'
  fetchMore(render)
}

export function hide () {
  visits = []
}

// data
// =

var isFetching = false
function fetchMore (cb) {
  if (isFetching)
    return

  if (isAtEnd)
    return cb()

  isFetching = true
  beakerHistory.getVisitHistory({ offset: visits.length, limit: 100 }).then(rows => {
    if (rows.length == 0)
      isAtEnd = true
    else
      visits = visits.concat(rows || [])
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
      rowEls.push(yo`<div class="ll-heading">${niceDate(lastDate, { noTime: true })}</div>`)
    }

    // render row
    rowEls.push(yo`<div class="ll-row">
      <a class="ll-link" href=${row.url} title=${row.title}>
        <img class="favicon" src=${'beaker-favicon:'+row.url} />
        <span class="ll-title">${row.title}</span>
      </a>
      <div class="ll-actions">
        <span class="icon icon-cancel-squared" onclick=${onClickDelete.bind(window, i)} title="Remove from history"></span>
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
    <div class="history links-list">
      ${rowEls}
    </div>
  </div>`)
}

// event handlers
// =

function onScrollContent (e) {
  if (isAtEnd)
    return

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
  beakerHistory.removeVisit(v.url)
  render()
}