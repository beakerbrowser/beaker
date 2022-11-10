/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import buttonsCSS from './buttons.css'
import './img-fallbacks.js'
import { enumeratePerms } from '../../lib/session-permissions'

class CreateSessionModal extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return [commonCSS, buttonsCSS, css`
    .wrapper {
      padding: 0;
    }

    h1.title {
      font-size: 17px;
      padding: 14px 20px;
      border-color: #dddde0;
      margin: 0;
    }

    form {
      padding: 0;
      margin: 0;
    }

    .user {
      display: flex;
      align-items: center;
      border-bottom: 1px solid #dddde0;
      padding: 12px 20px;
      height: 55px;
      box-sizing: border-box;
    }

    .user img {
      border-radius: 50%;
      object-fit: cover;
      width: 32px;
      height: 32px;
      margin-right: 16px;
      box-sizing: border-box;
      border: 1px solid #fff;
    }

    .user .title {
      padding-right: 10px;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user .description {
      flex: 1;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .permissions {
      padding: 0 20px;
    }

    .permission {
      font-size: 14px;
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
    this.cbs = undefined
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.user = params.user

    var permsEnum = enumeratePerms(params.permissions)
    console.log(JSON.stringify({permsEnum}))
    this.publicPerms = permsEnum.filter(p => p.location === 'public')
    this.privatePerms = permsEnum.filter(p => p.location === 'private')
    this.publicPerms.sort(sortByAccess)
    this.privatePerms.sort(sortByAccess)
    function sortByAccess (a, b) {
      if (a.access === 'read') return -1
      if (b.access === 'read') return 1
      return -1
    }
    console.log(JSON.stringify({publicPerms: this.publicPerms}))
    console.log(JSON.stringify({privatePerms: this.privatePerms}))

    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          This site would like to sign in as...
        </h1>

        <form @submit=${this.onSubmit}>
          <div class="user">
            <beaker-img-fallbacks>
              <img src="asset:thumb-30:${this.user?.url}" slot="img1">
              <img src="beaker://assets/default-user-thumb" slot="img2">
            </beaker-img-fallbacks>
            <div class="title"><span>${this.user?.title || 'Anonymous'}</span></div>
            <div class="description"><span>${this.user?.description}</span></div>
          </div>

          <div class="permissions">
            <h3>Permissions (public data):</h3>
            <ul>
              <li class="permission"><strong>Read</strong> all of your public profile data</li>
              ${(this.publicPerms || []).map(perm => html`
                <li class="permission">
                  <strong>Write</strong> your ${perm.recordType}
                </li>
              `)}
            </ul>
            ${this.privatePerms?.length ? html`
              <h3>Permissions (private data):</h3>
              <ul>
                ${(this.privatePerms || []).map(perm => html`
                  <li class="permission">
                    <strong>
                      ${perm.access === 'write' ? `
                        Read and write
                      ` : `
                        Read
                      `}
                    </strong>
                    your ${perm.location} ${perm.recordType}
                  </li>
                `)}
              </ul>
            ` : ''}
          </div>

          <div class="form-actions">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5">OK</button>
          </div>
        </form>
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
    this.cbs.resolve()
  }
}

customElements.define('create-session-modal', CreateSessionModal)