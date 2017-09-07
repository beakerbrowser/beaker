/* globals beaker beakerBrowser */

import * as yo from 'yo-yo'
import {Archive} from 'builtin-pages-lib'

// state
var isEditing = false
var archive
var type
var networked = true

// form variables
var title = ''
var description = ''

// exported api
// =

window.setup = async function (opts) {
  try {
    isEditing = !!opts.url
    if (opts.url) {
      // fetch archive info
      archive = new Archive(opts.url)
      await archive.setup()
    }

    // render
    var archiveInfo = archive ? archive.info : {userSettings: {}}
    title = opts.title || archiveInfo.title || ''
    description = opts.description || archiveInfo.description || ''
    type = opts.type
    networked = ('networked' in opts) ? opts.networked : true
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

function onClickCancel (e) {
  e.preventDefault()
  beakerBrowser.closeModal()
}

async function onSubmit (e) {
  e.preventDefault()
  try {
    if (isEditing) {
      await beaker.archives.update(archive.url, {title, description, type}, {networked})
      beakerBrowser.closeModal(null, true)
    } else {
      var newArchive = await DatArchive.create({title, description, type, networked})
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
  var uititle = isEditing
    ? `Editing ${renderArchiveTitle()}`
    : 'New site'
  var helpText = isEditing
    ? 'Update your site\'s title and description.'
    : 'Create a new site and add it to your library.'

  yo.update(document.querySelector('main'), yo`<main>
    <div class="modal">
      <div class="modal-inner">
        <div class="edit-site-modal">
          <h1 class="title">${uititle}</h1>

          <p class="help-text">
            ${helpText}
          </p>

          <form onsubmit=${onSubmit}>
            <label for="title">Title</label>
            <input autofocus name="title" tabindex="2" value=${title || ''} placeholder="Title" onchange=${onChangeTitle} />

            <label for="desc">Description</label>
            <textarea name="desc" tabindex="3" placeholder="Description (optional)" onchange=${onChangeDescription}>${description || ''}</textarea>

            <div class="form-actions">
              <button type="button" onclick=${onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn ${isEditing ? ' primary' : ' success'}" tabindex="5">
                ${isEditing ? 'Save' : 'Create site'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>`)
}

function renderArchiveTitle () {
  var t = archive.info.title ? `"${archive.info.title}"` : 'site'
  if (t.length > 100) {
    t = t.slice(0, 96) + '..."'
  }
  return t
}
