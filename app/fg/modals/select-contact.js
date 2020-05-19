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
      border-color: #dddde0;
      margin: 0;
    }

    form {
      padding: 0;
      margin: 0;
    }

    .contacts {
      height: 400px;
      overflow: auto;
      box-sizing: border-box;
      border-bottom: 1px solid #dddde0;
      background: #f3f3f8;
    }

    .profiles-only.contacts {
      height: 200px;
    }

    .contact {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #dddde0;
      padding: 12px 20px;
      height: 55px;
      box-sizing: border-box;
    }

    .contact .checkmark {
      width: 30px;
    }

    .contact .checkmark .fa-circle {
      color: #0002;
    }

    .contact img {
      border-radius: 50%;
      object-fit: cover;
      width: 32px;
      height: 32px;
      margin-right: 16px;
      box-sizing: border-box;
      border: 1px solid #fff;
    }

    .contact .title {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .contact .description {
      flex: 1;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .contact .profile-badge {
      width: 80px;
    }

    .contact .profile-badge span {
      font-size: 10px;
      background: #fff;
      color: #778;
      padding: 2px 8px;
      border-radius: 8px;
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
    this.cbs = undefined
    this.contacts = []
    this.selection = []
    this.multiple = undefined
    this.showProfilesOnly = undefined
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.multiple = params.multiple
    this.showProfilesOnly = !!params.showProfilesOnly

    var contacts = params.addressBook.contacts || []
    if (params.addressBook.profiles && params.addressBook.profiles.length) {
      var profiles = params.addressBook.profiles.map(p => Object.assign(p, {isProfile: true}))
      if (this.showProfilesOnly) {
        contacts = profiles
      } else {
        contacts = contacts.concat(profiles)
      }
    }
    contacts.sort((a, b) => a.title.localeCompare(b.title))

    this.contacts = contacts

    this.selection = []
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          ${this.showProfilesOnly ? `
            Select Profile
          ` : `
            Select Contact${this.multiple ? 's' : ''}
          `}
        </h1>

        <form @submit=${this.onSubmit}>
          <div class="contacts ${this.showProfilesOnly ? 'profiles-only' : ''}">
            ${repeat(this.contacts, contact => this.renderContact(contact))}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5" ?disabled=${this.selection.length === 0}>OK</button>
          </div>
        </form>
      </div>
    `
  }

  renderContact (contact) {
    var selected = this.selection.includes(contact)
    return html`
      <div class=${classMap({contact: true, selected})} @click=${e => this.onClickContact(e, contact)}>
        <div class="checkmark">
          <span class="${selected ? 'fas fa-check' : 'fas fa-circle'}"></span>
        </div>
        <beaker-img-fallbacks>
          <img src="asset:thumb-30:${contact.url}" slot="img1">
          <img src="beaker://assets/default-user-thumb" slot="img2">
        </beaker-img-fallbacks>
        <div class="title"><span>${contact.title || 'Anonymous'}</span></div>
        <div class="description"><span>${contact.description}</span></div>
        <div class="profile-badge">${contact.isProfile ? html`<span>My Profile</span>` : ''}</div>
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
      url: contact.url,
      title: contact.title,
      description: contact.description
    }))})
  }
}

customElements.define('select-contact-modal', SelectContactModal)