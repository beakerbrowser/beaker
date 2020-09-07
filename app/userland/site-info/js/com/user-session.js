import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import userSessionCSS from '../../css/com/user-session.css.js'

class UserSession extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      sessionUser: {type: Object}
    }
  }

  static get styles () {
    return userSessionCSS
  }

  constructor () {
    super()
    this.origin = ''
    this.sessionUser = undefined
  }
  // rendering
  // =

  render () {
    if (!this.sessionUser) return html`<div></div>`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">

      <div class="field-group">
        <div class="field-group-title">User session</div>
        <div class="user">
          <img src="asset:thumb:${this.sessionUser.url}">
          <div class="details">
            <div class="title">${this.sessionUser.title}</div>
            <div class="url"><a href="${this.sessionUser.url}" @click=${this.onClickLink}>${toNiceUrl(this.sessionUser.url)}</a></div>
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
    emit(this, 'logout')
  }
}

customElements.define('user-session', UserSession)
