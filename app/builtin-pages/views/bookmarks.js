/* globals beaker */

const yo = require('yo-yo')
const co = require('co')

// globals
//

// bookmarks, cached in memory
var bookmarks = []

// main
// =

co(function * () {
  // get the bookmarks, ordered by # of views
  bookmarks = yield beaker.bookmarks.list()
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
    <li class="ll-row editing ll-link bookmarks__row bookmarks__row--editing" data-row=${i}>
      <div class="link">
        <div class="inputs bookmarks__inputs">
          <input name="title" value=${row.editTitle} onkeyup=${onKeyUp(i)} />
          <input name="url" value=${row.editUrl} onkeyup=${onKeyUp(i)} />
        </div>
      </div>
    </li>`

  const renderRowDefault = (row, i) =>
    yo`
      <li class="ll-row bookmarks__row" data-row=${i}>
        <a class="link bookmark__link" href=${row.url} title=${row.title} />
          <img class="favicon bookmark__favicon" src=${'beaker-favicon:' + row.url} />
          <span class="title bookmark__title">${row.title}</span>
          <span class="url bookmark__url">${row.url}</span>
        </a>
        <div class="actions bookmark__actions">
          <i class="fa fa-pencil" onclick=${onClickEdit(i)} title="Edit Bookmark"></i>
          <i class="fa fa-window-close" onclick=${onClickDelete(i)} title="Remove Bookmark"></span>
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
          <h1 class="ll-heading">Bookmarks</h1>
          <ul class="links-list bookmarks">
            ${bookmarks.map(renderRow)}
            ${helpEl}
          </ul>
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
    if (e.keyCode == 13) {
      // enter-key
      // capture the old url
      var oldUrl = bookmarks[i].url

      // update values
      bookmarks[i].title = document.querySelector(`[data-row="${i}"] [name="title"]`).value
      bookmarks[i].url = document.querySelector(`[data-row="${i}"] [name="url"]`).value

      // exit edit-mode
      bookmarks[i].isEditing = false
      render()

      // save in backend
      beaker.bookmarks.changeTitle(oldUrl, bookmarks[i].title)
      beaker.bookmarks.changeUrl(oldUrl, bookmarks[i].url)
    } else if (e.keyCode == 27) {
      // escape-key
      // exit edit-mode
      bookmarks[i].isEditing = false
      render()
    } else {
      // all else
      // update edit values
      if (e.target.name == 'title') { bookmarks[i].editTitle = e.target.value }
      if (e.target.name == 'url') { bookmarks[i].editUrl = e.target.value }
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
    beaker.bookmarks.remove(b.url)
    render()
  }
}
