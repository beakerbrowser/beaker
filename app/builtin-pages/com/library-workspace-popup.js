import yo from 'yo-yo'
import {findParent} from '../../lib/fg/event-handlers'
import closeIcon from '../icon/close'

// globals
// =

var resolve
var reject

let defaultPath
let localFilesPath

setup()
async function setup () {
  defaultPath = await beaker.browser.getSetting('workspace_default_path')
}

// exported api
// =

export function render (slugifiedName) {
  const path = localFilesPath ? localFilesPath : `${defaultPath}/${slugifiedName}`

  return yo`
    <div id="library-workspace-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">Set up a working directory</span>
          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <p>
              The files for this archive will be saved at:
            </p>

            <code>${path}</code>

            <input type="hidden" name="path" value=${path}/>
          </div>

          <div class="actions">
            <span onclick=${onSelectDirectory} class="link">
              Choose different directory
            </span>

            <button type="button" class="btn" onclick=${destroy}>Cancel</button>

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

function update () {
  yo.update(document.getElementById('library-workspace-popup'), render())
}

export function create (slugifiedName) {
  // render interface
  var popup = render(slugifiedName)
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