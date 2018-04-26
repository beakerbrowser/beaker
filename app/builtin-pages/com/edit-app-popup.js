/* globals beaker DatArchive */

import yo from 'yo-yo'
import closeIcon from '../icon/close'

// globals
// =

var resolve
var reject

// exported api
// =

export function render ({name = '', url = '', isCreating = false}) {
  return yo`
    <div id="edit-app-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">${isCreating ? 'Create' : 'Edit'} app (advanced)</span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="name-input">App domain name</label>
            <input required type="text" id="name-input" name="name" value=${name} placeholder="Short name (eg 'news', 'photos')" />

            <label for="url-input">App content</label>
            <input required type="text" id="url-input" name="url" value=${url} placeholder="URL or folder path" />
            <div>
              <a class="btn" onclick=${onClickBrowseLocal}>Browse local folders</a>
              <a class="btn" onclick=${onClickBrowseDats}>Browse Dat archives</a>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy} tabindex="2">Cancel</button>
            <button type="submit" class="btn primary" tabindex="1">Save</button>
          </div>

        </div>
      </form>
    </div>
  `
}

export function create (opts) {
  if (!opts) {
    opts = {isCreating: true}
  }

  // render interface
  var popup = render(opts)
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
  var popup = document.getElementById('edit-app-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

function setURL (url) {
  var input = document.querySelector('#url-input')
  input.value = url
}

// event handlers
// =

async function onClickBrowseLocal (e) {
  var paths = await beaker.browser.showOpenDialog({
    title: 'Choose a folder',
    properties: ['openDirectory', 'createDirectory']
  })
  if (paths[0]) {
    setURL(`file://${paths[0]}`)
  }
}

async function onClickBrowseDats (e) {
  var archive = await DatArchive.selectArchive({
    title: 'Choose an archive'
  })
  if (archive) {
    setURL(archive.url)
  }
}

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'edit-app-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({
    url: e.target.url.value,
    name: e.target.name.value
  })
  destroy()
}
