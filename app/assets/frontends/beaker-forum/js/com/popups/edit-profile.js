/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'
import { emit } from '../../lib/dom.js'
import * as toast from '../toast.js'

// exported api
// =

export class EditProfilePopup extends BasePopup {
  static get properties () {
    return {
      thumbDataURL: {type: String},
      thumbExt: {type: String},
      title: {type: String},
      description: {type: String},
      errors: {type: Object}
    }
  }

  static get styles () {
    return [popupsCSS, css`
    .img-ctrl {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    img {
      border-radius: 50%;
      object-fit: cover;
      width: 130px;
      height: 130px;
      margin-bottom: 10px;
    }

    hr {
      border: 0;
      border-top: 1px solid #ccc;
      margin: 20px 0;
    }

    input[type="file"] {
      display: none;
    }

    .toggle .text {
      font-size: 13px;
      margin-left: 8px;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      text-align: left;
    }
    `]
  }

  constructor ({user}) {
    super()
    this.user = user
    this.title = user.title || ''
    this.description = user.description || ''
    this.errors = {}
  }

  // management
  //

  static async create (parentEl, {user}) {
    return BasePopup.coreCreate(parentEl, EditProfilePopup, {user})
  }

  static destroy () {
    return BasePopup.destroy('beaker-edit-profile-popup')
  }

  // rendering
  // =

  renderTitle () {
    return 'Edit your profile'
  }

  renderBody () {
    return html`
      <form @submit=${this.onSubmit}>
        <div class="img-ctrl">
          ${this.thumbDataURL ? html`
            <img src=${this.thumbDataURL}>
          ` : html`
            <beaker-img-fallbacks>
              <img src="${this.user.url}/thumb" slot="img1">
              <img src="/.ui/img/default-user-thumb" slot="img2">
            </beaker-img-fallbacks>
          `}
          <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseThumbFile}>
          <button type="button" @click=${this.onClickChangeThumb} class="btn" tabindex="4">Choose Picture</button>
        </div>

        <label for="title">Name</label>
        <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Name" @change=${this.onChangeTitle} class=${this.errors.title ? 'has-error' : ''} />
        ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

        <label for="description">Bio / Description</label>
        <input name="description" tabindex="3" placeholder="Bio / Description (optional)" @change=${this.onChangeDescription} class=${this.errors.description ? 'has-error' : ''} value=${this.description || ''}>
        ${this.errors.description ? html`<div class="error">${this.errors.description}</div>` : ''}

        <div class="form-actions">
          <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
          <button type="submit" class="btn primary" tabindex="5">Save</button>
        </div>
      </form>
    `
  }

  // events
  // =

  onClickChangeThumb (e) {
    e.preventDefault()
    this.shadowRoot.querySelector('input[type="file"]').click()
  }

  onChooseThumbFile (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      this.thumbExt = file.name.split('.').pop()
      this.thumbDataURL = /** @type string */(fr.result)
    }
    fr.readAsDataURL(file)
  }

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onClickCancel (e) {
    e.preventDefault()
    emit(this, 'reject')
  }

  async onSubmit (e) {
    e.preventDefault()

    // validate
    this.errors = {}
    if (!this.title) this.errors.title = 'Required'
    if (Object.keys(this.errors).length > 0) {
      return this.requestUpdate()
    }

    try {
      let drive = hyperdrive.load(this.user.url)
      await drive.configure({
        title: this.title,
        description: this.description
      })
      if (this.thumbDataURL) {
        await Promise.all([
          drive.unlink('/thumb.jpg').catch(e => undefined),
          drive.unlink('/thumb.jpeg').catch(e => undefined),
          drive.unlink('/thumb.png').catch(e => undefined)
        ])
        var thumbBase64 = this.thumbDataURL ? this.thumbDataURL.split(',').pop() : undefined
        await drive.writeFile(`/thumb.${this.thumbExt}`, thumbBase64, 'base64')
      }
      emit(this, 'resolve')
    } catch (e) {
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('beaker-edit-profile-popup', EditProfilePopup)
