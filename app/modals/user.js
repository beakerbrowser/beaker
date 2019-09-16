/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import slugify from 'slugify'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import defaultUserThumbJpg from '../lib/default-user-thumb.jpg'

const LABEL_REGEX = /[a-z0-9-]/i

class UserModal extends LitElement {
  static get properties () {
    return {
      thumbDataURL: {type: String},
      thumbExt: {type: String},
      label: {type: String},
      title: {type: String},
      description: {type: String},
      setDefault: {type: Boolean},
      errors: {type: Object}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.userUrl = ''
    this.thumbDataURL = undefined
    this.thumbExt = undefined
    this.label = ''
    this.title = ''
    this.description = ''
    this.setDefault = false
    this.isTemporary = false
    this.errors = {}
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.userUrl = params.url || ''
    this.label = params.label || ''
    this.title = params.title || ''
    this.description = params.description || ''
    this.setDefault = params.isDefault
    this.isTemporary = params.isTemporary
    if (!this.userUrl) {
      // use default thumb
      this.thumbDataURL = defaultUserThumbJpg
      this.thumbExt = 'jpg'
    }
    this.errors = {}
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <div class="wrapper">
        <h1 class="title">${this.userUrl ? 'Edit' : 'New'} user</h1>

        <form @submit=${this.onSubmit}>
          <div class="img-ctrl">
            <img src=${this.thumbDataURL || `asset:thumb:${this.userUrl}?cache_buster=${Date.now()}`}>
            <input type="file" accept=".jpg,.jpeg,.png" @change=${this.onChooseThumbFile}>
            <button type="button" @click=${this.onClickChangeThumb} class="btn" tabindex="4">Choose Picture</button>
          </div>

          <label for="title">Name</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Name" @change=${this.onChangeTitle} class=${this.errors.title ? 'has-error' : ''} />
          ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

          <label for="description">Bio / Description</label>
          <textarea name="description" tabindex="3" placeholder="Bio / Description (optional)" @change=${this.onChangeDescription} class=${this.errors.description ? 'has-error' : ''}>${this.description || ''}</textarea>
          ${this.errors.description ? html`<div class="error">${this.errors.description}</div>` : ''}

          <label for="label">Label</label>
          <input name="label" tabindex="4" value=${this.label || ''} placeholder="Label (This is used privately to help you identify your users.)" @change=${this.onChangeLabel} class=${this.errors.label ? 'has-error' : ''} />
          ${this.errors.label ? html`<div class="error">${this.errors.label}</div>` : ''}

          <hr>

          <div class="form-actions">
            ${this.isTemporary ? html`<div></div>` : html`
              <label class="toggle non-fullwidth">
                <input
                  type="checkbox"
                  name="setDefault"
                  value="setDefault"
                  ?checked=${this.setDefault}
                  @click=${this.onToggleSetDefault}
                >
                <div class="switch"></div>
                <span class="text">
                  Set as default user
                </span>
              </label>
            `}
            <div>
              <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button type="submit" class="btn primary" tabindex="5">Save</button>
            </div>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust size based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

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
    this.label = slugify(this.title).toLowerCase()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onChangeLabel (e) {
    this.label = slugify(e.target.value.trim())
  }

  onToggleSetDefault (e) {
    this.setDefault = !this.setDefault
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    // validate
    this.errors = {}
    if (!this.title) this.errors.title = 'Required'
    if (!this.label) this.errors.label = 'Required'
    else if (!LABEL_REGEX.test(this.label)) this.errors.label = 'Must be letters, numbers, or dashes (no spaces)'
    var existingUsers = await bg.users.list()
    var existingLabelUser = existingUsers.find(u => u.label === this.label)
    if (existingLabelUser && existingLabelUser.url !== this.userUrl) this.errors.label = 'This label is already in use'
    if (Object.keys(this.errors).length > 0) {
      return this.requestUpdate()
    }

    try {
      var thumbBase64 = this.thumbDataURL ? this.thumbDataURL.split(',').pop() : undefined
      var data = {
        title: this.title,
        description: this.description,
        label: this.label,
        thumbBase64,
        thumbExt: this.thumbExt,
        setDefault: this.setDefault
      }
      if (this.userUrl) {
        this.cbs.resolve(await bg.users.edit(this.userUrl, data))
      } else {
        this.cbs.resolve(await bg.users.create(data))
      }
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
UserModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
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

customElements.define('user-modal', UserModal)