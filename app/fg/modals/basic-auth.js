/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class BasicAuthModal extends LitElement {
  constructor () {
    super()
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.authInfo = params
    await this.requestUpdate()

    // adjust height based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({width, height})
  }

  // rendering
  // =

  render () {
    if (!this.authInfo) return html`<div class="wrapper"></div>`
    return html`
      <div class="wrapper">
        <h1 class="title">Login required</h1>

        <p class="help-text">
          ${this.authInfo.host} requires a username and password
        </p>

        <form @submit=${this.onSubmit}>
          <label for="username">Username</label>
          <input name="username" tabindex="2" value="${this.username || ''}" placeholder="Username" @change=${this.onChangeUsername} autofocus />

          <label for="password">Password</label>
          <input name="password" type="password" tabindex="3" value="${this.password || ''}"  placeholder="Password" @change=${this.onChangePassword} />

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5">Log In</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

onChangeUsername (e) {
  this.username = e.target.value
}

onChangePassword (e) {
  this.password = e.target.value
}

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.resolve({username: false, password: false})
  }

  async onSubmit (e) {
    e.preventDefault()
    this.cbs.resolve({username: this.username, password: this.password})
  }
}
BasicAuthModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  padding: 5px 15px;
}
`]

customElements.define('basic-auth-modal', BasicAuthModal)