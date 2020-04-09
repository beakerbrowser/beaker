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
      info: {type: Object}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
      height: 254px;
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

    .seed-prompt {
      background: #f3f3f8;
      padding: 12px 24px;
    }

    .seed-prompt label {
      margin: 0;
    }

    .seed-prompt input {
      display: inline;
      margin: 0 5px 0 0;
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
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.info = undefined
    await this.requestUpdate()
    
    try {
      this.info = await bg.hyperdrive.getInfo(params.url)
      if (this.info.version === 0) {
        throw new Error('Unable to find this hyperdrive on the network')
      }
    } catch (e) {
      this.cbs.reject(e.message)
    }
  }


  get seedChecked () {
    try {
      return this.shadowRoot.querySelector('[name=seed]').checked
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
          ${this.info ? html`
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

          <div class="seed-prompt">
            ${this.info ? html`
              <label>
                ${!this.info.writable ? html`
                  <input type="checkbox" name="seed" checked>
                  Seed this drive to help keep it online.
                ` : 'Note: This is your drive'}
              </label>
            ` : ''}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5" ?disabled=${!this.info}>OK</button>
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

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    if (this.info) {
      this.cbs.resolve({key: this.info.key, seed: this.seedChecked})
    } else {
      this.cbs.reject(new Error('Canceled'))
    }
  }
}

customElements.define('add-contact-modal', AddContactModal)