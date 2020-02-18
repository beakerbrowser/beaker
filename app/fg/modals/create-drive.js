/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import _groupBy from 'lodash.groupby'
import { BUILTIN_TYPES, BUILTIN_FRONTENDS, filterFrontendByType } from '../../lib/hyper'

class CreateDriveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      type: {type: String},
      frontend: {type: String},
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

    select {
      -webkit-appearance: none;
      display: inline-block;
      font-size: 13px;
      font-weight: 500;
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

    h1.title select {
      position: relative;
      top: -1px;
      left: 5px;
      font-size: 14px;
      font-weight: 700;
      color: #444;
      letter-spacing: 0.5px;
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

    .frontend select {
      display: block;
      padding: 7px 30px 7px 10px;
      background-color: #fafafd;
      width: 100%;
      margin-top: 5px;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
    }

    .frontend select:disabled {
      color: inherit;
      background-image: none;
    }

    img.preview {
      display: block;
      width: 100%;
      height: 230px;
      border: 1px solid #ccd;
      border-top: 0;
      border-radius: 4px;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      margin: 0 0 15px;
      object-fit: cover;
      box-sizing: border-box;
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
    this.frontend = params.frontend
    this.author = undefined // this.author = params.author

    if (!this.frontend || !this.matchingFrontends.find(fe => fe.url === this.frontend)) {
      this.frontend = this.matchingFrontends[0].url
    }

    await this.requestUpdate()
  }

  updated () {
    this.adjustHeight()
  }

  adjustHeight () {
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  get availableFrontends () {
    return BUILTIN_FRONTENDS
  }

  get matchingFrontends () {
    return this.availableFrontends.filter(t => filterFrontendByType(t.manifest, this.type))
  }

  // rendering
  // =

  render () {
    const matchingFrontends = this.matchingFrontends
    var currentFrontend = this.availableFrontends.find(fe => fe.url === this.frontend)
    var frontendImg = currentFrontend ? currentFrontend.img : 'none'
    const typeopt = (id, label) => html`<option value=${id} ?selected=${id === this.type}>${label}</option>`
    const feopt = (id, label) => html`<option value=${id} ?selected=${id === this.frontend}>${label}</option>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Create new 
          <select name="type" @change=${this.onChangeType}>
            ${repeat(BUILTIN_TYPES, t => typeopt(t.type, t.title))}
          </select>
        </h1>
        <form @submit=${this.onSubmit}>          
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
          ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

          <label for="desc">Description</label>
          <input name="desc" tabindex="3" @change=${this.onChangeDescription} value=${this.description || ''} placeholder="Optional">
            
          <div class="frontend">
            <label>Frontend</label>
            <select name="frontend" @change=${this.onChangeFrontend}>
              ${repeat(matchingFrontends, fe => feopt(fe.url, fe.title))}
            </select>
            <img class="preview" src="beaker://assets/img/frontends/${frontendImg}.png">
          </div>

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
    this.frontend = this.matchingFrontends[0].url
  }

  onChangeFrontend (e) {
    this.frontend = e.target.value.trim()
  }

  onFrontendImgError (e) {
    e.currentTarget.setAttribute('src', 'beaker://assets/default-frontend-thumb')
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
      var frontend = this.availableFrontends.find(fe => fe.url === this.frontend)
      var info = {
        title: this.title,
        description: this.description,
        type: this.type !== '' ? this.type : undefined,
        author: this.author,
        links: this.links,
        frontend: frontend && !frontend.url.startsWith('null:') ? frontend.url : undefined,
        prompt: false
      }
      var url = await bg.hyperdrive.createDrive(info)
      if (frontend && frontend.scaffold) {
        for (let path in frontend.scaffold) {
          if (frontend.scaffold[path] === 'folder') {
            await bg.hyperdrive.mkdir(url, path)
          } else {
            await bg.hyperdrive.writeFile(url, path, frontend.scaffold[path](info))
          }
        }
      }
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-drive-modal', CreateDriveModal)