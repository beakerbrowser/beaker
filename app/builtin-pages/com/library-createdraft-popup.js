import yo from 'yo-yo'
import closeIcon from '../icon/close'
import {shortenHash} from '@beaker/core/lib/strings'

// globals
// =

let resolve
let reject

let title
let newTitle
let archive
let master
let drafts

// exported api
// =

export function create (opts = {}) {
  archive = opts.archive
  title = archive.info.title
  master = opts.draftInfo ? opts.draftInfo.master : undefined
  drafts = opts.draftInfo.drafts || []
  newTitle = `${opts.draftInfo.master.title || ''} ${getNextDraftLabel(drafts)}`

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)
  archive.progress.addEventListener('changed', update)

  popup.querySelector('input').focus()
  popup.querySelector('input').setSelectionRange(newTitle.lastIndexOf('(') + 1, newTitle.lastIndexOf(')'))

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
            Create a draft
          </span>

          <button title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </button>
        </div>

        <div class="body">
          <p>
            Create a draft to make and review changes before you publish them.
          </p>

          <div>
            <label for="master">Create a draft copy of:</label>
            <select id="master">
              <option value=${master.url}>
                ${master.title} (${shortenHash(master.url)})
              </option>

              ${drafts.map(d => yo`
                <option value=${archive.url}>
                  ${d.title} (${shortenHash(d.url)})
                </option>
              `)}
            </select>
          </div>

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
  resolve({
    title: e.target.title.value,
    masterUrl: e.target.master.value
  })
  destroy()
}

function getNextDraftLabel (drafts) {
  var regex = /\(draft([\s\d]*)\)/
  var highestNum = 0
  for (let draft of drafts) {
    let match = regex.exec(draft.title)
    if (match) {
      let num = parseInt(match[1])
      if (Number.isNaN(num)) {
        num = 1
      }
      if (num > highestNum) {
        highestNum = num
      }
    }
  }
  if (highestNum === 0) return '(draft)'
  return `(draft ${highestNum + 1})`
}
