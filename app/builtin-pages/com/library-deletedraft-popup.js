import yo from 'yo-yo'
import {pluralize} from '@beaker/core/lib/strings'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let masterTitle
let localSyncPath
let numUnpublishedRevisions

// exported api
// =

export function create (opts = {}) {
  masterTitle = opts.masterTitle
  localSyncPath = opts.localSyncPath
  numUnpublishedRevisions = opts.numUnpublishedRevisions

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('library-deletedraft-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-deletedraft-popup'), render())
}

function render () {
  return yo`
    <div id="library-deletedraft-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Delete this draft
          </span>

          <button title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </button>
        </div>

        <div class="body">
          ${numUnpublishedRevisions > 0
            ? yo`
              <p>
                This draft has <strong>${numUnpublishedRevisions} ${pluralize(numUnpublishedRevisions, 'unpublished revision')}</strong>. Are you
                sure you want to delete it from Beaker?
              </p>`
            : yo`
              <p>
                This draft is up-to-date with ${masterTitle}. Delete this draft from Beaker?
              </p>`
          }

          ${localSyncPath
            ? yo`
              <label for="deleteSyncPath-check" class="checkbox-container">
                <input type="checkbox" id="deleteSyncPath-check" name="deleteSyncPath"/>
                Also delete the files at ${localSyncPath}
              </label>`
            : ''}

          <div class="actions">
            ${numUnpublishedRevisions > 0
              ? yo`
                <button class="btn" onclick=${destroy}>
                  Cancel
                </button>`
              : yo`
                <div class="left">
                  <i class="fa fa-check"></i>
                  It's safe to delete this draft
                </div>`
            }

            <button type="submit" class="btn ${(numUnpublishedRevisions > 0) ? 'warning' : ''}">
              Delete draft
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
  if (e.target.id === 'library-deletedraft-popup') {
    destroy()
  }
}

function onSubmit (e) {
  const deleteSyncPath = e.target.deleteSyncPath ? e.target.deleteSyncPath.checked : false

  e.preventDefault()
  resolve({deleteSyncPath})
  destroy()
}
