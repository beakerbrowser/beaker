/*
This uses the beaker.bookmarks and beaker.history APIs, which are exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import * as multicb from 'multicb'

// globals
// =

// bookmarks, cached in memory
var bookmarks = []

// most-visited, cached in memory
var mostVisited = []


// exported API
// =

export function setup () {
}

export function show () {
  var done = multicb({ pluck: 1, spread: true })
  beaker.history.getMostVisited({ offset: 0, limit: 8 }, done())
  beaker.bookmarks.list(done())
  done((err, mvs, bs) => {
    mostVisited = mvs || []
    bookmarks = bs || []
    bookmarks.sort((a, b) => a.title.localeCompare(b.title))
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  const renderRow = opts => (row, i) => {
    return yo`<div class="ll-row">
      <a class="ll-link" href=${row.url} title=${row.title}>
        <img class="favicon" src=${'beaker-favicon:'+row.url} />
        <span class="ll-title">${row.title}</span>
      </a>
      <div class="ll-actions">
        <span class="icon icon-cancel-squared" onclick=${opts.onClickDelete(i)} title="Remove"></span>
      </div>
    </div>`
  }

  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="favorites links-list">
      ${mostVisited.length > 0 ? yo`<div class="ll-heading">Most Visited <span class="icon icon-chart-line"></span></div>` : ''}
      ${mostVisited.map(renderRow({ onClickDelete: onClickDeleteHistory }))}
      <div class="ll-heading">Bookmarked <span class="icon icon-star"></span></div>
      ${bookmarks.map(renderRow({ onClickDelete: onClickDeleteBookmark }))}
    </div>
  </div>`)
}

// event handlers
// =

function onClickDeleteHistory (i) {
  return e => {
    var mv = mostVisited[i]
    mostVisited.splice(i, 1)
    beaker.history.removeVisit(mv.url, console.log.bind(console))
    render()
  }
}

function onClickDeleteBookmark (i) {
  return e => {
    var b = bookmarks[i]
    bookmarks.splice(i, 1)
    beaker.bookmarks.remove(b.url)
    render()
  }
}