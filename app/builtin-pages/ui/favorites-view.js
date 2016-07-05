/*
This uses the beaker.bookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
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
  // get the bookmarks, ordered by # of views
  beaker.bookmarks.list((err, bs) => {
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
  const renderBigRow = (row, i) => yo`<a class="bll-row" href=${row.url} title=${row.title}>
    <div class="bll-title">
      <img class="favicon" src=${'beaker-favicon:'+row.url} />
      ${row.title}
      <span class="bll-actions"><span class="icon icon-cancel" onclick=${onClickDelete(i)} title="Delete bookmark"></span></span>
    </div>
    <div class="bll-url">${row.url}</div>
  </div>`

  // helper function to render small rows
  const renderSmallRow = (row, i) => yo`<div class="ll-row">
    <a class="ll-link" href=${row.url} title=${row.title}>
      <img class="favicon" src=${'beaker-favicon:'+row.url} />
      <span class="ll-title">${row.title}</span>
    </a>
    <div class="ll-actions">
      <span class="icon icon-cancel" onclick=${onClickDelete(i+8)} title="Delete bookmark"></span>
    </div>
  </div>`

  // render the top 8 big, the rest small
  yo.update(document.querySelector('#el-content'), yo`<div class="pane" id="el-content">
    <div class="favorites big-links-list">${bookmarks.slice(0, 8).map(renderBigRow)}</div>
    <div class="favorites links-list">${bookmarks.slice(8).map(renderSmallRow)}</div>
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
    beaker.bookmarks.remove(b.url)
    render()
  }
}