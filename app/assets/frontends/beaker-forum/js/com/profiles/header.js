import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import * as uwg from '../../lib/uwg.js'
import { writeToClipboard } from '../../lib/clipboard.js'
import * as contextMenu from '../context-menu.js'
import { EditProfilePopup } from '../popups/edit-profile.js'
import * as toast from '../toast.js'
import headerCSS from '../../../css/com/profiles/header.css.js'
import '../img-fallbacks.js'

export class ProfileHeader extends LitElement {
  static get properties () {
    return {
      showAdminCtrls: {type: Boolean, attribute: 'admin-ctrls'},
      id: {type: String},
      profile: {type: Object},
      error: {type: String}
    }
  }

  static get styles () {
    return headerCSS
  }

  constructor () {
    super()
    this.showAdminCtrls = false
    this.id = undefined
    this.profile = undefined
  }

  async load () {
    try {
      this.profile = await uwg.users.getByUserID(this.id)
    } catch (e) {
      this.error = e.toString()
    }
    await this.requestUpdate()
  }

  render () {
    if (this.error) {
      return html`<div class="error">${this.error}</div>`
    }
    if (!this.profile) return html`<span class="spinner"></span>`
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <button class="transparent menu" @click=${this.onClickMenu}><span class="fas fa-ellipsis-h"></span></button>
      <a class="avatar" href="/users/${this.profile.id}">
        <beaker-img-fallbacks>
          <img src="/users/${this.profile.id}/thumb" slot="img1">
          <img src="/.ui/img/default-user-thumb.jpg" slot="img2">
        </beaker-img-fallbacks>
      </a>
      <div class="main">
        <h1 class="title"><a href="/users/${this.profile.id}">${this.profile.title}</a></h1>
        <p class="info">
          <a class="id" href="/users/${this.profile.id}">${this.profile.id}</a>
        </p>
        <p class="info">
          <span class="description">${this.profile.description}</span>
        </p>
        <p class="ctrls">
          ${this.profile.isUser ? html`
            <button @click=${this.onEditProfile}>
              <span class="fas fa-fw fa-user-edit"></span>
              Edit your profile
            </button>
          ` : ''}
          ${this.showAdminCtrls ? html`
            <h4>Admin Tools</h4>
            <button @click=${this.onChangeUserId}>
              <span class="fas fa-fw fa-i-cursor"></span>
              Change User ID
            </button>
            <button @click=${this.onRemoveUser}>
              <span class="fas fa-fw fa-user-times"></span>
              Remove User
            </button>
          ` : ''}
        </p>
      </div>
    `
  }

  // events
  // =

  onClickMenu (e) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      roomy: true,
      noBorders: true,
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-link',
          label: 'Copy profile URL',
          click: () => {
            writeToClipboard(this.profile.url)
            toast.create('Copied to your clipboard')
          }
        }
      ]
    })
  }

  async onEditProfile (e) {
    try {
      await EditProfilePopup.create(document.body, {user: this.profile})
      location.reload()
    } catch (e) {
      // ignore
    }
  }

  async onChangeUserId () {
    var newId = prompt('Change this user\'s id to:', this.id)
    if (!newId) return
    try {
      await uwg.users.rename(this.id, newId)
      toast.create('User renamed', 'success')
      setTimeout(() => {window.location = `/users/${newId}`}, 1e3)
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onRemoveUser () {
    if (!confirm('Are you sure you want to remove this user?')) {
      return
    }
    try {
      await uwg.users.removeByUserID(this.id)
      toast.create('User removed', 'success')
      setTimeout(() => {window.location = '/'}, 1e3)
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

}

customElements.define('beaker-profile-header', ProfileHeader)
