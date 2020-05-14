/* globals beaker */

import yo from 'yo-yo'
import closeIcon from '../../icon/close'

// globals
// =

let resolve
let reject

let title
let archiveKey
let localSyncPath
let hasUnpublishedChanges
let checkConflicts

let hasConflicts
let conflicts

// exported api
// =

export async function create (opts = {}) {
  title = opts.title || 'Untitled'
  archiveKey = opts.archiveKey || ''
  localSyncPath = opts.currentPath || opts.defaultPath || ''
  hasUnpublishedChanges = opts.hasUnpublishedChanges || false
  checkConflicts = opts.checkConflicts || false
  hasConflicts = false

  if (localSyncPath && localSyncPath !== opts.currentPath) {
    await checkForConflicts()
  }

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
  var popup = document.getElementById('library-localsyncpath-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('library-localsyncpath-popup'), render())
}

function render () {
  const path = localSyncPath

  return yo`
    <div id="library-localsyncpath-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Set local directory
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <p>
              The files for "${title}" will be synced to:
            </p>

            <div class="path-container">
              <input class="path nofocus" name="path" value=${path} onchange=${onChangeDirectory} />

              <button onclick=${onSelectDirectory} class="btn nofocus tooltip-container" data-tooltip="Choose different directory">
                <i class="fas fa-pencil-alt"></i>
              </button>
            </div>

            ${hasUnpublishedChanges && !hasConflicts
              ? yo`
                <div class="message info">
                  <p>
                    There are unpublished changes in the current local folder. Updating the local folder will cause these changes to be lost.
                  </p>
                  <p>
                    <a onclick=${destroy} href="beaker://library/dat://${archiveKey}#local-compare">Review unpublished changes</a>
                  </p>
                </div>`
              : ''}

            ${hasConflicts
              ? yo`
                <div class="message">
                  Note: Some files in the site will be overwritten by files in this folder.
                  <ul>
                    ${conflicts.map(conflict => yo`<li>${conflict}</li>`)}
                  </ul>
                </div>`
              : ''}
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
  if (e.target.id === 'library-localsyncpath-popup') {
    destroy()
  }
}

async function onChangeDirectory (e) {
  localSyncPath = e.target.value
  await checkForConflicts()
  update()
}

async function onSelectDirectory (e) {
  e.preventDefault()
  e.stopPropagation()

  let path = await beaker.browser.showOpenDialog({
    title: 'Select a folder',
    buttonLabel: 'Select folder',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: localSyncPath
  })

  if (path) {
    localSyncPath = path[0]
    await checkForConflicts()
    update()
  }
}

function onSubmit (e) {
  e.preventDefault()
  resolve({path: e.target.path.value})
  destroy()
}

// helpers
// =

async function checkForConflicts () {
  if (!checkConflicts) return
  let res = await beaker.archives.validateLocalSyncPath(archiveKey, localSyncPath)
  hasConflicts = res.hasConflicts
  conflicts = res.conflicts
}
