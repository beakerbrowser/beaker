/* globals beaker */

import yo from 'yo-yo'
import {writeToClipboard} from '../../../lib/event-handlers'
import closeIcon from '../../icon/close'
import * as contextMenu from '../context-menu'
import * as toast from '../toast'

// globals
// =

var resolve
var reject

var isURLFocused = false
var suggestions = {}
var query = ''

// exported api
// =

export function create (url) {
  // reset
  suggestions = {}
  query = ''

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
  var popup = document.getElementById('explorer-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// data
// =

async function loadSuggestions () {
  suggestions = await beaker.crawler.listSuggestions(query)
  update()
}

// rendering
// =

function render (url) {
  var hasResults = !query || (Object.values(suggestions).filter(arr => arr.length > 0).length > 0)
  return yo`
    <div id="explorer-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <div class="filter-control">
            <input type="text" id="search-input" name="url" placeholder="Search" oninput=${onFocusSearch} onkeyup=${(e) => delay(onChangeQuery, e)} />
          </div>
          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="explorer-body">
          <div class="suggestions ${query ? 'query-results' : 'defaults'}">
            ${hasResults ? '' : yo`<div class="empty">No results</div>`}
            ${renderSuggestionGroup('apps', 'Applications')}
            ${renderSuggestionGroup('people', 'People')}
            ${renderSuggestionGroup('webPages', 'Web pages')}
            ${renderSuggestionGroup('imageCollections', 'Image collections')}
            ${renderSuggestionGroup('fileShares', 'File shares')}
            ${renderSuggestionGroup('bookmarks', 'Bookmarks')}
            ${renderSuggestionGroup('library', 'Saved to your Library')}
            ${renderSuggestionGroup('history', 'History')}
          </div>
        </div>
      </form>
    </div>
  `
}

function update () {
  yo.update(document.getElementById('explorer-popup'), render())
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
    <a href=${row.url} class="suggestion" title=${title} oncontextmenu=${onContextMenu}>
      ${renderIcon(row)}
      <span class="title">${query ? title : trunc(title, 15)}</span>
    </a>
  `
}

function renderIcon (row) {
  return yo`<img class="favicon" src="beaker-favicon:32,${row.url}"/>`
}

// event handlers
// =

function onFocusSearch () {
  if (!isURLFocused) {
    isURLFocused = true
    update()
  }
}

async function onChangeQuery (e) {
  query = e.target.value ? e.target.value.toLowerCase() : ''
  loadSuggestions()
}

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onContextMenu (e) {
  e.preventDefault()
  var url = e.currentTarget.getAttribute('href')
  var title = e.currentTarget.getAttribute('title')
  const items = [
    {icon: 'fa fa-external-link-alt', label: 'Open Link in New Tab', click: () => window.open(url)},
    {icon: 'fa fa-link', label: 'Copy Link Address', click: () => writeToClipboard(url)},
    {icon: 'fas fa-thumbtack', label: 'Pin to Start Page', click: pin}
  ]
  contextMenu.create({x: e.clientX, y: e.clientY, items})

  async function pin () {
    if (!(await beaker.bookmarks.isBookmarked(url))) {
      await beaker.bookmarks.bookmarkPrivate(url, {title: title})
    }
    await beaker.bookmarks.setBookmarkPinned(url, true)
    toast.create('Pinned to your start page')
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'explorer-popup') {
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
