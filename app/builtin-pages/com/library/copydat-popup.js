import yo from 'yo-yo'
import prettyBytes from 'pretty-bytes'
import closeIcon from '../../icon/close'

// globals
// =

let resolve
let reject

let isDownloadingFiles
let title
let newTitle
let archive

// exported api
// =

export function create (opts = {}) {
  archive = opts.archive
  title = archive.info.title
  newTitle = archive.info.title ? (archive.info.title + ' (copy)') : ''

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)
  archive.progress.addEventListener('changed', update)
  popup.querySelector('input').focus()

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
  archive.progress.removeEventListener('changed', update)
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
            Make a copy ${title ? ('of ' + title) : ''} (${prettyBytes(archive.info.size)})
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="title">Title</label>
            <input type="text" name="title" value=${newTitle} onkeyup=${onKeyupTitle} />
          </div>

          ${(archive.info.isOwner || archive.progress.isComplete)
              ? ''
              : yo`
                <div class="downloader">
                  <div class="download-status">
                    <div class="progress-ui small ${archive.progress.isComplete ? 'green' : 'blue'} ${isDownloadingFiles ? 'active' : ''}">
                      <div style="width: ${archive.progress.current}%" class="completed"></div>
                    </div>
                  </div>

                  <div class="download-desc">
                    ${archive.progress.isComplete
                      ? 'Ready to copy.'
                      : 'Some files have not been downloaded and will be missing from your copy.'
                    }
                  </div>
                </div>`}

          <div class="actions">
            ${!archive.progress.isComplete
              ? [
                yo`<button type="submit" class="btn">
                  Create incomplete copy
                </button>`,
                yo`<button type="button" class="btn success" ${isDownloadingFiles ? 'disabled' : ''} onclick=${onClickDownloadFiles}>
                  ${isDownloadingFiles
                    ? [yo`<div class="spinner"></div>`, ' Downloading files...']
                    : 'Finish downloading files'
                  }
                </button>`
              ] : [
                yo`<button type="button" class="btn" onclick=${destroy}>Cancel</button>`,
                yo`<button type="submit" class="btn success">Create copy</button>`
              ]
            }
          </div>
        </div>
      </form>
    </div>
  `
}

// event handlers
// =

async function onClickDownloadFiles () {
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

function onKeyupTitle (e) {
  newTitle = e.target.value
}

function onClickWrapper (e) {
  if (e.target.id === 'library-copydat-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({title: e.target.title.value})
  destroy()
}
