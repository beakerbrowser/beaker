/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import defaultUserThumbJpg from '../lib/default-user-thumb.jpg'

class UserModal extends LitElement {
  static get properties () {
    return {
      thumbDataURL: {type: String},
      thumbExt: {type: String},
      title: {type: String},
      description: {type: String},
      errors: {type: Object}
    }
  }

  constructor () {
    super()
    this.cbs = null
    this.userUrl = ''
    this.thumbDataURL = undefined
    this.thumbExt = undefined
    this.title = ''
    this.description = ''
    this.errors = {}
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.userUrl = params.url || ''
    this.title = params.title || ''
    this.description = params.description || ''
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

          <hr>

          <div class="form-actions">
            <div></div>
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
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
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
    if (Object.keys(this.errors).length > 0) {
      return this.requestUpdate()
    }

    try {
      var thumbBase64 = this.thumbDataURL ? this.thumbDataURL.split(',').pop() : undefined
      this.cbs.resolve({
        title: this.title,
        description: this.description,
        thumbBase64,
        thumbExt: this.thumbExt
      })
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