import * as yo from 'yo-yo'
import * as modal from '../modal'

export function create (values, { title, isNew, helpText, onSubmit }) {
  var submitButtonCls = isNew ? 'btn success' : 'btn'
  var el = modal.create(({ close }) => {
    return yo`
      <div class="edit-site-modal">
        <h2 class="title">${title}</h2>

        <p class="help-text">
          ${helpText}
        </p>

        <form onsubmit=${onsubmit}>
          <label for="title">Title</label>
          <input name="title" tabindex="1" value=${values.title || ''} placeholder="Title" />

          <label for="desc">Description</label>
          <input name="desc" tabindex="2" value=${values.description || ''} placeholder="Description" />

          <div class="form-actions">
            <button onclick=${close} class="btn" tabindex="3">Cancel</button>
            <button type="submit" class=${submitButtonCls} tabindex="4">
              ${isNew ? 'Create archive' : 'Save'}
            </button>
          </div>
        </form>
      </div>`

    function onsubmit (e) {
      e.preventDefault()
      var form = e.target
      onSubmit({
        title: form.title.value,
        description: form.desc.value
      })
      close()
    }
  })
  el.querySelector('input').focus()
}

export function createArchiveFlow () {
  create({}, {
    isNew: true,
    title: 'New',
    helpText: 'Create a new archive and add it to your library',
    onSubmit ({ title, description }) {
      DatArchive.create({ title, description }).then(archive => {
        window.location = 'beaker:library/' + archive.url.slice('dat://'.length)
      })
    }
  })
}

export function editArchiveFlow (archive) {
  create(archive.info, {
    isNew: false,
    title: 'Edit',
    helpText: 'Update your archive\'s title and description',
    onSubmit: values => archive.updateManifest(values)
  })
}
