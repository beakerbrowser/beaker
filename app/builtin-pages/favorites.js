/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

const yo = require('yo-yo')
const co = require('co')

// globals
// =

// bookmarks, cached in memory
var bookmarks = []
var isIPFSDaemonActive = beakerBrowser.isIPFSDaemonActive()

// main
// =

co(function*() {
  // get the bookmarks, ordered by # of views
  bookmarks = yield beakerBookmarks.list()
  bookmarks = bookmarks || []
  render()
})

// rendering
// =

function render () {
  const renderRow = (row, i) => row.isEditing ? renderRowEditing(row, i) : renderRowDefault(row, i)

  const renderRowEditing = (row, i) => yo`<div class="ll-row ll-row-is-editing" data-row=${i}>
    <span class="ll-link">
      <div class="ll-inputs">
        <input name="title" value=${row.editTitle} onkeyup=${onKeyUp(i)} />
        <input name="url" value=${row.editUrl} onkeyup=${onKeyUp(i)} />
      </div>
    </div>
  </div>`

  const renderRowDefault = (row, i) => yo`<div class="ll-row" data-row=${i}>
    <a class="ll-link" href=${row.url} title=${row.title}>
      <img class="favicon" src=${'beaker-favicon:'+row.url} />
      <span class="ll-title">${row.title}</span>
    </a>
    <div class="ll-actions">
      <span class="icon icon-pencil" onclick=${onClickEdit(i)} title="Edit bookmark"></span>
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
    <div class="favorites big links-list">
      <div class="ll-heading">
        Favorites
        <small class="ll-heading-right">
          ${ isIPFSDaemonActive ? yo`<a href="http://localhost:5001/webui" title="IPFS Dashboard"><span class="icon icon-globe"></span> IPFS Dashboard</a>` : '' }
          <a href="https://groups.google.com/forum/#!forum/beaker-browser" title="Feedback and Discussion"><span class="icon icon-mail"></span> Mailing List</a>
          <a href="https://github.com/beakerbrowser/beaker/issues" title="Report Bug"><span class="icon icon-attention"></span> Report Bug</a>
          <a href="https://beakerbrowser.com/docs/" title="Get Help"><span class="icon icon-lifebuoy"></span> Help</a>
        </small>
      </div>
      ${bookmarks.map(renderRow)}
      ${helpEl}
    </div>
  </div>`)
}

// event handlers
// =

function onClickEdit (i) {
  return e => {
    e.preventDefault()
    e.stopPropagation()

    // capture initial value
    bookmarks[i].editTitle = bookmarks[i].title
    bookmarks[i].editUrl = bookmarks[i].url

    // enter edit-mode
    bookmarks[i].isEditing = true
    render()
    document.querySelector(`[data-row="${i}"] input`).focus()
  }
}

function onKeyUp (i) {
  return e => {
    // enter-key
    if (e.keyCode == 13) {
      // capture the old url
      var oldUrl = bookmarks[i].url

      // update values
      bookmarks[i].title = document.querySelector(`[data-row="${i}"] [name="title"]`).value
      bookmarks[i].url = document.querySelector(`[data-row="${i}"] [name="url"]`).value

      // exit edit-mode
      bookmarks[i].isEditing = false
      render()

      // save in backend
      beakerBookmarks.changeTitle(oldUrl, bookmarks[i].title)
      beakerBookmarks.changeUrl(oldUrl, bookmarks[i].url)
    }

    // escape-key
    else if (e.keyCode == 27) {
      // exit edit-mode
      bookmarks[i].isEditing = false
      render()
    }

    // all else
    else {
      // update edit values
      if (e.target.name == 'title')
        bookmarks[i].editTitle = e.target.value
      if (e.target.name == 'url')
        bookmarks[i].editUrl = e.target.value
    }

  }
}

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