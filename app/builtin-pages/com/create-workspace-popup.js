import yo from 'yo-yo'
import closeIcon from '../icon/close'

// globals
// =

var resolve
var reject

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
            <div class="namespace-input-container">
              <label for="name">Name</label>
              <span class="protocol">workspaces://</span>
              <input id="name" name="name" type="text" required />
            </div>

            <label for="url">Target</label>
            <input name="url" value="dat://63f3fde2e1afbe3fbc3804fc53a9a764fe297f9779e686fd779fd7f7324cb077"/>

            <label for="path">Local folder</label>
            <input name="path" type="file" webkitdirectory required />
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn primary">Save</button>
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
  resolve({
    name: e.target.url.name,
    url: e.target.url.value,
    path: e.target.path.files[0].path
  })
  destroy()
}
