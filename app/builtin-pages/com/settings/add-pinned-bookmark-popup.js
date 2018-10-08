/* globals beaker */

import yo from 'yo-yo'
import {findParent} from '../../../lib/fg/event-handlers'
import closeIcon from '../../icon/close'

// globals
// =

var resolve
var reject

let isURLFocused = false
let autocompleteResults = []
let tmpURL = ''

// exported api
// =

export function render (url) {
  return yo`
    <div id="add-pinned-bookmark-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">Add pinned bookmark</span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="url-input" class="url-input">URL</label>
            <div class="autocomplete-container">
              <input type="text" id="url-input" name="url" oninput=${onFocusURL} onkeyup=${(e) => delay(onChangeURL, e)} required />

              ${tmpURL && tmpURL.length && isURLFocused ? yo`
                <div class="autocomplete-results">${autocompleteResults.map(renderAutocompleteResult)}</div>`
              : ''}
            </div>

            <label for="title-input">Title</label>
            <input type="text" id="title-input" name="title" required />
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">Save</button>
          </div>
        </div>
      </form>
    </div>
  `
}

function update () {
  yo.update(document.getElementById('add-pinned-bookmark-popup'), render())
}

function renderAutocompleteResult (res, i) {
  return yo`
    <div onclick=${() => onClickURL(res.targetUrl, res.title)} class="autocomplete-result ${res.class || ''}">
      ${res.faviconUrl
        ? yo`<img class="icon favicon" src="beaker-favicon:${res.faviconUrl}"/>`
        : yo`<i class="icon ${res.icon}"></i>`
      }

      <span class="title">${res.title}</span>

      ${res.label ? yo`<span class="label">— ${res.label || ''}</span>` : ''}
    </div>
  `
}

export function create (url) {
  // render interface
  var popup = render(url)
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

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

// event handlers
// =

function onFocusURL () {
  if (!isURLFocused) {
    isURLFocused = true
    update()

    window.addEventListener('click', onClickWhileURLFocused)
  }
}

function onClickURL (url, title = '') {
  tmpURL = url

  document.querySelector('input[name="url"]').value = url
  document.querySelector('input[name="title"]').value = title
  isURLFocused = false
  update()
}

async function onChangeURL (e) {
  autocompleteResults = []
  tmpURL = e.target.value ? e.target.value.toLowerCase() : ''

  if (tmpURL.length) {
    let bookmarkResults = await beaker.bookmarks.listPublicBookmarks()
    bookmarkResults = bookmarkResults.concat((await beaker.bookmarks.listPrivateBookmarks()))
    bookmarkResults = bookmarkResults.filter(b => !b.pinned && b.title.toLowerCase().includes(tmpURL)).slice(0, 6)
    bookmarkResults = bookmarkResults.map(b => {
      return {
        title: b.title,
        faviconUrl: b.href,
        targetUrl: b.href,
        label: b.href
      }
    })
    autocompleteResults = autocompleteResults.concat(bookmarkResults)

    let historyResults = await beaker.history.search(tmpURL.toLowerCase())
    historyResults = historyResults.slice(0, 3)
    historyResults = historyResults.map(r => {
      return {
        title: r.title,
        faviconUrl: r.url,
        targetUrl: r.url,
        label: r.url
      }
    })
    autocompleteResults = autocompleteResults.concat(historyResults)
  }

  // create a suggested URL
  let suggestedURL = tmpURL
  if (tmpURL.split('.').length < 2) {
    suggestedURL += '.com'
  }
  if (!(tmpURL.startsWith('http://') || tmpURL.startsWith('https://'))) {
    suggestedURL = 'https://' + suggestedURL
  }

  autocompleteResults.push({
    icon: 'fa fa-link',
    title: suggestedURL,
    targetUrl: suggestedURL
  })
  update()
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

function onClickWhileURLFocused (e) {
  if (findParent(e.target, 'autocomplete-results') || findParent(e.target, 'url-input')) {
    return
  } else {
    isURLFocused = false
    window.removeEventListener('click', onClickWhileURLFocused)
    update()
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
