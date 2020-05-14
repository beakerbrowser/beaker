import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import identityCSS from '../../css/com/identity.css.js'

class Identity extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      cert: {type: Object}
    }
  }

  static get styles () {
    return [identityCSS]
  }

  constructor () {
    super()
    this.url = undefined
    this.cert = undefined
  }
  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="field-group">
        ${this.cert ? html`
          ${this.cert.type === 'beaker' ? html`
            This is a builtin interface of Beaker
          ` : ''}
          ${this.cert.type === 'tls' ? html`
            <div class="identity">
              <span class="fa-fw fas fa-address-card"></span>
              ${this.cert.subjectName}
            </div>
            <div class="verifier">
              Issued by ${this.cert.issuerName}
            </div>
          ` : ''}
          ${this.cert.type === 'hyperdrive' ? html`
            ${this.cert.ident.profile ? html`
              <div class="identity">
                <span class="fa-fw fas fa-address-card"></span>
                ${this.cert.driveInfo.title || 'Untitled'}
              </div>
              <div class="verifier">
                This is your profile
              </div>
            ` : this.cert.ident.contact ? html`
              <div class="identity">
                <span class="fa-fw fas fa-address-card"></span>
                ${this.cert.driveInfo.title || 'Untitled'}
              </div>
              <div class="verifier">
                This drive is in your address book
                <button class="transparent toggle-save-contact-btn" @click=${this.onToggleSaveContact}>
                  <span class="fas fa-fw fa-user-times"></span> Remove
                </button>
              </div>
            ` : this.cert.ident.system ? html`
              <div class="identity">This is your system drive</div>
            ` : this.cert.driveInfo.writable ? html`
              <div class="identity">
                ${this.cert.driveInfo.title || 'Untitled'}
              </div>
              <div class="verifier">
                <span class="fa-fw fas fa-pen"></span> You created this drive</div>
              </div>
            ` : html`
              No identity information found
              <button class="transparent toggle-save-contact-btn" @click=${this.onToggleSaveContact}>
                <span class="fas fa-fw fa-user-plus"></span> Add to Address Book
              </button>
            `}
          ` : ''}
        ` : html`
          No identity information found
        `}
      </div>
    `
  }

  // ${this.renderSignal({icon: 'fab fa-twitter', url: 'https://twitter.com/pfrazee', userid: 'pfrazee', directory})}
  // ${this.renderSignal({icon: 'fab fa-github', url: 'https://github.com/pfrazee', userid: 'pfrazee', directory})}
  // renderSignal (signal) {
  //   return html`
  //     <div class="identity">
  //       <span class="fa-fw ${signal.icon}"></span>
  //       <a href=${signal.url}>${signal.userid}</a>
  //     </div>
  //     <div class="verifier">
  //       Verified by <a href=${signal.directory.url}>${signal.directory.title}</a>
  //     </div>
  //   `
  // }

  // events
  // =

  async onToggleSaveContact (e) {
    var isContact = this.cert && this.cert.ident ? this.cert.ident.contact : false
    if (isContact) {
      await beaker.contacts.remove(this.url)
    } else {
      await beaker.contacts.requestAddContact(this.url)
    }
    emit(this, 'change-url', {detail: {url: this.url}})
  }
}

customElements.define('identity-signals', Identity)
