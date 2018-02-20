import yo from 'yo-yo'
import {findParent} from '../../lib/fg/event-handlers'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let localFilesPath
let isDownloadingFiles
let title
let forkInfo

// exported api
// =

export function create (opts = {}) {
  localFilesPath = opts.defaultPath || ''
  forkInfo = opts.forkInfo || {}
  title = opts.title || 'Untitled'

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
  var popup = document.getElementById('library-workspace-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-workspace-popup'), render())
}

function render () {
  const path = localFilesPath

  return yo`
    <div id="library-workspace-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            ${forkInfo.isFork
              ? `Make a copy of ${title}`
              : 'Set workspace directory'
            }
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          ${forkInfo.isFork
            ? yo`
              <div>
                <label for="title">Title</label>
                <input type="text" name="title" value=${title}/>
              </div>`
            : ''
          }

          <div>
            ${forkInfo.isFork ? yo`<label>Workspace directory</label>` : ''}

            <p>
              The files for "${title}" will be saved at:
            </p>

            <div class="path-container">
              <code class="path">${path}</code>

              <button onclick=${onSelectDirectory} class="btn nofocus tooltip-container" data-tooltip="Choose different directory">
                <i class="fa fa-pencil"></i>
              </button>
            </div>

            <input type="hidden" name="path" value=${path}/>
          </div>

          ${forkInfo.isFork ?
            yo`
              <div class="download-status">
                <div class="progress-ui small ${forkInfo.archive.progress.isComplete ? 'green' : 'blue'}">
                  <div style="width: ${forkInfo.archive.progress.current}%" class="completed">
                  </div>

                  ${forkInfo.archive.progress.isComplete
                    ? yo`<div class="label">All files downloaded</div>`
                    : ''
                  }
                </div>
              </div>`
            : ''
          }

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            ${forkInfo.isFork && !forkInfo.archive.progress.isComplete
              ? yo`
                <button type="button" class="button" onclick=${onClickDownloadFiles}>
                  ${isDownloading
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
  if (e.target.id === 'library-workspace-popup') {
    destroy()
  }
}

async function onSelectDirectory () {
  let path = await beaker.browser.showOpenDialog({
    title: 'Select a folder',
    buttonLabel: 'Select folder',
    properties: ['openDirectory', 'createDirectory']
  })

  if (path) {
    localFilesPath = path[0]
    update()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve(e.target.path.value)
  destroy()
}