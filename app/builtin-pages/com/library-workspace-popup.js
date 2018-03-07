import yo from 'yo-yo'
import {findParent} from '../../lib/fg/event-handlers'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let title
let localFilesPath

// exported api
// =

export function create (opts = {}) {
  title = opts.title || 'Untitled'
  localFilesPath = opts.defaultPath || ''

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
            Set workspace directory
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <p>
              The files for "${title}" will be saved at:
            </p>

            <div class="path-container">
              <input class="path nofocus" name="path" value=${path} />

              <button onclick=${onSelectDirectory} class="btn nofocus tooltip-container" data-tooltip="Choose different directory">
                <i class="fa fa-pencil"></i>
              </button>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">
              Set directory
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
  if (e.target.id === 'library-workspace-popup') {
    destroy()
  }
}

async function onSelectDirectory (e) {
  e.preventDefault()
  e.stopPropagation()

  let path = await beaker.browser.showOpenDialog({
    title: 'Select a folder',
    buttonLabel: 'Select folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: localFilesPath
  })

  if (path) {
    localFilesPath = path[0]
    update()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({localFilesPath: e.target.path.value})
  destroy()
}