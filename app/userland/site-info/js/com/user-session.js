import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import userSessionCSS from '../../css/com/user-session.css.js'

class UserSession extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      session: {type: Object}
    }
  }

  static get styles () {
    return userSessionCSS
  }

  constructor () {
    super()
    this.origin = ''
    this.session = null
  }

  async connectedCallback () {
    this.session = undefined // TODO await navigator.session.get(this.origin)
    super.connectedCallback()
  }

  // rendering
  // =

  render () {
    if (!this.session) return html`<div></div>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">

      <div class="field-group">
        <div class="field-group-title">User session</div>
        <div class="user">
          <img src="asset:thumb:${this.session.profile.url}">
          <div class="details">
            <div class="title">${this.session.profile.title}</div>
            <div class="url"><a href="${this.session.profile.url}" @click=${this.onClickLink}>${toNiceUrl(this.session.profile.url)}</a></div>
          </div>
          <div style="margin-left: auto" @click=${this.onClickLogout}>
            <button>Logout</button>
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onClickLink (e) {
    e.preventDefault()
    beaker.browser.openUrl(e.currentTarget.getAttribute('href'), {setActive: true})
  }

  async onClickLogout (e) {
    await navigator.session.destroy(this.origin)
    this.session = null
  }
}

customElements.define('user-session', UserSession)
