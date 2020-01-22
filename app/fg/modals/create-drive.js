/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import _groupBy from 'lodash.groupby'

class CreateDriveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      type: {type: String},
      template: {type: String},
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
      left: 1px;
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

    .templates {
      background: #eef;
      border: 1px solid #ccd;
      padding: 10px;
      overflow-y: auto;
      max-height: 180px;
      margin: 4px 0 0;
    }

    .templates-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-gap: 10px;
    }

    .template img,
    .template .img-for-none {
      width: 100%;
      height: 80px;
      object-fit: cover;
      margin-bottom: 10px;
    }

    .template .img-for-none {
      background: #fff;
    }

    .template .title {
      text-align: center;
    }

    .template.selected .title span {
      background: #334;
      color: #fff;
      border-radius: 4px;
      padding: 0 6px;
    }

    .template.selected img,
    .template.selected .img-for-none {
      outline: 1px solid #334;
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
    this.tempate = undefined
    this.templates = []
    this.errors = {}

    // export interface
    window.createDriveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createDriveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type || undefined
    this.links = params.links
    this.author = this.author || (await bg.users.getCurrent()).url
    this.templates = await this.readTemplates()
    await this.requestUpdate()
  }

  async readTemplates () {
    var drives = await bg.drives.list()
    return drives.map(drive => drive.info).filter(info => info.type === 'template')
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
    const typeopt = (id, label) => html`<option value=${id} ?selected=${id === this.type}>${label}</option>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Create new 
          <select name="type" @change=${this.onChangeType}>
            ${typeopt('undefined', 'Files drive')}
            ${typeopt('website', 'Website')}
            ${typeopt('module', 'Module')}
            ${typeopt('template', 'Template')}
          </select>
        </h1>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
          ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

          <label for="desc">Description</label>
          <input name="desc" tabindex="3" @change=${this.onChangeDescription} value=${this.description || ''}>

          <label for="desc">Template</label>
          <div class="templates">
            <div class="templates-grid">
              <div 
                class="template ${this.template === undefined ? 'selected' : ''}"
                @click=${e => this.onClickTemplate(e, undefined)}
              >
                <div class="img-for-none"></div>
                <div class="title"><span>None</span></div>
              </div>
              ${repeat(this.templates, t => this.renderTemplate(t))}
            </div>
          </div>
          
          <hr>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Cancel</button>
            <button type="submit" class="primary" tabindex="4">Create</button>
          </div>
        </form>
      </div>
    `
  }

  renderTemplate (template) {
    return html`
      <div 
        class="template ${this.template === template.url ? 'selected' : ''}"
        @click=${e => this.onClickTemplate(e, template.url)}
      >
        <img src="${template.url}/thumb">
        <div class="title"><span>${template.title}</span></div>
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

  onClickTemplate (e, templateUrl) {
    this.template = templateUrl
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
      var url = await bg.hyperdrive.createDrive({
        title: this.title,
        description: this.description,
        type: this.type !== 'undefined' ? this.type : undefined,
        author: this.author,
        links: this.links,
        prompt: false
      })
      if (this.template) {
        await bg.hyperdrive.exportToDrive({
          src: this.template,
          dst: url,
          ignore: ['/index.json']
        })
      }
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-drive-modal', CreateDriveModal)