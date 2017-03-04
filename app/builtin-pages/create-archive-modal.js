import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

// state
var isEditing = false
var archive

// form variables
var title = ''
var description = ''
var createdBy

// exported api
// =

window.setup = async function (opts) {
  try {
    isEditing = !!opts.url
    if (opts.url) {
      // fetch archive info
      archive = new Archive(opts.url)
      await archive.setup('/')
    }
  } catch (e) {
    // ditch out
    return beakerBrowser.closeModal({
      name: e.name,
      message: e.message || e.toString(),
      internalError: true
    })
  }

  // render
  var archiveInfo = archive ? archiveInfo : {}
  title = opts.title || archiveInfo.title || ''
  description = opts.description || archiveInfo.description || ''
  createdBy = opts.createdBy || undefined
  render()
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

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal()
}

async function onSubmit (e) {
  e.preventDefault()
  try {
    if (isEditing) {
      // TODO
    } else {
      var url = await beaker.library.create({title, description, createdBy})
      beakerBrowser.closeModal(null, {url})
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
  var uititle = isEditing
    ? `Editing "${renderArchiveTitle()}"`
    : 'New site'
  var helpText = isEditing
    ? 'Update your site\'s title and description.'
    : 'Create a new site and add it to your library.'
  if (createdBy && !createdBy.startsWith('beaker:')) {
    helpText = 'This page would like to ' + helpText.toLowerCase()
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
            <label for="title">Title</label>
            <input name="title" tabindex="1" value=${title || ''} placeholder="Title" onchange=${onChangeTitle} />

            <label for="desc">Description</label>
            <input name="desc" tabindex="2" value=${description || ''} placeholder="Description" onchange=${onChangeDescription} />

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn" tabindex="3">Cancel</button>
              <button type="submit" class="btn success" tabindex="4">
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