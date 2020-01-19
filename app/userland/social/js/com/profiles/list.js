import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import * as toast from '../toast.js'
import listCSS from '../../../css/com/profiles/list.css.js'
import '../img-fallbacks.js'

export class ProfileList extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      query: {type: String},
      source: {type: String},
      profiles: {type: Array}
    }
  }

  static get styles () {
    return listCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.profiles = undefined
    this.query = undefined
    this.source = undefined
  }

  async load () {
    if (this.query === 'following') {
      this.profiles = (await uwg.follows.list({author: this.source}, {includeProfiles: true})).map(relation => relation.mount)
    } else if (this.query === 'followers') {
      this.profiles = (await uwg.follows.list({target: this.source}, {includeProfiles: true})).map(relation => relation.drive)
    }
    console.log(this.profiles)
    await this.requestUpdate()

    for (let profile of this.profiles) {
      profile.isUserFollowing = await uwg.follows.exists({author: this.user.url, target: profile.url})
      profile.isFollowingUser = await uwg.follows.exists({target: this.user.url, author: profile.url})
      await this.requestUpdate()
    }
  }

  render () {
    if (!this.profiles) return html`<span class="spinner"></span>`
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="profiles">
        ${repeat(this.profiles, profile => this.renderProfile(profile))}
      </div>
    `
  }
   
  renderProfile (profile) {
    var id = profile.url.slice('hd://'.length)
    return html`
      <div class="profile">
        <a class="avatar" href="/${id}">
          <beaker-img-fallbacks>
            <img src="${profile.url}/thumb" slot="img1">
            <img src="/img/default-user-thumb.jpg" slot="img2">
          </beaker-img-fallbacks>
        </a>
        <div class="main">
          <h1 class="title">
            <a href="/${id}">${profile.title}</a>
            ${profile.isFollowingUser ? html`<small>follows you</small>` : ''}
          </h1>
          <p class="info">
            <a class="id" href=${profile.url}>${id}</a>
          </p>
          <p class="info">
            <span class="description">${profile.description}</span>
          </p>
          <p class="ctrls">
            ${profile.isUser ? html`
              This is you
            ` : typeof profile.isUserFollowing === 'undefined' ? html`
              <span class="spinner" style="position: absolute; top: 10px; right: 10px"></span>
            ` : html`
              <button class="" @click=${e => this.onToggleFollow(e, profile)}>
                ${profile.isUserFollowing ? html`
                  <span class="fas fa-fw fa-user-minus"></span> Unfollow
                ` : html`
                  <span class="fas fa-fw fa-user-plus"></span> Follow
                `}
              </button>
            `}
          </p>
        </div>
      </div>
    `
  }

  // events
  // =

  async onToggleFollow (e, profile) {
    try {
      if (profile.isUserFollowing) {
        await uwg.follows.remove(profile.url)
        profile.isUserFollowing = false
        toast.create(`Unfollowed ${profile.title}`)
      } else {
        await uwg.follows.add(profile.url, profile.title)
        profile.isUserFollowing = true
        toast.create(`Followed ${profile.title}`)
      }
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.log(e)
      return
    }

    await this.requestUpdate()
  }

}

customElements.define('beaker-profile-list', ProfileList)
