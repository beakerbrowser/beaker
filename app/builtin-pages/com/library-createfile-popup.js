/* globals beaker */

import yo from 'yo-yo'
import closeIcon from '../icon/close'
import {join as joinPaths} from 'path'

// globals
// =

var resolve
var reject

var archive
var basePath
var createFolder
var fileName = ''
var hasConflict = false

// exported api
// =

export async function create (opts = {}) {
  archive = opts.archive
  basePath = opts.basePath || '/'
  createFolder = opts.createFolder
  fileName = ''

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
  var popup = document.getElementById('library-createfile-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-createfile-popup'), render())
}

function render () {
  return yo`
    <div id="library-createfile-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Create new ${createFolder ? 'folder' : 'file'}
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <p>
              The new ${createFolder ? 'folder' : 'file'} will be added to ${basePath}
            </p>

            <input name="filename" value=${fileName} placeholder=${createFolder ? 'Folder name' : 'Filename'} />

            ${hasConflict
              ? yo`<div class="message error">A file or folder already exists with that name.</div>`
              : ''}
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">Create</button>
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
  if (e.target.id === 'library-createfile-popup') {
    destroy()
  }
}

async function onSubmit (e) {
  e.preventDefault()
  hasConflict = false
  fileName = (e.target.filename.value || '').trim()
  if (!fileName) return
  if (await checkForConflicts(fileName)) {
    hasConflict = true
    update()
    return
  }
  resolve(joinPaths(basePath, fileName))
  destroy()
}

// helpers
// =

async function checkForConflicts (fileName) {
  var filePath = joinPaths(basePath, fileName)
  try {
    await archive.stat(filePath)
    return true // file already exists
  } catch (e) {
    return false
  }
}
