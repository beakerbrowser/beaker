/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import { writeToClipboard } from '../lib/event-handlers'
import commonCSS from './common.css'

class UsersMenu extends LitElement {
  static get properties () {
    return {
      submenu: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.user = null
    this.users = []
    this.submenu = ''
  }

  async init (params) {
    this.user = await bg.users.getCurrent().catch(err => undefined)
    this.users = await bg.users.list()
    await this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.user) return html`<div></div>`
    if (this.submenu === 'switch-user') {
      return this.renderSwitchUser()
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div>
        <div class="menu-item user current-user">
          <img src="asset:thumb:${this.user.url}?cache_buster=${Date.now()}">
          <div class="user-details">
            <div class="user-title">${this.user.title}</div>
            <div class="user-label">${this.user.label}</div>
          </div>
        </div>

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenPage(e, this.user.url)}>
            <i class="fas fa-external-link-alt"></i>
            <span class="label">Open my profile</span>
          </div>

          <div class="menu-item" @click=${this.onCopyMyAddress}>
            <i class="fas fa-link"></i>
            <span class="label">Copy my address</span>
          </div>

          <div class="menu-item" @click=${this.onEditMyProfile}>
            <i class="fas fa-edit"></i>
            <span class="label">Edit my profile</span>
          </div>
          
          <hr>

          <div class="menu-item" @click=${e => this.onShowSubmenu('switch-user')}>
            <i class="fas fa-user"></i>
            <span class="label">Switch user</span>
            <i class="more fas fa-angle-right"></i>
          </div>
        </div>
      </div>
    `
  }

  renderSwitchUser () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <button class="btn" @click=${e => this.onShowSubmenu('')} title="Go back">
            <i class="fa fa-angle-left"></i>
          </button>
          <h2>Switch user</h2>
        </div>

        <hr>

        ${this.users.map(user => html`
          <div class="menu-item user" @click=${e => this.onOpenUser(e, user)}>
            <img src="asset:thumb:${user.url}?cache_buster=${Date.now()}">
            <div class="user-details">
              <div class="user-title">${user.title}</div>
              <div class="user-label">${user.label}</div>
            </div>
          </div>
        `)}

        <hr>

        <div class="menu-item" @click=${this.onCreateNewUser}>
          <i class="fas fa-plus"></i>
          <span>New user</span>
        </div>
        <div class="menu-item" @click=${this.onCreateTemporaryUser}>
          <i class="far fa-user"></i>
          <span>Temporary user</span>
        </div>
      </div>`
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var height = (this.shadowRoot.querySelector('div').clientHeight|0)
    if (height) {
      bg.shellMenus.resizeSelf({height})
    }
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }

  onCopyMyAddress (e) {
    writeToClipboard(this.user.url)
    bg.shellMenus.close()
  }

  async onEditMyProfile (e) {
    var userUrl = this.user.url
    bg.shellMenus.close()
    await bg.shellMenus.createModal('user', this.user)
  }

  onOpenUser (e, user) {
    bg.shellMenus.createWindow({userSession: user})
    bg.shellMenus.close()
  }

  async onCreateNewUser () {
    bg.shellMenus.close()
    var user = await bg.shellMenus.createModal('user', {})
    bg.shellMenus.createWindow({userSession: {url: user.url}})
  }

  async onCreateTemporaryUser () {
    bg.shellMenus.close()
    var user = await bg.users.createTemporary()
    bg.shellMenus.createWindow({userSession: {url: user.url, isTemporary: true}})
  }
}
UsersMenu.styles = [commonCSS, css`
.wrapper {
  padding: 4px 0;
}

.menu-item {
  height: 40px;
}

.menu-item i {
  margin: 0;
  padding-right: 8px;
}

.menu-item.user {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 400;
  height: 60px;
}

.menu-item.user img {
  margin-right: 14px;
  height: 40px;
  width: 40px;
  border-radius: 50%;
}

.menu-item.user .user-label {
  font-size: 12px;
}

.menu-item.current-user {
  height: 76px;
  border-bottom: 1px solid #ccc;
  cursor: default;
  font-size: 18px;
}

.menu-item.current-user:hover {
  background: inherit;
}

.menu-item.current-user img {
  height: 48px;
  width: 48px;
}
`]

customElements.define('users-menu', UsersMenu)
