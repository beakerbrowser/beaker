/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'

class CreateDriveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      fromFolderPath: {type: String},
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

    form input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
      margin-top: 0;
    }

    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .from-folder-path {
      background: #f3f3f8;
      padding: 10px 12px;
      margin-bottom: 10px;
      border-radius: 4px;
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

    .tip {
      background: #fafafd;
      margin: 10px -20px -14px;
      padding: 10px 18px;
      color: gray;
    }

    .tip a {
      color: inherit;
      text-decoration: none;
    }

    .tip a:hover {
      text-decoration: underline;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.title = ''
    this.description = ''
    this.author = undefined
    this.fromFolderPath = undefined
    this.errors = {}
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.author = undefined // this.author = params.author
    await this.requestUpdate()
  }

  updated () {
    this.adjustHeight()
  }

  adjustHeight () {
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Create New Hyperdrive
        </h1>
        <form @submit=${this.onSubmit}>
          <div>
            <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" placeholder="Title" />
            ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}
            <input name="desc" tabindex="3" @change=${this.onChangeDescription} value=${this.description || ''} placeholder="Description (optional)">
            ${this.fromFolderPath ? html`
              <div class="from-folder-path">
                <strong>Import from folder:</strong> ${this.fromFolderPath} <a href="#" @click=${this.onClickCancelFromFolder}>Cancel</a>
              </div>
            ` : ''}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="6">Cancel</button>
            <button type="button" @click=${this.onClickFromFolder} class="cancel" tabindex="5">From Folder</button>
            <button type="submit" class="primary" tabindex="4">Create</button>
          </div>

          <div class="tip">
            <span class="fas fa-fw fa-info"></span>
            <a data-href="https://beaker.dev/docs/templates/" @click=${this.onClickLink}>
              Find templates for Hyperdrives at Beaker.dev
            </a>
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
    Array.from(this.shadowRoot.querySelectorAll('button'), b => b.setAttribute('disabled', 'disabled'))

    try {
      var url = await bg.hyperdrive.createDrive({
        title: this.title,
        description: this.description,
        author: this.author,
        prompt: false
      })
      if (this.fromFolderPath) {
        await bg.folderSync.set(url, {localPath: this.fromFolderPath})
      }
      this.cbs.resolve({url, gotoSync: !!this.fromFolderPath})
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
    this.fromFolderPath = folder[0]
  }

  onClickCancelFromFolder (e) {
    e.preventDefault()
    this.fromFolderPath = undefined
  }

  onClickLink (e) {
    e.preventDefault()
    bg.beakerBrowser.openUrl(e.currentTarget.dataset.href, {setActive: true})
  }
}

customElements.define('create-drive-modal', CreateDriveModal)