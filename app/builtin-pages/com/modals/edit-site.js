import * as yo from 'yo-yo'
import * as modal from '../modal'

export function create (values, { title, onSubmit }) {
  var el = modal.create(({ close }) => {
    return yo`<div class="edit-site-modal">
      <h2>${title}</h2>
      <div class="esm-section">
        <form onsubmit=${onsubmit}>
          <div class="form-group">
            <label>Name</label>
            <input name="title" class="form-control" tabindex="1" value=${values.title || ''} />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input name="desc" class="form-control" tabindex="2" value=${values.description || ''} />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn" tabindex="3">OK</button>
            <a onclick=${close}>Cancel</a>
          </div>
        </form>
      </div>
      <div class="esm-info">
        Use Dat Archives to share Sites and Files. <a href="https://beakerbrowser.com/docs/p2p/share-files.html" target="_blank">Learn More</a>
      </div>
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