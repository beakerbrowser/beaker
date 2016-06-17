/*
This uses the beaker.bookmarks API, which is exposed by webview-preload to all sites loaded over the beaker: protocol
*/

import * as yo from 'yo-yo'

const KEYCODE_ENTER = 13
const KEYCODE_ESC = 27

// globals
// =

// bookmarks, cached in memory
var bookmarks = []

// main rendered element
var bookmarksTBody


// exported API
// =

export function setup () {
  // fetch bookmarks
  beaker.bookmarks.list((err, bs) => {
    bookmarks = bs || []

    // sort by title
    bookmarks.sort((a, b) => a.title.localeCompare(b.title))

    // do initial render
    bookmarksTBody = render()
    document.querySelector('.bookmarks').appendChild(bookmarksTBody)
  })
}

// rendering
// =

function render () {
  return yo`<tbody>
    ${bookmarks.map((b, i) => {
      // render row
      return yo`<tr>
        <td><a href=${b.url} title=${b.title}><span class="icon icon-window"></span> ${b.title}</a></td>
        <td class="actions">
          <span class="icon icon-cancel-squared" onclick=${onClickDelete.bind(window, i)} title="Delete bookmark"></span>
        </td>
      </tr>`
    })}
  </tbody>`
}

// event handlers
// =

function onClickDelete (i) {
  // remove
  var b = bookmarks[i]
  bookmarks.splice(i, 1)
  beaker.bookmarks.remove(b.url)

  // render
  yo.update(bookmarksTBody, render())
}