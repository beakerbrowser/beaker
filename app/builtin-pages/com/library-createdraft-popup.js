import yo from 'yo-yo'
import closeIcon from '../icon/close'

// globals
// =

let resolve
let reject

let title
let newTitle
let archive

// exported api
// =

export function create (opts = {}) {
  archive = opts.archive
  title = archive.info.title
  newTitle = archive.info.title ? (archive.info.title + ' (draft)') : ''

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
  var popup = document.getElementById('library-createdraft-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  archive.progress.removeEventListener('changed', update)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-createdraft-popup'), render())
}

function render () {
  return yo`
    <div id="library-createdraft-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Create a draft ${title ? ('for ' + title) : ''}
          </span>

          <p>
            Create a draft to make and review changes before publishing them.
          </p>

          <button title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </button>
        </div>

        <div class="body">
          <div>
            <label for="title">Draft name</label>
            <input type="text" name="title" value=${newTitle} onkeyup=${onKeyupTitle} />
          </div>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy}>Cancel</button>
            <button type="submit" class="btn success">Create draft</button>
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

function onKeyupTitle (e) {
  newTitle = e.target.value
}

function onClickWrapper (e) {
  if (e.target.id === 'library-createdraft-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({title: e.target.title.value})
  destroy()
}
