import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import { enumeratePerms } from '../../../../lib/session-permissions'
import viewCSS from '../../css/views/site-sessions.css.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'

class SiteSessionsView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.sessions = undefined
  }

  async load () {
    // fetch data
    this.sessions = await beaker.browser.listSiteSessions()
    this.sessions.forEach(async sess => {
      sess.site = await beaker.index.getSite(sess.siteOrigin)
      sess.user = await beaker.index.getSite(sess.userUrl)
      this.requestUpdate()
    })
    console.log(this.sessions)
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.sessions) return html``
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="form-group">
        <h2>Site Sessions</h2>
        <div class="section">
          <div class="sessions-list">
            ${this.sessions.length === 0 ? html`
              <div class="empty">No active sessions</div>
            ` : ''}
            ${this.sessions.map(this.renderSiteSession.bind(this))}
          </div>
        </div>
      </div>
    `
  }

  renderSiteSession (session) {
    return html`
      <div class="session">
        <div class="site">
          <h3>
            Session:
            <a href=${session.siteOrigin} target="_blank">
              ${session.site?.title || session.siteOrigin}
            </a>
          </h3>
        </div>
        <div class="user">
          <img src="asset:thumb:${session.user?.url}">
          <div class="details">
            <div class="title">${session.user?.title}</div>
            <div class="url"><a href="${session.user?.url}" target="_blank">${toNiceUrl(session.user?.url)}</a></div>
          </div>
          <div style="margin-left: auto" @click=${e => this.onClickLogout(e, session)}>
            <button>Logout</button>
          </div>
        </div>
        <div class="permissions">
          <h4>Permissions</h4>
          <ul>
            <li class="permission">
              Read all of your public profile data
            </li>
            ${enumeratePerms(session.permissions).map(perm => html`
              <li class="permission">
                ${perm.access === 'write' ? `Read and write` : `Read`}
                your ${perm.location} ${perm.recordType}
              </li>
            `)}
          </ul>
        </div>
      </div>
    `
  }

  // events
  // =

  async onClickLogout (e, session) {
    await beaker.browser.destroySiteSession(session.siteOrigin)
    toast.create(`Signed out of ${session.site?.title || 'site'}`)
    this.load()
  }
}
customElements.define('site-sessions-view', SiteSessionsView)
