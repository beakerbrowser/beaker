import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import { shorten } from '../../lib/strings.js'
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
    this.profiles = await uwg.users.list({}, {includeProfiles: true})
    console.log(this.profiles)
    await this.requestUpdate()
  }

  render () {
    if (!this.profiles) return html`<span class="spinner"></span>`
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="profiles">
        ${repeat(this.profiles, profile => this.renderProfile(profile))}
      </div>
    `
  }
   
  renderProfile (profile) {
    var id = profile.username
    return html`
      <div class="profile">
        <a class="avatar" href="/${id}">
          <beaker-img-fallbacks>
            <img src="${profile.url}/thumb" slot="img1">
            <img src="/.ui/img/default-user-thumb.jpg" slot="img2">
          </beaker-img-fallbacks>
        </a>
        <div class="main">
          <h1 class="title">
            <a href="/${id}">${profile.title}</a>
          </h1>
          <p class="info">
            <span class="description">${shorten(profile.description, 200)}</span>
          </p>
        </div>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-profile-list', ProfileList)
