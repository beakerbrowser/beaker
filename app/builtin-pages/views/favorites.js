/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'
import co from 'co'

// constants
// =

const FEEDBACK_FORM_URL = 'https://docs.google.com/forms/d/1bzALt_JzmM_N8B3aK29epE7_VIyZMe0QsCXh3LqPY2I/viewform'

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
      <span class="icon icon-cancel" onclick=${onClickDelete(i)} title="Delete bookmark"></span>
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
      <div class="ll-heading">
        Favorites
        <small class="ll-heading-right"><a href=${FEEDBACK_FORM_URL} title="Send feedback"><span class="icon icon-megaphone"></span> Send Feedback</a></small>
      </div>
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