import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

// state
var isEditing = false
var isReadOnly = false
var archive

// form variables
var title = ''
var description = ''
var localPath = ''
var createdBy

// exported api
// =

window.setup = async function (opts) {
  try {
    isEditing = !!opts.url
    isReadOnly = !!opts.isReadOnly
    if (opts.url) {
      // fetch archive info
      archive = new Archive(opts.url)
      await archive.setup()
    }

    // render
    var archiveInfo = archive ? archive.info : {userSettings: {}}
    title = opts.title || archiveInfo.title || ''
    description = opts.description || archiveInfo.description || ''
    localPath = opts.localPath || archiveInfo.userSettings.localPath || ''
    createdBy = opts.createdBy || undefined
    render()
  } catch (e) {
    console.error(e)
    // ditch out
    return beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

// event handlers
// =

window.addEventListener('keyup', e => {
  if (e.which === 27) {
    beakerBrowser.closeModal()
  }
})

function onChangeTitle (e) {
  title = e.target.value
}

function onChangeDescription (e) {
  description = e.target.value
}

async function onChooseFolder () {
  var folders = await beakerBrowser.showOpenDialog({
    title: 'Choose the folder to contain your site',
    buttonLabel: 'Select',
    properties: ['openDirectory', 'createDirectory', 'showHiddenFiles']
  })
  if (!folders) {
    return
  }
  localPath = folders[0]
  render()
}

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal()
}

async function onSubmit (e) {
  e.preventDefault()
  if (!localPath) return
  try {
    if (isReadOnly) {
      await beaker.archives.add(archive.url, {localPath})
      beakerBrowser.closeModal(null, true)
    } else if (isEditing) {
      await beaker.archives.update(archive.url, {title, description}, {localPath})
      beakerBrowser.closeModal(null, true)
    } else {
      var newArchive = await beaker.archives.create({title, description, createdBy}, {localPath})
      beakerBrowser.closeModal(null, {url: newArchive.url})
    }
  } catch (e) {
    beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }
}

// internal methods
// =

function render () {
  var canSubmit = !!localPath
  var uititle = isEditing
    ? `Editing ${renderArchiveTitle()}`
    : 'New site'
  var helpText = isEditing
    ? 'Update your site\'s title and description.'
    : 'Create a new site and add it to your library.'
  if (createdBy && !createdBy.startsWith('beaker:')) {
    helpText = 'This page wants to ' + helpText.toLowerCase()
  }

  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="edit-site-modal">
          <h2 class="title">${uititle}</h2>

          <p class="help-text">
            ${helpText}
          </p>

          <form onsubmit=${onSubmit}>
            <label for="path">Folder</label>
            <div class="input input-file-picker">
              <button type="button" class="btn" name="path" tabindex="1" onclick=${onChooseFolder}>Choose folder</button>
              <span>${localPath || yo`<span class="placeholder">Folder (required)</span>`}</span>
            </div>

            ${isReadOnly ? '' : yo`<div>
              <label for="title">Title</label>
              <input name="title" tabindex="2" value=${title || ''} placeholder="Title (optional)" onchange=${onChangeTitle} />

              <label for="desc">Description</label>
              <input name="desc" tabindex="3" value=${description || ''} placeholder="Description (optional)" onchange=${onChangeDescription} />
            </div>`}

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn ${isEditing ? ' primary' : ' success'}" tabindex="5" disabled=${!canSubmit}>
                ${isEditing ? 'Save' : 'Create site'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderArchiveTitle() {
  var t = archive.info.title ? `"${archive.info.title}"` : 'site'
  if (t.length > 100) {
    t = t.slice(0, 96) + '..."'
  }
  return t
}