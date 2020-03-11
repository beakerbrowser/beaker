/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import _groupBy from 'lodash.groupby'
import { FRONTEND_CATEGORIES, BUILTIN_FRONTENDS, filterFrontendByType } from '../../lib/hyper'

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
    
    form {
      padding: 14px 20px;
      margin: 0;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 540px;
      grid-gap: 10px;
      margin-bottom: 10px;
    }

    form input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
      margin-top: 0;
    }

    .fe-selector {
      height: 364px;
      overflow-y: auto;
      border-radius: 4px;
      background: #f3f3f8;
      font-size: 13px;
      letter-spacing: 0.3px;
      padding: 10px 0 5px;
    }

    .fe-selector-group {
      margin-bottom: 8px;
    }

    .fe-selector-group > .label {
      padding: 5px 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .fe-selector-group > .label .far {
      font-size: 11px;
      position: relative;
      top: -1px;
      margin-right: 1px;
    }

    .fe-selector-item {
      padding: 5px 25px;
      cursor: pointer;
    }

    .fe-selector-group > .label:hover,
    .fe-selector-item:hover {
      background: #eaeaef;
    }

    .fe-selector-item[selected] {
      background: #0072ec;
      color: #fff;
    }
  
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    img.preview {
      display: block;
      width: 540px;
      height: 280px;
      border: 1px solid #bbc;
      border-radius: 4px;
      object-fit: cover;
      box-sizing: border-box;
    }

    .form-actions {
      display: flex;
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }

    .form-actions button:first-child {
      margin-right: 5px;
    }

    .form-actions button:last-child {
      margin-left: auto;
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
    this.feCatOpen = {[FRONTEND_CATEGORIES[0].id]: true}

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

    if (!this.frontend || !this.availableFrontends.find(fe => fe.url === this.frontend)) {
      if (this.type) {
        let fe = this.availableFrontends.filter(fe => filterFrontendByType(fe.manifest, this.type))[0]
        this.frontend = fe ? fe.url : ''
      }
      if (!this.type) {
        this.frontend = this.availableFrontends[0].url
      }
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

  getMatchingFrontends (cat) {
    return this.availableFrontends.filter(fe => fe.category === cat)
  }

  // rendering
  // =

  render () {
    var currentFrontend = this.availableFrontends.find(fe => fe.url === this.frontend)
    var frontendImg = currentFrontend ? currentFrontend.img : 'none'
    const feopt = (id, label) => html`
      <div
        class="fe-selector-item"
        ?selected=${id === this.frontend}
        @click=${e => this.onChangeFrontend(id)}
      >${label}</div>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Create New Hyperdrive
        </h1>
        <form @submit=${this.onSubmit}>
          <div class="layout">
            <div class="left">      
              <div class="fe-selector">
                ${repeat(FRONTEND_CATEGORIES, ({id, title}) => html`
                  <div class="fe-selector-group">
                    <div class="label" @click=${e => this.onToggleFeCatOpen(id)}>
                      <span class="far fa-${this.feCatOpen[id] ? 'minus' : 'plus'}-square"></span>
                      ${title}
                    </div>
                    ${this.feCatOpen[id] ? html`
                      <div class="fe-selector-options">
                        ${repeat(this.getMatchingFrontends(id), fe => feopt(fe.url, fe.title))}
                      </div>
                    ` : ''}
                  </div>
                `)}
              </div>
            </div>
            <div class="right">
              <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" placeholder="Title" />
              ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

              <input name="desc" tabindex="3" @change=${this.onChangeDescription} value=${this.description || ''} placeholder="Description (optional)">

              <img class="preview" src="beaker://assets/img/frontends/${frontendImg}.png">
            </div>
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="6">Cancel</button>
            <button type="button" @click=${this.onClickFromFolder} class="cancel" tabindex="5">From Folder</button>
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

  onToggleFeCatOpen (id) {
    this.feCatOpen[id] = !this.feCatOpen[id]
    this.requestUpdate()
  }

  onChangeFrontend (id) {
    this.frontend = id
    this.shadowRoot.querySelector('input[name=title]').focus()
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
    if (!this.frontend) {
      return
    }

    this.shadowRoot.querySelector('button[type="submit"]').innerHTML = `<div class="spinner"></div>`

    try {
      var frontend = this.availableFrontends.find(fe => fe.url === this.frontend)
      var info = {
        title: this.title,
        description: this.description,
        type: frontend.manifest.frontend.drive_type,
        author: this.author,
        links: this.links,
        frontend: !frontend.url.startsWith('null:') ? frontend.url : undefined,
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

  async onClickFromFolder (e) {
    let btn = e.currentTarget
    e.preventDefault()

    var folder = await bg.beakerBrowser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    btn.innerHTML = `<span class="spinner"></span>`
    Array.from(this.shadowRoot.querySelectorAll('button'), b => b.setAttribute('disabled', 'disabled'))
  
    try {
      var url = await bg.hyperdrive.createDrive({
        title: folder[0].split('/').pop(),
        prompt: false
      })
      await bg.hyperdrive.importFromFilesystem({src: folder[0], dst: url})
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-drive-modal', CreateDriveModal)