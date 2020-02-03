/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import _groupBy from 'lodash.groupby'
import { BUILTIN_TYPES } from '../../lib/hyper'

class CreateDriveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      type: {type: String},
      errors: {type: Object}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }

    h1.title select {
      position: relative;
      top: -1px;
      left: 5px;

      -webkit-appearance: none;
      display: inline-block;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #444;
      padding: 5px 30px 5px 10px;
      max-width: 100%;
      border: 1px solid #bbc;
      border-radius: 4px;
      outline: 0;
      background-color: #fff;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAMAAABg3Am1AAAARVBMVEUAAAAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAsPlAz1sU3AAAAFnRSTlMAAwQMERkbIikuVWl0dXeDtLXF5PH5X4+8lwAAAIxJREFUSInt0TcCwjAQRNFvE5dkwKD7H5WGINsKszWa+r9qoO1ftjqc1B0N2DyDYwNcPX0Ia0Yf2HFx9Y+e7u4Be6B3CAOXsPcTqrDvd5qw6G1FxL0ipn1dzPuaWPZlkepLIt3nRa7PiXyfFqU+Jcr9UtT6uaj3U6H0sdD6n1D7j9B76M7jbevo29rgBddTP/7iwZL3AAAAAElFTkSuQmCC);
      background-repeat: no-repeat;
      background-position: right .7em top 50%, 0 0;
      background-size: .65em auto, 100%;
    }
    
    form {
      padding: 14px 20px;
      margin: 0;
    }

    input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
    }
    
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .theme {

    }

    .theme img {
      display: block;
      width: 100%;
      height: 250px;
      border-bottom: 1px solid #ccd;
      margin: 0;
      object-fit: cover;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.title = ''
    this.description = ''
    this.type = undefined
    this.links = undefined
    this.author = undefined
    this.errors = {}

    // export interface
    window.createDriveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createDriveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type || ''
    this.links = params.links
    this.author = undefined // this.author = this.author || (await bg.users.getCurrent()).url
    await this.requestUpdate()
  }

  updated () {
    this.adjustHeight()
  }

  adjustHeight () {
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    var builtinType = BUILTIN_TYPES.find(t => t.type === this.type)
    var themeImg = builtinType ? builtinType.img : 'none'
    const typeopt = (id, label) => html`<option value=${id} ?selected=${id === this.type}>${label}</option>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Create new 
          <select name="type" @change=${this.onChangeType}>
            ${repeat(BUILTIN_TYPES, t => typeopt(t.type, t.title))}
          </select>
        </h1>

        <div class="theme">
          <img src="beaker://assets/img/themes/${themeImg}.png">
        </div>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
          ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

          <label for="desc">Description</label>
          <input name="desc" tabindex="3" @change=${this.onChangeDescription} value=${this.description || ''} placeholder="Optional">
            
          <hr>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Cancel</button>
            <button type="submit" class="primary" tabindex="4">Create</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.title = e.target.value.trim()
  }

  onChangeDescription (e) {
    this.description = e.target.value.trim()
  }

  onChangeType (e) {
    this.type = e.target.value.trim()
  }

  onChangeTheme (e) {
    this.theme = e.currentTarget.value
  }

  onThemeImgError (e) {
    e.currentTarget.setAttribute('src', 'beaker://assets/default-theme-thumb')
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    if (!this.title) {
      this.errors = {title: 'Required'}
      return
    }

    this.shadowRoot.querySelector('button[type="submit"]').innerHTML = `<div class="spinner"></div>`

    try {
      var builtinType = BUILTIN_TYPES.find(t => t.type === this.type)
      var url = await bg.hyperdrive.createDrive({
        title: this.title,
        description: this.description,
        type: this.type !== '' ? this.type : undefined,
        author: this.author,
        links: this.links,
        theme: builtinType && builtinType.theme || undefined,
        prompt: false
      })
      if (builtinType && builtinType.scaffold) {
        for (let file of builtinType.scaffold) {
          await bg.hyperdrive.writeFile(url, file.pathname, file.content)
        }
      }
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-drive-modal', CreateDriveModal)