/* globals beaker DatArchive */

import yo from 'yo-yo'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let url
let description
let localSyncPath
let hasUnpublishedChanges
let checkConflicts

let hasConflicts
let conflicts

// exported api
// =

export async function create (opts = {}) {
  url = opts.url || ''
  description = opts.description || ''

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)
  popup.querySelector('input').focus()

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('add-watchlist-item-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('add-watchlist-item-popup'), render())
}

function render () {
  const path = localSyncPath

  return yo`
    <div id="add-watchlist-item-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Watchlist
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="url-input">URL</label>
            <input type="text" id="url-input" name="url" value=${url}/>
            <div class="error url-error"></div>

            <label for="description-input">Description</label>
            <input type="text" id="description-input" name="description" value=${description} placeholder="Optional" />

            <p>
              Beaker will search the network and notify you when the site is found.
            </p>
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">
              Add to watchlist
            </button>
          </div>
        </div>
      </form>
    </div>
  `
}

// event handlers
// =

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'add-watchlist-item-popup') {
    destroy()
  }
}

async function onSubmit (e) {
  e.preventDefault()

  url = e.target.url.value.trim()
  description = e.target.description.value.trim()
  description = description || url // fallback to the url
  if (!validate()) return

  // resolve DNS
  var urlp = new URL(url)
  try {
    urlp.host = await DatArchive.resolveName(url)
  } catch (e) {
    let urlError = document.querySelector('#add-watchlist-item-popup .url-error')
    urlError.textContent = 'No DNS record found for ' + urlp.host
    urlError.style.opacity = 1
    return
  }

  resolve({url, description})
  destroy()
}

function validate () {
  var success = true
  let urlError = document.querySelector('#add-watchlist-item-popup .url-error')

  urlError.style.opacity = 0

  if (url === '') {
    urlError.textContent = 'Please enter a site.'
    urlError.style.opacity = 1
    success = false
  } else if (!/(web|drive)?:\/\//.test(url) && !/[a-f0-9]{64}/.test(url)) {
    urlError.textContent = 'Please enter a valid drive:// or web:// url'
    urlError.style.opacity = 1
    success = false
  }

  return success
}