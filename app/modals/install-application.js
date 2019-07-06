/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import { ucfirst } from '../lib/strings'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

class InstallApplicationModal extends LitElement {
  constructor () {
    super()
    this.cbs = null
    this.url = ''
    this.appInfo = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.url = params.url
    this.appInfo = await bg.applications.getInfo(params.url)
    console.log(this.appInfo)
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.appInfo) return html`<div></div>`
    return html`
      <div class="wrapper">
        <h1 class="title">Install ${this.appInfo.title || 'application'}</h1>

        <form @submit=${this.onSubmit}>
          ${this.appInfo.description ? html`<p>${this.appInfo.description}</p>` : ''}

          ${this.appInfo.permissions.length > 0 ? html`
            <h3>Permissions:</h3>
            <ul class="permissions">
              ${repeat(this.appInfo.permissions, perm => html`
                <li>${perm.description}</li>
              `)}
            </ul>
          ` : ''}
          
          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="cancel" tabindex="5">Cancel</button>
            <button type="submit" class="primary" tabindex="6">Install</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    try {
      await bg.applications.install(this.url)
      this.cbs.resolve(true)
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
InstallApplicationModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  padding: 10px 20px 16px;
}

form {
  padding: 0;
  margin: 0;
}

h3 {
  margin: 1em 0;
  font-weight: 600;
}

`]

customElements.define('install-application-modal', InstallApplicationModal)