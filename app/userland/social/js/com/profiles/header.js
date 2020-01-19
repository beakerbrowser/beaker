import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import * as uwg from '../../lib/uwg.js'
import { pluralize } from '../../lib/strings.js'
import * as toast from '../toast.js'
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
    this.profile = await uwg.profiles.get(this.id)
    await this.requestUpdate()
    await uwg.profiles.readSocialGraph(this.profile, this.user)
    await this.requestUpdate()
  }

  render () {
    if (!this.profile) return html`<span class="spinner"></span>`
    var id = this.profile.url.slice('hd://'.length)
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <a class="avatar" href="/${id}">
        <beaker-img-fallbacks>
          <img src="${this.profile.url}/thumb" slot="img1">
          <img src="/img/default-user-thumb.jpg" slot="img2">
        </beaker-img-fallbacks>
      </a>
      <div class="main">
        <h1 class="title"><a href="/${id}">${this.profile.title}</a></h1>
        <p class="info">
          <a class="id" href=${this.profile.url}>pfrazee.com</a>
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
          ` : typeof this.profile.isUserFollowing === 'undefined' ? html`
            <span class="spinner" style="position: absolute; top: 10px; right: 10px"></span>
          ` : html`
            <button class="" @click=${this.onToggleFollow}>
              ${this.profile.isUserFollowing ? html`
                <span class="fas fa-fw fa-user-minus"></span> Unfollow
              ` : html`
                <span class="fas fa-fw fa-user-plus"></span> Follow
              `}
            </button>
          `}
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

  async onToggleFollow (e) {
    try {
      if (this.profile.isUserFollowing) {
        await uwg.follows.remove(this.profile.url)
        toast.create(`Unfollowed ${this.profile.title}`)
      } else {
        await uwg.follows.add(this.profile.url, this.profile.title)
        toast.create(`Followed ${this.profile.title}`)
      }
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.log(e)
      return
    }
    this.load()
  }

}

customElements.define('beaker-profile-header', ProfileHeader)
