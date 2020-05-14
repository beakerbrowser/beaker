import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'

// exported api
// =

export class BeakerEditProfile extends BasePopup {
  constructor (profile) {
    super()
    this.profile = profile
    this.isCreate = !profile.title && !profile.description
  }

  // management
  //

  static async create (profile) {
    return BasePopup.create(BeakerEditProfile, profile)
  }

  static async runFlow (profiles) {
    var profile = await profiles.me()
    var newValues = await BeakerEditProfile.create(profile)
    await beaker.hyperdrive.drive(profile.url).configure(newValues)
    return profiles.me()
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-profile')
  }

  // rendering
  // =

  renderTitle () {
    return `${this.isCreate ? 'Create' : 'Edit'} your profile`
  }

  renderBody () {
    return html`
      <form @submit=${this.onSubmit}>      
        <div class="controls">
          <img src="${this.profile.url}/thumb">

          <label for="title-input">Name</label>
          <input autofocus type="text" class="huge" id="title-input" name="title" value="${this.profile.title}" placeholder="Anonymous" />

          <label for="description-input">Bio</label>
          <textarea class="big" id="description-input" name="description">${this.profile.description}</textarea>
        </div>

        <div class="actions">
          <button type="button" class="btn ${this.isCreate ? 'hidden' : ''}" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">Save</button>
        </div>
      </form>
    `
  }

  // events
  // =

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('resolve', {
      detail: {
        title: e.target.title.value,
        description: e.target.description.value
      }
    }))
  }
}
BeakerEditProfile.styles = [popupsCSS, css`
img {
  display: block;
  margin: 10px auto;
  border-radius: 50%;
  height: 130px;
  width: 130px;
  object-fit: cover;
}

.controls {
  max-width: 460px;
  margin: 20px auto 40px;
}

.popup-inner {
  width: 560px;
}

.popup-inner textarea,
.popup-inner input {
  margin-bottom: 20px;
}

.popup-inner .actions {
  justify-content: space-between;
}

.hidden {
  visibility: hidden;
}
`]

customElements.define('beaker-edit-profile', BeakerEditProfile)