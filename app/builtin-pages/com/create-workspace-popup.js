import yo from 'yo-yo'
import closeIcon from '../icon/close'
import * as toast from './toast'

// globals
// =
let directory = ''
let targetURL = ''

var resolve
var reject

// events
// =

function onChangeWorkspaceDirectory (e) {
  directory = e.target.files[0].path
  document.querySelector('#create-workspace-popup .error').innerText = ''
  document.querySelector('[data-path]').dataset.path = directory
}

async function onSelectDat (e) {
  var archive = await DatArchive.selectArchive({
    title: 'Choose a target archive',
    buttonLabel: 'Select',
    filters: {isOwner: true}
  })
  if (archive) {
    targetURL = archive.url
    document.querySelector('#create-workspace-popup .error').innerText = ''
    document.querySelector('[data-url]').dataset.url = archive.url
  }
}

// exported api
// =

export function render () {
  return yo`
    <div id="create-workspace-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">Create a new workspace</span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="name">Local URL</label>
            <p>
              The shortcut for previewing your workspace
            </p>
            <div class="name-input-container">
              <span class="protocol">workspaces://</span>
              <input required type="text" name="name"/>
            </div>

            <label for="url">Target URL</label>
            <p>
              The Dat archive that your changes will be published at
            </p>
            <button type="button" class="btn url" onclick=${onSelectDat} data-url=${targetURL}>
              Browse your archives
            </button>

            <label>Directory</label>
            <p>The directory on your computer that contains your workspace's files</p>
            <label for="path" class="btn" data-path=${directory}>
              Select directory
            </label>
            <input id="path" name="path" type="file" webkitdirectory onchange=${onChangeWorkspaceDirectory}/>

            <p class="error"></p>
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn success">Create workspace</button>
          </div>
        </div>
      </form>
    </div>
  `
}

export function create () {
  // render interface
  var popup = render()
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
  var popup = document.getElementById('create-workspace-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  directory = ''
  targetURL = ''
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
  if (e.target.id === 'create-workspace-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  if (!targetURL) {
    document.querySelector('#create-workspace-popup .error').innerText = 'Please choose a target Dat archive'
  } else if (!directory) {
    document.querySelector('#create-workspace-popup .error').innerText = 'Please choose a directory'
  } else {
    resolve({
      name: e.target.name.value,
      url: targetURL,
      path: e.target.path.files[0].path
    })
    destroy()
  }
}
