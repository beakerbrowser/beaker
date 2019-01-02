/* globals beaker */

import yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import closeIcon from '../../icon/close'

const BUILTIN_PAGES = [
  {title: 'Feed', url: 'beaker://feed'},
  {title: 'Library', url: 'beaker://library'},
  {title: 'Search', url: 'beaker://search'},
  {title: 'Bookmarks', url: 'beaker://bookmarks'},
  {title: 'History', url: 'beaker://history'},
  {title: 'Watchlist', url: 'beaker://watchlist'},
  {title: 'Downloads', url: 'beaker://downloads'},
  {title: 'Settings', url: 'beaker://settings'},
]

// globals
// =

var resolve
var reject

var isURLFocused = false
var suggestions = []
var tmpURL = ''

// exported api
// =

export function create (url) {
  // reset
  suggestions = []
  tmpURL = ''

  // render interface
  var popup = render(url)
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // trigger suggestions load
  loadSuggestions()

  // select input
  var input = popup.querySelector('input')
  input.focus()
  input.select()

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('add-pinned-bookmark-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// data
// =

async function loadSuggestions () {
  var query = tmpURL
  suggestions = []

  const filterFn = a => ((a.url || a.href).includes(query) || (a.title && a.title.toLowerCase().includes(query)))

  // builtin pages
  var builtinResults = BUILTIN_PAGES
  builtinResults = builtinResults.filter(filterFn)
  builtinResults = builtinResults.slice(0, 4)
  builtinResults = builtinResults.map(a => {
    return {
      title: a.title,
      url: a.url,
      label: 'Application'
    }
  })
  suggestions = suggestions.concat(builtinResults)

  // bookmarks
  var bookmarkResults = await beaker.bookmarks.listPublicBookmarks()
  bookmarkResults = bookmarkResults.concat((await beaker.bookmarks.listPrivateBookmarks()))
  bookmarkResults = bookmarkResults.filter(b => !b.pinned && filterFn(b))
  bookmarkResults = bookmarkResults.slice(0, 6)
  bookmarkResults = bookmarkResults.map(b => {
    return {
      title: b.title,
      url: b.href,
      label: 'Bookmark'
    }
  })
  suggestions = suggestions.concat(bookmarkResults)

  // library
  var libraryResults = await beaker.archives.list()
  libraryResults = libraryResults.filter(filterFn)
  libraryResults = libraryResults.slice(0, 6)
  libraryResults = libraryResults.map(a => {
    return {
      title: a.title,
      url: a.url,
      label: 'Saved to Library'
    }
  })
  suggestions = suggestions.concat(libraryResults)

  // fetch history
  if (query) {
    var historyResults = await beaker.history.search(query)
    historyResults = historyResults.slice(0, 6)
    historyResults = historyResults.map(r => {
      return {
        title: r.title,
        url: r.url,
        label: r.url
      }
    })
    suggestions = suggestions.concat(historyResults)
  }

  // if a query has been used, sort to favor the shorter URLs
  // (this causes the root domains to go higher than their subresources, like beaker.com above beaker.com/foo)
  if (query) {
    suggestions.sort((a, b) => a.title.length - b.title.length)
  }

  // render
  update()
}

// rendering
// =

function render (url) {
  return yo`
    <div id="add-pinned-bookmark-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">Add pinned bookmark</span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="add-pinned-bookmark-body">
          <div class="form">
            <div>
              <label for="url-input" class="url-input">URL</label>
              <input type="text" id="url-input" name="url" oninput=${onFocusURL} onkeyup=${(e) => delay(onChangeURL, e)} required />

              <label for="title-input">Title</label>
              <input type="text" id="title-input" name="title" required />
            </div>

            <div class="actions">
              <button type="button" class="btn" onclick=${destroy}>Cancel</button>
              <button type="submit" class="btn primary">Save</button>
            </div>
          </div>
          <div class="suggestions">
            ${suggestions.map(renderSuggestion)}
          </div>
        </div>
      </form>
    </div>
  `
}

function update () {
  yo.update(document.getElementById('add-pinned-bookmark-popup'), render())
}

function renderSuggestion (row) {
  return yo`
    <a onclick=${e => onClickURL(e, row.url, row.title)} href=${row.url} class="autocomplete-result search-result ${row.class}">
      ${row.icon
        ? yo`<i class="icon ${row.icon}"></i>`
        : yo`<img class="icon favicon" src="beaker-favicon:32,${row.url}"/>`
      }

      <span class="title">${row.title}</span>

      ${row.label ? yo`<span class="label">— ${row.label || ''}</span>` : ''}
    </a>
  `
}

// event handlers
// =

function onFocusURL () {
  if (!isURLFocused) {
    isURLFocused = true
    update()

    window.addEventListener('click', onClickWhileURLFocused)
  }
}

function onClickURL (e, url, title = '') {
  e.preventDefault()
  tmpURL = url

  document.querySelector('input[name="url"]').value = url
  document.querySelector('input[name="title"]').value = title
  isURLFocused = false
  update()
}

async function onChangeURL (e) {
  tmpURL = e.target.value ? e.target.value.toLowerCase() : ''
  loadSuggestions()
}

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'add-pinned-bookmark-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({
    url: e.target.url.value,
    title: e.target.title.value
  })
  destroy()
}

// helpers
// =

function delay (cb, param) {
  window.clearTimeout(cb)
  setTimeout(cb, 150, param)
}
