import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { GroupSettingsPopup } from './popups/group-settings.js'
import { AddUserPopup } from './popups/add-user.js'
import css from '../../css/com/about.css.js'
import * as uwg from '../lib/uwg.js'
import { pluralize } from '../lib/strings.js'
import MarkdownIt from '../../vendor/markdown-it.js'

const md = MarkdownIt({
  html: false, // Enable HTML tags in source
  xhtmlOut: false, // Use '/' to close single tags (<br />)
  breaks: true, // Convert '\n' in paragraphs into <br>
  linkify: false, // Autoconvert URL-like text to links
  typographer: true,
  quotes: '“”‘’'
})

export class About extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.info = undefined
    this.groupware = undefined
    this.userCount = undefined
    this.sidebarMd = undefined
  }

  async load () {
    var drive = hyperdrive.self
    this.info = await drive.getInfo()
    this.requestUpdate()
    this.groupware = await drive.readFile('/beaker-forum/groupware.json').then(JSON.parse).catch(e => undefined)
    this.requestUpdate()
    this.userCount = await uwg.users.count()
    this.requestUpdate()
    this.sidebarMd = await drive.readFile('/beaker-forum/sidebar.md').catch(e => undefined)
    this.requestUpdate()
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      ${this.groupware?.applications?.length ? html`
        <h4>Groupware</h4>
        <div class="groupware-grid">
          ${repeat(this.groupware.applications, app => html`
            <a href=${app.url} title=${app.title}>
              <img src=${app.icon || '/.ui/img/default-icon'}>
              <span>${app.title}</span>
            </a>
          `)}
        </div>
      ` : ''}
      <h4>About This Group</h4>
      <div class="description">${this.info ? (this.info.description || html`<em>No description<em>`) : ''}</div>
      <div class="counts">
        ${typeof this.userCount === 'undefined' ? '' : html`
          <a href="/users">
            <div class="number">${this.userCount}</div>
            <div class="label">${pluralize(this.userCount || 0, 'User')}</div>
          </a>
        `}
      </div>
      ${this.sidebarMd ? html`
        <div class="sidebar-md">
          ${unsafeHTML(md.render(this.sidebarMd))}
        </div>
      ` : ''}
      ${this.info?.writable ? html`
        <h4>Admin Tools</h4>
        <div class="admin">
          <button @click=${this.onAddUser}><span class="fas fa-fw fa-user-plus"></span> Add User</button>
          <button @click=${this.onEditSettings}><span class="fas fa-fw fa-cog"></span> Group Settings</button>
        </div>
      ` : ''}
    `
  }

  // events
  // =

  async onEditSettings () {
    try {
      await GroupSettingsPopup.create(document.body)
      location.reload()
    } catch (e) {
      // ignore
      throw e
    }
  }

  async onAddUser () {
    AddUserPopup.create(document.body)
  }
}

customElements.define('beaker-about', About)
