/* globals beaker */

import yo from 'yo-yo'
import {getBasicType} from '../../../lib/dat'
import {findParent} from '../../../lib/fg/event-handlers'
import closeIcon from '../../icon/close'

// globals
// =

var resolve
var reject

var isURLFocused = false
var suggestions = {}
var tmpURL = ''
var selectedSuggestion

// exported api
// =

export function create (url) {
  // reset
  suggestions = {}
  tmpURL = ''
  selectedSuggestion = false

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
  suggestions = await beaker.crawler.listSuggestions(tmpURL, {filterPins: true})
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
    <a onclick=${e => onClickURL(e, row.url, title)} href=${row.url} class="suggestion ${selectedSuggestion === row.url ? 'selected' : ''}" title=${title}>
      ${renderIcon(row)}
      <span class="title">${tmpURL ? title : trunc(title, 15)}</span>
    </a>
  `
}

function renderIcon (row) {
  if (getBasicType(row.type) === 'user') {
    return yo`<img class="favicon rounded" src="${row.url}/thumb" />`
  }
  return yo`<img class="favicon" src="beaker-favicon:32,${row.url}"/>`
}

// event handlers
// =

function onFocusURL () {
  if (!isURLFocused) {
    isURLFocused = true
    update()
  }
}

function onClickURL (e, url, title = '') {
  e.preventDefault()

  selectedSuggestion = url
  document.querySelector('input[name="url"]').value = url
  document.querySelector('input[name="title"]').value = title
  isURLFocused = false
  update()
}

async function onChangeURL (e) {
  tmpURL = e.target.value ? e.target.value.toLowerCase() : ''
  selectedSuggestion = false
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
