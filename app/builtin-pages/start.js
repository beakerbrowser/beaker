import * as yo from 'yo-yo'

// load bookmarks from local storage
var bookmarks
try { bookmarks = JSON.parse(localStorage.bookmarks) }
catch (e) {
  // set defaults
  bookmarks = [
    { name: 'Beaker Project Home', url: 'https://github.com/pfraze/beaker' },
    { name: 'Beaker Issues', url: 'https://github.com/pfraze/beaker/issues' },
  ]
}

// render
// =

function renderBookmarks() {
  return yo`<tbody>
    ${bookmarks.map((b, i) => {
      return yo`<tr onclick=${onClickBookmark.bind(window, i)}>
        <td>${b.name}</td>
        <td class="secondary-column">${b.url}</td>
      </tr>`
    })}
  </tbody>`
}

var bookmarksTBody = renderBookmarks()
document.querySelector('#bookmarks').appendChild(bookmarksTBody)

// event handlers
// =

function onClickBookmark (i) {
  window.location = bookmarks[i].url
}