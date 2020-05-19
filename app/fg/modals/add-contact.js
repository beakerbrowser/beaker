/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'
import './img-fallbacks.js'

class AddContactModal extends LitElement {
  static get properties () {
    return {
      info: {type: Object},
      error: {type: String}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
    }

    h1.title {
      font-size: 17px;
      padding: 14px 20px;
      border-color: #f0f0f7;
      margin: 0;
    }

    form {
      padding: 0;
      margin: 0;
    }

    .loading {
      display: flex;
      align-items: center;
      padding: 20px;
      font-size: 15px;
      border-bottom: 1px solid #f0f0f7;
    }

    .loading .spinner {
      margin-right: 10px;
    }

    .error {
      padding: 20px;
      margin: 0;
      font-size: 15px;
      color: #555;
      border-bottom: 1px solid #f0f0f7;
    }

    .contact {
      display: flex;
      align-items: center;
      height: 108px;
      padding: 10px 20px;
      border-bottom: 1px solid #f0f0f7;
      box-sizing: border-box;
    }

    .contact img {
      border-radius: 50%;
      object-fit: cover;
      width: 80px;
      height: 80px;
      margin-right: 16px;
      box-sizing: border-box;
    }

    .contact .title {
      font-size: 23px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .contact .description {
      font-size: 17px;
    }
    
    .contact .info {
      flex: 1;
    }

    .contact.selected {
      background: #2864dc;
      color: #fff;
    }

    .host-prompt {
      background: #f3f3f8;
      padding: 12px 24px;
    }

    .host-prompt label {
      margin: 0;
      display: flex;
      align-items: center;
    }

    .host-prompt input {
      display: inline;
      margin: 0 8px 0 0;
      width: auto;
      height: auto;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      text-align: left;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.info = undefined
    this.error = undefined
  }

  init (params, cbs) {
    this.url = params.url
    this.cbs = cbs
    this.info = undefined
    this.error = undefined
    this.requestUpdate()
    this.tryFetch()
  }

  async tryFetch () {
    try {
      this.error = undefined
      var info = await bg.hyperdrive.getInfo(this.url)
      if (info.version === 0) {
        this.error = 'Unable to find this hyperdrive on the network'
      } else {
        this.info = info
      }
    } catch (e) {
      this.cbs.reject(e.message)
    }
  }

  get hostChecked () {
    try {
      return this.shadowRoot.querySelector('[name=host]').checked
    } catch (e) {
      return false
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Add to Address Book</h1>

        <form @submit=${this.onSubmit}>
          ${this.error ? html`
            <div class="error">
              <span class="fas fa-fw fa-exclamation-circle"></span> ${this.error}
            </div>
          ` : this.info ? html`
            <div class="contact">
              <beaker-img-fallbacks>
                <img src="${this.info.url}/thumb" slot="img1">
                <img src="beaker://assets/default-user-thumb" slot="img2">
              </beaker-img-fallbacks>
              <div class="info">
                <div class="title"><span>${this.info.title}</span></div>
                <div class="description"><span>${this.info.description}</span></div>
              </div>
            </div>
          ` : html`
            <div class="loading">
              <span class="spinner"></span> Loading contact info...
            </div>
          `}

          ${this.info ? html`
            <div class="host-prompt">
              <label>
                ${!this.info.writable ? html`
                  <input type="checkbox" name="host" checked>
                  Host this drive to help keep it online.
                ` : 'Note: This is your drive'}
              </label>
            </div>
          ` : ''}

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            ${this.error ? html`
              <button type="submit" class="btn primary" tabindex="5">Try Again</button>
            ` : html`
              <button type="submit" class="btn primary" tabindex="5" ?disabled=${!this.info}>OK</button>
            `}
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust size based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    if (this.info) {
      this.cbs.resolve({key: this.info.key, host: this.hostChecked})
    } else {
      this.tryFetch()
    }
  }
}

customElements.define('add-contact-modal', AddContactModal)