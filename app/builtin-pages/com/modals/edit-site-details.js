import * as yo from 'yo-yo'
import { create as createModal } from '../modal'
import imagePicker from '../image-picker'
import favicons from '../../favicons'

export function create () {
  var el = createModal(({ close }) => {
    return yo`<div class="edit-site-modal">
      <h2>New Site</h2>
      <div class="esm-section">
        <form onsubmit=${onsubmit}>
          <div class="form-group">
            <label>Name</label>
            <input name="name" class="form-control" tabindex="1" />
          </div>
          <div class="form-group">
            <label>Description</label>
            <input name="desc" class="form-control" tabindex="2" />
          </div>
          <div class="form-group">
            <label>Icon</label>
            ${imagePicker('favicon', favicons, { baseUrl: 'beaker:icons/' })}
          </div>
          <div class="form-actions">
            <button type="submit" class="btn" tabindex="3">OK</button>
            <a onclick=${close}>Cancel</a>
          </div>
        </form>
      </div>
      <div class="esm-info">
        Use Sites to share Files and WebPages.
        <a href="beaker:help/creating-sites" target="_blank">Learn More.</a>
      </div>
    </div>`

    function onsubmit (e) {
      e.preventDefault()
      var form = e.target
      var key = datInternalAPI.createNewArchive({
        name: form.name.value,
        description: form.desc.value
      })
      window.location = 'view-dat://'+key
    }
  })
  el.querySelector('input').focus()
}