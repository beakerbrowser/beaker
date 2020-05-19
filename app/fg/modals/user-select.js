/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class UserSelectModal extends LitElement {
  static get properties () {
    return {
      selection: {type: String}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
    .wrapper {
      padding: 0;
    }

    h1.title {
      font-size: 17px;
      padding: 14px 20px;
      border-color: #bbb;
      margin: 0;
    }

    form {
      padding: 0;
      margin: 0;
    }

    .users {
      display: grid;
      grid-template-columns: repeat(auto-fill, 150px);
      gap: 14px 4px;
      padding: 14px 20px;
      max-height: 300px;
      overflow: auto;
      box-sizing: border-box;
      border-bottom: 1px solid #bbb;
    }

    .user {
      text-align: center;
    }

    .user .title {
      font-size: 15px;
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .user.selected .title span {
      display: inline-block;
      padding: 0 4px;
      border-radius: 4px;
    }

    .user img,
    .user .create-img {
      border-radius: 50%;
      object-fit: cover;
      width: 100px;
      height: 100px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }

    .user .create-img {
      margin: 0 auto 10px;
      background: #f3f3f8;
      color: #0003;
      font-size: 30px;
      padding: 36px 0;
    }

    .user.selected .title span {
      background: #2864dc;
      color: #fff;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 20px;
      text-align: left;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = null
    this.users = []
    this.selection = undefined
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.users = params.users || []
    this.selection = undefined
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">New session</h1>

        <form @submit=${this.onSubmit}>
          <div class="users">
            ${repeat(this.users, user => this.renderUser(user))}
            ${this.renderCreateUser()}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5" ?disabled=${!this.selection}>OK</button>
          </div>
        </form>
      </div>
    `
  }

  renderUser (user) {
    var selected = this.selection === user.url
    return html`
      <div class=${classMap({user: true, selected})} @click=${e => { this.selection = user.url }}>
        <img src="${user.url}/thumb">
        <div class="title"><span>${user.title}</span></div>
      </div>
    `
  }

  renderCreateUser () {
    var selected = this.selection === 'create'
    return html`
      <div class=${classMap({user: true, selected})} @click=${e => { this.selection = 'create' }}>
        <div class="create-img"><span class="fas fa-plus"></span></div>
        <div class="title"><span>New User</span></div>
      </div>
    `
  }

  // event handlers
  // =

  updated () {
    // adjust size based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()
    if (this.selection === 'create') {
      this.cbs.resolve({gotoCreate: true})
    } else {
      this.cbs.resolve({url: this.selection})
    }
  }
}

customElements.define('user-select-modal', UserSelectModal)