/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
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
  document.title = 'New tab'
  // get the bookmarks, ordered by # of views
  beakerBookmarks.list((err, bs) => {
    bookmarks = bs || []
    render()
  })
}

export function hide () {
}

// rendering
// =

function render () {
  // helper function to render big rows
  const renderBigRow = (row, i) => yo`<a class="lt-tile" href=${row.url} title=${row.title}>
    <span class="lt-actions"><span class="icon icon-cancel" onclick=${onClickDelete(i)} title="Delete bookmark"></span></span>
    <div class="lt-title">
      <img class="favicon" src=${'beaker-favicon:'+row.url} />
      ${row.title}
    </div>
    <div class="lt-url">${row.url}</div>
  </a>`

  // helper function to render small rows
  const renderSmallRow = (row, i) => yo`<div class="ll-row">
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
  if (bookmarks.length <= 9) {
    helpEl = yo`<div class="ll-help">
      <span class="icon icon-info-circled"></span> Add bookmarks to fill this page
    </div>`
  }

  // render the top 9 big, the rest small
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="favorites links-tiles">
      <div class="lt-inner">
        ${bookmarks.slice(0, 9).map(renderBigRow)}
      </div>
    </div>
    <div class="favorites links-list">
      ${bookmarks.slice(9).map(renderSmallRow)}
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