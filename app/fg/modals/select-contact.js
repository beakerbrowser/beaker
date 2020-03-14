/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import './img-fallbacks.js'

class SelectContactModal extends LitElement {
  static get properties () {
    return {
      selection: {type: Array},
      multiple: {type: Boolean}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
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

    .contacts {
      max-height: 500px;
      overflow: auto;
      box-sizing: border-box;
      border-bottom: 1px solid #f0f0f7;
    }

    .contact {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #f0f0f6;
      padding: 10px 20px;
      height: 71px;
      box-sizing: border-box;
    }

    .contact:last-child {
      border-bottom: 0;
    }

    .contact img {
      border-radius: 50%;
      object-fit: cover;
      width: 50px;
      height: 50px;
      margin-right: 16px;
      box-sizing: border-box;
    }

    .contact .title {
      font-size: 17px;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .contact .info {
      flex: 1;
    }

    .contact.selected {
      background: #2864dc;
      color: #fff;
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
    this.cbs = null
    this.contacts = []
    this.selection = []
    this.multiple = undefined
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.contacts = params.contacts || []
    this.multiple = params.multiple
    this.selection = []
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Select Contact${this.multiple ? 's' : ''}</h1>

        <form @submit=${this.onSubmit}>
          <div class="contacts">
            ${repeat(this.contacts, contact => this.renderContact(contact))}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5" ?disabled=${!this.selection}>OK</button>
          </div>
        </form>
      </div>
    `
  }

  renderContact (contact) {
    var selected = this.selection.includes(contact)
    return html`
      <div class=${classMap({contact: true, selected})} @click=${e => this.onClickContact(e, contact)}>
        <beaker-img-fallbacks>
          <img src="hyper://${contact.key}/thumb" slot="img1">
          <img src="beaker://assets/default-user-thumb" slot="img2">
        </beaker-img-fallbacks>
        <div class="info">
          <div class="title"><span>${contact.title}</span></div>
          <div class="description"><span>${contact.description}</span></div>
        </div>
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

  onClickContact (e, contact) {
    if (this.multiple) {
      if (this.selection.includes(contact)) {
        this.selection.splice(this.selection.indexOf(contact), 1)
      } else {
        this.selection.push(contact)
      }
      this.requestUpdate()
    } else {
      this.selection = [contact]
    }
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    this.cbs.resolve({contacts: this.selection.map(contact => ({
      url: `hyper://${contact.key}`,
      title: contact.title,
      description: contact.description
    }))})
  }
}

customElements.define('select-contact-modal', SelectContactModal)