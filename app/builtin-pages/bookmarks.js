/*
This uses the beakerBookmarks APIs, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

const yo = require('yo-yo')
const co = require('co')

// globals
//

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
  const renderRow = (row, i) =>
    row.isEditing ? renderRowEditing(row, i) : renderRowDefault(row, i)

  const renderRowEditing = (row, i) =>
    yo`
    <li class="ll-row ll-row-isEditing ll-link bookmarks__row bookmarks__row--editing" data-row=${i}>
      <div class="ll-link">
        <div class="ll-inputs bookmarks__inputs">
          <input name="title" value=${row.editTitle} onkeyup=${onKeyUp(i)} />
          <input name="url" value=${row.editUrl} onkeyup=${onKeyUp(i)} />
        </div>
      </div>
    </li>`

  const renderRowDefault = (row, i) =>
    yo`
      <li class="ll-row bookmarks__row" data-row=${i}>
        <a class="ll-link bookmark__link" href=${row.url} title=${row.title} />
          <img class="bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="bookmark__title">${row.title}</span>
        </a>
        <div class="ll-actions bookmark__actions">
          <i class="icon icon-pencil" onclick=${onClickEdit(i)} title="Edit bookmark"></i>
          <i class="icon icon-cancel" onclick=${onClickDelete(i)} title="Delete bookmark"></span>
        </div>
      </li>`

  var helpEl = ''
  if (bookmarks.length === 0) {
    helpEl = yo`<span class="bookmarks__info">No bookmarks.</span>`
  }

  yo.update(
    document.querySelector('.bookmarks-wrapper'),
      yo`
        <div class="bookmarks-wrapper">
          <h2>Bookmarks</h2>
          <ul class="links-list bookmarks">
            ${bookmarks.map(renderRow)}
            ${helpEl}
          </ul>
        </div>`)
}

// event handlers
// =

function onClickGridItem (item) {
  return e => {
    // ignore ctrl/cmd+click
    if (e.metaKey) return
    e.preventDefault()

    if (window.location.protocol == 'beaker:' && item.href.startsWith('beaker:')) {
      // just navigate virtually, if we're on and going to a beaker: page
      window.history.pushState(null, '', item.href)
    } else {
      // actually go to the page
      window.location = item.href
    }
  }
}


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
