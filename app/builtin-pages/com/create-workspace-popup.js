// NOTE: this is not currently in use, but keeping it around just in case
// -tbv

import yo from 'yo-yo'
import slugify from 'slugify'
import closeIcon from '../icon/close'

// globals
// =
let directory = ''
let targetURL = ''
let localURL = ''
let title = ''
let description = ''
let currentStep = 0

var resolve
var reject

// events
// =

function onChangeWorkspaceDirectory (e) {
  directory = e.target.files[0].path
  update()
}

async function onSelectDat (e) {
  var archive = await DatArchive.selectArchive({
    title: 'Choose a target archive',
    buttonLabel: 'Select',
    filters: {isOwner: true}
  })
  if (archive) {
    const info = await archive.getInfo()

    targetURL = archive.url
    title = info.title
    description = info.description
    localURL = localURL.length ? localURL : slugify(title).toLowerCase()
    update()
  }
}

function onInputTitle (e) {
  title = e.target.value
  update()
}

function onInputDescription (e) {
  description = e.target.value
  update()
}

function onInputName (e) {
  localURL = slugify(e.target.value).toLowerCase()
  update()
}

function onClickNext () {
  currentStep += 1
  update()
}

function onClickBack () {
  currentStep -= 1
  update()
}

// exported api
// =

export function render () {
  switch (currentStep) {
    case 0:
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
                <label for="title">Title</label>
                <input type="text" name="title" onkeyup=${onInputTitle} value=${title || ''}/>

                <label for="name">Local URL</label>
                <p>
                  The shortcut for previewing your workspace
                </p>
                <div class="name-input-container">
                  <span class="protocol">workspaces://</span>
                  <input required type="text" name="name" onkeyup=${onInputName} value=${localURL || ''}/>
                </div>

                <label for="description">Description</label>
                <textarea name="description" onkeyup=${onInputDescription}>${description || ''}</textarea>

                <span class="separator">or</span>
                <input type="hidden" name="url" value=${targetURL || ''}/>
                <button type="button" class="btn" onclick=${onSelectDat}>
                  Select an existing Dat archive
                </button>
              </div>

              <div class="actions">
                <button type="button" class="btn" onclick=${destroy}>Cancel</button>
                <button disabled=${!localURL.length} type="button" class="btn primary" onclick=${onClickNext}>
                  Next
                  <i class="fa fa-angle-right"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      `
    case 1:
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
                <label>Directory</label>
                <p>The directory on your computer that contains your workspace's files</p>
                <label for="path" class="btn" data-path=${directory}>
                  Select directory
                </label>
                <input id="path" name="path" type="file" webkitdirectory onchange=${onChangeWorkspaceDirectory}/>
              </div>

              <div class="actions">
                <button type="button" class="btn" onclick=${onClickBack}>
                  <i class="fa fa-angle-left"></i>
                  Back
                </button>
                <button disabled=${!(directory && localURL)} type="submit" class="btn success">Create workspace</button>
              </div>
            </div>
          </form>
        </div>
      `
  }
}

function update () {
  const popup = render()
  yo.update(document.getElementById('create-workspace-popup'), popup)
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

  title = ''
  description = ''
  directory = ''
  targetURL = ''
  localURL = ''
  currentStep = 0

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

async function onSubmit (e) {
  e.preventDefault()

  // create a new archive if an existing one wasn't selected
  if (!targetURL) {
    const archive = await DatArchive.create({title: title || '', description: description || ''})
    targetURL = archive.url
  }

  resolve({
    name: localURL,
    url: targetURL,
    path: directory
  })
  destroy()
}
