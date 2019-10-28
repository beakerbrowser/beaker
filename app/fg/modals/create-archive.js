/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import _groupBy from 'lodash.groupby'

class CreateArchiveModal extends LitElement {
  static get properties () {
    return {
      title: {type: String},
      description: {type: String},
      type: {type: String},
      errors: {type: Object}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
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

    textarea {
      font-size: 14px;
      padding: 7px 10px;
      border-color: #bbb;
    }
    
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    label.fixed-width {
      display: inline-block;
      width: 60px;
    }
    
    .layout {
      user-select: none;
    }

    input[type="radio"] {
      display: inline;
      width: auto;
      margin: 0 4px;
      height: auto;
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
    window.createArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.createArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type || undefined
    this.links = params.links
    this.author = this.author || (await bg.users.getCurrent()).url
    await this.requestUpdate()
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
            <optgroup label="Files">
              ${typeopt('undefined', 'Hyperdrive')}
            </optgroup>
            <optgroup label="Media">
              ${typeopt('website', 'Website')}
            </optgroup>
            <optgroup label="Advanced">
              ${typeopt('application', 'Application')}
              ${typeopt('webterm.sh/cmd-pkg', 'Webterm Command')}
            </optgroup>
          </select>
        </h1>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} @change=${this.onChangeTitle} class="${this.errors.title ? 'has-error' : ''}" />
          ${this.errors.title ? html`<div class="error">${this.errors.title}</div>` : ''}

          <details>
            <summary><label for="desc">Description</label></summary>
            <textarea name="desc" tabindex="3" @change=${this.onChangeDescription}>${this.description || ''}</textarea>
          </details>
          
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

    try {
      var url = await bg.datArchive.createArchive({
        title: this.title,
        description: this.description,
        type: this.type !== 'undefined' ? this.type : undefined,
        author: this.author,
        links: this.links,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('create-archive-modal', CreateArchiveModal)