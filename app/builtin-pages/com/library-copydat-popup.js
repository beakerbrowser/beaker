import yo from 'yo-yo'
import {findParent} from '../../lib/fg/event-handlers'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let isDownloadingFiles
let title
let archive

// exported api
// =

export function create (opts = {}) {
  archive = opts.archive
  title = archive.info.title || 'Untitled'

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
  var popup = document.getElementById('library-copydat-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-copydat-popup'), render())
}

function render () {
  return yo`
    <div id="library-copydat-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Make a copy of ${title}
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div class="download-status">
            <div class="progress-ui small ${archive.progress.isComplete ? 'green' : 'blue'}">
              <div style="width: ${archive.progress.current}%" class="completed">
              </div>

              ${archive.progress.isComplete
                ? yo`<div class="label">All files downloaded</div>`
                : ''
              }
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            ${!archive.progress.isComplete
              ? yo`
                <button type="button" class="button" onclick=${onClickDownloadFiles}>
                  ${isDownloadingFiles
                    ? 'Downloading files...'
                    : 'Finish downloading files'
                  }
                </button>`
              : ''
            }

            <button type="submit" class="btn success">
              Go
              <i class="fa fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      </form>
    </div>
  `
}

// event handlers
// =

async function onClickDownloadFiles (archive) {
  // listen to archive download progress
  await archive.startMonitoringDownloadProgress()
  archive.progress.addEventListener('changed', update)

  // render downloading state
  isDownloadingFiles = true
  update()

  // start downloading
  await archive.download('/')
  isDownloadingFiles = false
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
  if (e.target.id === 'library-copydat-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve(e.target.path.value)
  destroy()
}