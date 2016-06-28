/*
This uses the beaker.history API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

// globals
// =

// most-visited, cached in memory
var mostVisited = []


// exported API
// =

export function setup () {
}

export function show () {
  // fetch most visited
  beaker.history.getMostVisited({ offset: 0, limit: 50 }, (err, rows) => {
    mostVisited = rows || []
    console.log(rows)
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="most-visited links-list">
      ${mostVisited.map((row, i) => {
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
    </div>
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

  // render
  render()
}