/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// globals
// =

// bookmarks, cached in memory
var bookmarks = []


// exported API
// =

export function setup () {
}

export function show () {
  document.title = 'New tab'
  co(function*() {
    // get the bookmarks, ordered by # of views
    bookmarks = yield beakerBookmarks.list()
    bookmarks = bookmarks || []
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  const renderRow = (row, i) => yo`<div class="ll-row">
    <a class="ll-link" href=${row.url} title=${row.title}>
      <img class="favicon" src=${'beaker-favicon:'+row.url} />
      <span class="ll-title">${row.title}</span>
    </a>
    <div class="ll-actions">
      <span class="icon icon-cancel" onclick=${onClickDelete(i+9)} title="Delete bookmark"></span>
    </div>
  </div>`

  // optional help text
  var helpEl = ''
  if (bookmarks.length === 0) {
    helpEl = yo`<div class="ll-help">
      <span class="icon icon-info-circled"></span> Add bookmarks to fill this page
    </div>`
  }

  // render the top 9 big, the rest small
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="favorites links-list">
      <div class="ll-heading">Favorites</div>
      ${bookmarks.map(renderRow)}
      ${helpEl}
    </div>
  </div>`)
}

// event handlers
// =

function onClickDelete (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()
    
    // delete bookmark
    var b = bookmarks[i]
    bookmarks.splice(i, 1)
    beakerBookmarks.remove(b.url)
    render()
  }
}