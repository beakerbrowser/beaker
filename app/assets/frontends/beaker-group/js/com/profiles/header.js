import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import * as uwg from '../../lib/uwg.js'
import { EditProfilePopup } from '../popups/edit-profile.js'
import headerCSS from '../../../css/com/profiles/header.css.js'
import '../img-fallbacks.js'

export class ProfileHeader extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      id: {type: String},
      profile: {type: Object}
    }
  }

  static get styles () {
    return headerCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.id = undefined
    this.profile = undefined
  }

  async load () {
    this.profile = await uwg.users.getByUserID(this.id)
    await this.requestUpdate()
  }

  render () {
    if (!this.profile) return html`<span class="spinner"></span>`
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <a class="avatar" href="/${this.profile.id}">
        <beaker-img-fallbacks>
          <img src="${this.profile.url}/thumb" slot="img1">
          <img src="/.ui/img/default-user-thumb.jpg" slot="img2">
        </beaker-img-fallbacks>
      </a>
      <div class="main">
        <h1 class="title"><a href="/${this.profile.id}">${this.profile.title}</a></h1>
        <p class="info">
          <a class="id" href="/${this.profile.id}">${this.profile.id}</a>
        </p>
        <p class="info">
          <span class="description">${this.profile.description}</span>
        </p>
        <p class="ctrls">
          ${this.profile.isUser ? html`
            <button class="" @click=${this.onEditProfile}>
              <span class="fas fa-fw fa-user-edit"></span>
              Edit your profile
            </button>
          ` : ''}
        </p>
      </div>
    `
  }

  // events
  // =

  async onEditProfile (e) {
    try {
      await EditProfilePopup.create(document.body, {user: this.profile})
      this.load()
    } catch (e) {
      // ignore
    }
  }

}

customElements.define('beaker-profile-header', ProfileHeader)
