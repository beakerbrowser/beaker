/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'
import _debounce from 'beaker://app-stdlib/vendor/lodash.debounce.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

// exported api
// =

export class AddContactPopup extends BasePopup {
  constructor () {
    super()
    this.loadCounter = 0
    this.isLoadingContactInfo = false
    this.contactInfo = undefined
    this.contactLoadError = undefined
    this.isThumbHidden = false

    this.loadContactInfoDebounced = _debounce(this.loadContactInfo.bind(this), 1e3)
  }

  static get properties () {
    return {
      isLoadingContactInfo: {type: Boolean},
      contactInfo: {type: Object},
      contactLoadError: {type: String},
      isThumbHidden: {type: Boolean}
    }
  }

  static get styles () {
    return [popupsCSS, spinnerCSS, css`
    .popup-inner {
      width: 500px;
    }

    .popup-inner label {
      font-size: 11px;
    }

    .contact-info {
      letter-spacing: 0.5px;
      border: 1px solid #ccd;
      border-radius: 8px;
      padding: 10px;
    }

    .contact-info .loading {
      padding-bottom: 1px;
    } 

    .contact-info .loading .spinner {
      top: 2px;
      position: relative;
      margin-right: 5px;
      color: #778;
      border-width: 1px;
    }

    .contact-info .loaded {
      display: grid;
      grid-template-columns: 80px 1fr;
      grid-gap: 16px;
      align-items: center;
    }

    .contact-info .loaded img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 50%;
    }

    .contact-info .loaded .title {
      font-size: 21px;
    }

    .contact-info .loaded .description {
      font-size: 16px;
      padding-bottom: 5px;
    }

    .contact-info .error {
      margin: 0 !important;
      font-style: normal;
    }

    .host-prompt {
      background: #f3f3f8;
      padding: 10px;
      margin-top: 10px;
      border-radius: 4px;
    }

    .host-prompt label {
      margin: 0;
    }

    .host-prompt input {
      display: inline;
      margin: 0 5px 0 0;
      width: auto;
      height: auto;
    }
    `]
  }

  get urlValue () {
    return this.shadowRoot.querySelector('[name=url]').value
  }

  get hostChecked () {
    try {
      return this.shadowRoot.querySelector('[name=host]').checked
    } catch (e) {
      return false
    }
  }

  async loadContactInfo () {
    var loadCounter = ++this.loadCounter
    this.isLoadingContactInfo = true
    this.contactLoadError = undefined
    this.isThumbHidden = false

    var info
    var error
    try {
      info = await beaker.hyperdrive.getInfo(this.urlValue)
      if (info.version === 0) {
        info = undefined
        error = 'Unable to find this hyperdrive on the network'
      }
    } catch (e) {
      error = e.message.replace(/Uncaught Error:/, '')
    }

    if (loadCounter !== this.loadCounter) {
      // no longer the active load
      return
    }

    this.isLoadingContactInfo = false
    this.contactInfo = info
    this.contactLoadError = error
  }

  // management
  //

  static async create () {
    return BasePopup.create(AddContactPopup)
  }

  static destroy () {
    return BasePopup.destroy('add-contact-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `Add contact`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="url-input">Contact's URL</label>
          <input
            required
            type="text"
            id="url-input"
            name="url"
            placeholder="hyper://123456..af"
            @keyup=${this.onKeyupUrl}
          />
        </div>

        <div class="contact-info">
          ${this.isLoadingContactInfo ? html`
            <div class="loading">
              <span class="spinner"></span> Loading contact info...
            </div>
          ` : this.contactInfo ? html`
            <div class="loaded">
              <beaker-img-fallbacks>
                <img src="${this.contactInfo.url}/thumb" slot="img1">
                <img src="beaker://assets/default-user-thumb" slot="img2">
              </beaker-img-fallbacks>
              <div>
                <div class="title">${this.contactInfo.title}</div>
                <div class="description">${this.contactInfo.description}</div>
              </div>
            </div>
          ` : this.contactLoadError ? html`
            <div class="error">
              ${this.contactLoadError}
            </div>
          ` : html`
            <div class="none">
              Enter the new contact's URL
            </div>
          `}
        </div>

        ${!this.isLoadingContactInfo && this.contactInfo && !this.contactInfo.writable ? html`
          <div class="host-prompt">
            <label>
              <input type="checkbox" name="host" checked>
              Host this drive to help keep it online.
            </label>
          </div>
        ` : ''}

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button
            type="submit"
            class="btn primary"
            tabindex="1"
            ?disabled=${!this.contactInfo || this.isLoadingContactInfo}
          >
            Save
          </button>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  onKeyupUrl (e) {
    if (!this.urlValue) {
      this.isLoadingContactInfo = false
      this.contactInfo = undefined
      return
    }
    this.isLoadingContactInfo = true
    this.loadContactInfoDebounced()
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    if (!this.contactInfo) {
      return
    }

    const sysDrive = beaker.hyperdrive.drive('hyper://system/')
    var addressBook = await sysDrive.readFile('/address-book.json').then(JSON.parse).catch(e => ({contacts: []}))
    addressBook.contacts = addressBook.contacts || []
    var existingContact = addressBook.contacts.find(contact => contact.key === this.contactInfo.key)
    if (!existingContact) {
      addressBook.contacts.push({key: this.contactInfo.key})
      await sysDrive.writeFile('/address-book.json', JSON.stringify(addressBook, null, 2))
    }

    if (this.hostChecked) {
      await beaker.drives.configure(this.contactInfo.key)
    }

    this.dispatchEvent(new CustomEvent('resolve'))
  }
}

customElements.define('add-contact-popup', AddContactPopup)