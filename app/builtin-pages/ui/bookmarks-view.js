/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

// globals
// =

// bookmarks, cached in memory
var bookmarks = []


// exported API
// =

export function setup () {
}

export function show () {
  // fetch bookmarks
  beaker.bookmarks.list((err, bs) => {
    bookmarks = bs || []

    // sort by title
    bookmarks.sort((a, b) => a.title.localeCompare(b.title))

    // render
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <table class="bookmarks links-list">
      ${bookmarks.map((row, i) => {
        // render row
        return yo`<div class="ll-row">
          <a class="ll-link" href=${row.url} title=${row.title}>
            <span class="ll-title">${row.title}</span>
            <span class="ll-url">${row.url}</span>
          </div>
          <div class="ll-actions">
            <span class="icon icon-cancel-squared" onclick=${onClickDelete.bind(window, i)} title="Delete bookmark"></span>
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
  var b = bookmarks[i]
  bookmarks.splice(i, 1)
  beaker.bookmarks.remove(b.url)

  // render
  render()
}