import yo from 'yo-yo'
import closeIcon from '../../icon/close'
import _debounce from 'lodash.debounce'
import * as toast from '../toast'

// globals
// =

let resolve
let reject

let changes
let srcs
let dst
let dstOrigin
let error
let isLoading

// exported api
// =

export function create (opts = {}) {
  isLoading = false
  srcs = opts.srcs
  dst = opts.dst || '/'
  error = null

  // parse out the origin
  let url = new URL(dst)
  dstOrigin = `dat://${url.hostname}`
  dst = url.pathname

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // load dry run info
  doDryRun()

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('editor-import-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// rendering
// =

function update () {
  yo.update(document.getElementById('editor-import-popup'), render())
}

function render () {
  return yo`
    <div id="editor-import-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">
            Import files
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        ${isLoading
          ? yo`<div class="body"><div class="loading"><span class="spinner"></span> Working...</div></div>`
          : yo`
            <div class="body">
              <div>
                <label for="title">Import to...</label>
                <input type="text" name="title" value=${dst} onkeyup=${onKeyupDst} />
              </div>

              ${error
                ? error.name === 'ParentFolderDoesntExistError'
                  ? yo`<div class="error">Target folder "${dst}" does not exist. <a class="link" onclick=${onClickCreateDst}>Create it?</a></div>`
                  : yo`<div class="error">${error.toString()}</div>`
                : ''}

              <label for="title">Files:</label>
              ${changes
                ? yo`
                  <div class="changes">
                    ${changes.removedFolders.map(path => yo`<div class="removed"><span class="fas fa-fw fa-minus-square"></span><span class="far fa-fw fa-folder"></span>${path}</div>`)}
                    ${changes.removedFiles.map(path => yo`<div class="removed"><span class="fas fa-fw fa-minus-square"></span><span class="far fa-fw fa-file"></span>${path}</div>`)}
                    ${changes.updatedFiles.map(path => yo`<div class="updated"><span class="fas fa-fw fa-pen-square"></span><span class="far fa-fw fa-file"></span>${path}</div>`)}
                    ${changes.addedFolders.map(path => yo`<div class="added"><span class="fas fa-fw fa-plus-square"></span><span class="far fa-fw fa-folder"></span>${path}</div>`)}
                    ${changes.addedFiles.map(path => yo`<div class="added"><span class="fas fa-fw fa-plus-square"></span><span class="far fa-fw fa-file"></span>${path}</div>`)}
                  </div>
                ` : ''}
              <div class="actions">
                <button type="button" class="btn" onclick=${destroy}>Cancel</button>
                <button type="submit" class="btn primary">Import files</button>
              </div>
            </div>
          `}
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

function onKeyupDst (e) {
  dst = e.target.value
  doDryRunDebounced()
}

async function onClickCreateDst (e) {
  try {
    let archive = new DatArchive(dstOrigin)
    await archive.mkdir(dst)
    doDryRun()
  } catch (e) {
    toast.create(e.toString(), 'error')
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'editor-import-popup') {
    destroy()
  }
}

async function onSubmit (e) {
  e.preventDefault()
  try {
    isLoading = true
    update()

    let constructedDst = dstOrigin + (dst.startsWith('/') ? dst : `/${dst}`)
    for (let src of srcs) {
      await DatArchive.importFromFilesystem({src, dst: constructedDst, ignore: ['dat.json'], inplaceImport: false})
    }
  } catch (e) {
    toast.create(e.toString(), 'error')
    isLoading = false
    update()
    return
  }
  resolve({})
  destroy()
}

// business logic
// =

async function doDryRun () {
  try {
    isLoading = true
    update()

    error = null
    changes = []
    let constructedDst = dstOrigin + (dst.startsWith('/') ? dst : `/${dst}`)
    for (let src of srcs) {
      changes.push(await DatArchive.importFromFilesystem({src, dst: constructedDst, ignore: ['dat.json'], inplaceImport: false, dryRun: true}))
    }
    changes = mergeChanges(changes)
    console.log('Dry run:', changes)
  } catch (e) {
    changes = null
    error = e
  }

  isLoading = false
  update()
}
const doDryRunDebounced = _debounce(doDryRun, 500)

function mergeChanges (changes) {
  return changes.reduce((agg, change) => {
    if (!agg) return change
    for (let k in change) {
      if (typeof change[k] === 'number') {
        agg[k] += change[k]
      } else if (Array.isArray(change[k])) {
        agg[k] = agg[k].concat(change[k])
      }
    }
    return agg
  })
}