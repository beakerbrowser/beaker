/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import { toNiceUrl } from '../../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

class CreateUserSessionModal extends LitElement {
  constructor () {
    super()
    this.cbs = null
    this.site = null
    this.user = null
    this.permissions = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.site = params.site
    this.user = params.user
    this.permissions = params.permissions
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.site || !this.user) {
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <form @submit=${this.onSubmit}>
          <div class="user">
            <img src="asset:thumb:${this.user.url}">
            <div class="details">
              <div class="title">${this.user.title}</div>
              <div class="url">${toNiceUrl(this.user.url)}</div>
            </div>
          </div>

          <h3>This site would like to:</h3>
          <div class="permissions">
            <div><span class="fa-fw far fa-user-circle"></span> Read your public profile</div>
            ${repeat(this.permissions, perm => html`
              <div>
                <span class="fa-fw ${perm.icon}"></span>
                ${perm.description}
                <span class="caps">${perm.caps.join(', ')}</span>
              </div>
            `)}
          </div>
          
          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Deny</button>
            <button type="submit" class="primary" tabindex="6">Allow</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust height based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({width, height})
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    this.cbs.resolve(true)
  }
}
CreateUserSessionModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  padding: 12px 15px 12px;
  width: 340px;
}

form {
  padding: 0;
  margin: 0;
}

.user {
  text-align: center;
}

.user img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
}

.user .title {
  font-size: 18px;
  font-weight: 500;
}

h3 {
  margin: 1em 0;
  font-weight: 600;
  text-align: center;
}

.permissions {
  margin-bottom: 10px;
  font-size: 13px;
  border: 1px solid #e5e5e5;
  border-bottom: 0;
  border-radius: 3px;
  background: #fafafa;
  color: #555;
}

.permissions > div {
  padding: 10px;
  border-bottom: 1px solid #e5e5e5;
}

.permissions .fa-fw {
  margin-right: 5px;
}

.permissions .caps {
  float: right;
  font-weight: 500;
}

.form-actions {
  display: flex;
  justify-content: space-between;
}

.form-actions button {
  padding: 8px 12px;
}
`]

customElements.define('create-user-session-modal', CreateUserSessionModal)