/*
This uses the beaker.history API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

// globals
// =

// visits, cached in memory
var visits = []


// exported API
// =

export function setup () {
}

export function show () {
  beaker.history.getVisitHistory({ offset: 0, limit: 50 }, (err, rows) => {
    visits = rows || []
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <table class="history links-list">
      ${visits.map((row, i) => {
        // render row
        return yo`<div class="ll-row">
          <a class="ll-link" href=${row.url} title=${row.title}>
            <span class="ll-title">${row.title}</span>
            <span class="ll-url">${row.url}</span>
          </div>
          <div class="ll-actions">
            <span class="icon icon-cancel-squared" onclick=${onClickDelete.bind(window, i)} title="Remove from history"></span>
          </div>
        </div>`
      })}
    </table>
  </div>`)
}

// event handlers
// =

function onClickDelete (i) {
  // remove
  // TODO
  // var b = bookmarks[i]
  // bookmarks.splice(i, 1)
  // beaker.bookmarks.remove(b.url)
  render()
}