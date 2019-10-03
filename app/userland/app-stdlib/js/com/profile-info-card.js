import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { toNiceDomain } from '../strings.js'
import { emit } from '../dom.js'
import buttonsCSS from '../../css/buttons.css.js'
import profileInfoCardCSS from '../../css/com/profile-info-card.css.js'
import './hoverable.js'

export class ProfileInfoCard extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      showControls: {type: Boolean, attribute: 'show-controls'},
      viewProfileBaseUrl: {type: String, attribute: 'view-profile-base-url'},
      fontawesomeSrc: {type: String, attribute: 'fontawesome-src'}
    }
  }

  constructor () {
    super()
    this.user = null
    this.showControls = false
    this.viewProfileBaseUrl = 'intent:unwalled.garden/view-profile?url='
    this.fontawesomeSrc = ''
  }

  getViewUrl (user) {
    return this.viewProfileBaseUrl ? `${this.viewProfileBaseUrl}${encodeURIComponent(user.url)}` : user.url
  }

  render () {
    if (!this.user) return html`<div></div>`
    var viewProfileUrl = this.getViewUrl(this.user)
    return html`
      ${this.fontawesomeSrc ? html`<link rel="stylesheet" href="${this.fontawesomeSrc}">` : ''}
      <div class="cover-photo"><img src="asset:cover:${this.user.url}"></div>
      <div class="avatar"><a href="${viewProfileUrl}"><img src="asset:thumb:${this.user.url}"></a></div>
      <div class="ident">
        <div><a class="title" href="${viewProfileUrl}">${this.user.title}</a></div>
        <div><a class="domain" href="${viewProfileUrl}">${toNiceDomain(this.user.url)}</a></div>
      </div>
      <div class="description ${this.showControls ? '' : 'extra-pad'}">${this.user.description}</div>
      ${this.showControls ? this.renderControls() : ''}
      ${this.showControls ? this.renderFollowers() : ''}
    `
  }

  renderControls () {
    if (this.user.isYou) {
      return html`
        <div class="controls">
          <span class="follows-you">This is you</span>
          <button class="btn" @click=${e => emit(this, 'edit-profile')}>
            Edit profile
          </button>
        </div>
      `
    }
    return html`
      <div class="controls">
        ${this.user.isFollowingYou ? html`<span class="follows-you">Follows you</span>` : html`<span></span>`}
        ${this.user.isFollowed
          ? html`
            <beaker-hoverable @click=${e => emit(this, 'unfollow', {detail: this.user})}>
              <button class="btn transparent" slot="default" style="width: 100px"><span class="fa fa-check"></span> Following</button>
              <button class="btn warning" slot="hover" style="width: 100px"><span class="fa fa-times"></span> Unfollow</button>
            </beaker-hoverable>`
          : html`
            <button class="btn" @click=${e => emit(this, 'follow', {detail: this.user})}>
              <span class="fa fa-rss"></span> Follow
            </button>`}
      </div>
    `
  }

  renderFollowers () {
    const fs = this.user.followers
    if (!fs || !fs.length) return ''
    return html`
      <div class="followers">
        <h5>Followed by</h5>
        <div>
          ${fs.map(f => html`
            <a href="${this.getViewUrl(f)}"><img src="asset:thumb:${f.url}"></a>
          `)}
        </div>
      </div>
    `
  }
}
ProfileInfoCard.styles = [buttonsCSS, profileInfoCardCSS]

customElements.define('beaker-profile-info-card', ProfileInfoCard)