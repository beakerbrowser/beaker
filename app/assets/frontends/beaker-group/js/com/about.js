import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { GroupSettingsPopup } from './popups/group-settings.js'
import css from '../../css/com/about.css.js'
import * as uwg from '../lib/uwg.js'
import { pluralize } from '../lib/strings.js'
import MarkdownIt from '../../vendor/markdown-it.js'
import * as toast from './toast.js'

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
    this.userCount = undefined
    this.rules = undefined
  }

  async load () {
    var drive = new Hyperdrive(location)
    this.info = await drive.getInfo()
    this.requestUpdate()
    this.userCount = await uwg.users.count()
    this.requestUpdate()
    this.rules = await drive.readFile('/rules.md').catch(e => undefined)
    this.requestUpdate()
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
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
      ${this.rules ? html`
        <h4>${this.info.title || 'Gropu'} Rules</h4>
        <div class="rules">
          ${unsafeHTML(md.render(this.rules))}
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
    var url = prompt('URL of the user to add')
    if (!url) return
    var id = prompt('Choose an ID (username) for the new user')
    if (!id) return
    try {
      await uwg.users.add(url, id)
      toast.create('User added', 'success')
      setTimeout(() => {window.location = `/${id}`}, 1e3)
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('beaker-about', About)
