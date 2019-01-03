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
var suggestions = {}
var tmpURL = ''

// exported api
// =

export function create (url) {
  // reset
  suggestions = {}
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
  suggestions = {}

  const filterFn = a => ((a.url || a.href).includes(query) || a.title.toLowerCase().includes(query))

  // builtin pages
  suggestions.apps = BUILTIN_PAGES.filter(filterFn)

  // bookmarks
  var bookmarkResults = await beaker.bookmarks.listPublicBookmarks()
  bookmarkResults = bookmarkResults.concat((await beaker.bookmarks.listPrivateBookmarks()))
  bookmarkResults = bookmarkResults.filter(b => !b.pinned && filterFn(b))
  bookmarkResults = bookmarkResults.slice(0, 12)
  suggestions.bookmarks = bookmarkResults.map(b => ({title: b.title, url: b.href}))

  // library
  var libraryResults = await beaker.archives.list({isSaved: true})
  libraryResults = libraryResults.filter(filterFn)
  suggestions.library = libraryResults.slice(0, 12)

  // fetch history
  if (query) {
    var historyResults = await beaker.history.search(query)
    suggestions.history = historyResults.slice(0, 12)
    suggestions.history.sort((a, b) => a.url.length - b.url.length)
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
          <div class="suggestions ${tmpURL ? 'query-results' : 'defaults'}">
            ${renderSuggestionGroup('history', 'History')}
            ${renderSuggestionGroup('apps', 'Applications')}
            ${renderSuggestionGroup('bookmarks', 'Bookmarks')}
            ${renderSuggestionGroup('library', 'Saved to your Library')}
          </div>
        </div>
      </form>
    </div>
  `
}

function update () {
  yo.update(document.getElementById('add-pinned-bookmark-popup'), render())
}

function renderSuggestionGroup (key, label) {
  var group = suggestions[key]
  if (!group || !group.length) return ''
  return yo`
    <div class="group">
      <div class="group-title">${label}</div>
      <div class="group-items">${group.map(renderSuggestion)}</div>
    </div>`
}

function renderSuggestion (row) {
  var title = row.title || 'Untitled'
  return yo`
    <a onclick=${e => onClickURL(e, row.url, title)} href=${row.url} class="suggestion" title=${title}>
      ${row.icon
        ? yo`<i class="icon ${row.icon}"></i>`
        : yo`<img class="icon favicon" src="beaker-favicon:32,${row.url}"/>`
      }

      <span class="title">${tmpURL ? title : trunc(title, 15)}</span>
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

function trunc (str, n) {
  if (str && str.length > n) {
    str = str.slice(0, n - 3) + '...'
  }
  return str
}

function delay (cb, param) {
  window.clearTimeout(cb)
  setTimeout(cb, 150, param)
}
