import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as beakerPermissions from '../../../../lib/permissions'
import sitePermsCSS from '../../css/com/site-perms.css.js'

class RequestedPerms extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      sessionPerms: {type: Array},
      requestedPerms: {type: Array}
    }
  }

  static get styles () {
    return [sitePermsCSS]
  }

  constructor () {
    super()
    this.origin = ''
    this.sessionPerms = []
    this.requestedPerms = []
  }
  // rendering
  // =

  render () {
    var requestedPerms = this.requestedPerms.map(perm => this.renderRequestedPerm(perm)).filter(el => typeof el !== 'undefined')
    if (!this.sessionPerms?.length && !requestedPerms.length) {
      return html`<div class="field-group">No permissions assigned</div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.sessionPerms?.length ? html`
        <div class="field-group">
          <div class="field-group-title">Session Permissions</div>
          ${this.sessionPerms.map(perm => html`
            <div>
              ${perm.access === 'write' ? `Read and write` : `Read`}
              your ${perm.location} ${perm.recordType}
            </div>
          `)}
        </div>
      ` : ''}
      ${requestedPerms.length ? html`
        <div class="field-group">
          <div class="field-group-title">${this.sessionPerms?.length ? 'Additional ' : ''}Permissions</div>
          ${requestedPerms}
        </div>
      ` : ''}
    `
  }

  renderRequestedPerm ({perm, value, opts}) {
    const permId = beakerPermissions.getPermId(perm)
    const permParam = beakerPermissions.getPermParam(perm)
    const desc = beakerPermissions.renderPermDesc({bg: null, html, url: this.origin, permId, permParam, permOpts: opts})
    if (!desc) return
    return html`
      <div>
        <span class="fa-fw ${beakerPermissions.PERM_ICONS[permId]}"></span>
        ${desc}:
        <select @change=${e => this.onChangePerm(e, perm)}>
          <option value="1" ?selected=${value}>Allow</option>
          <option value="0" ?selected=${!value}>Deny</option>
        </select>
        <a href="#" @click=${e => this.onClearPerm(e, perm)}><span class="fas fa-fw fa-times"></span></a>
      </div>
    `
  }

  // events
  // =

  async onChangePerm (e, perm) {
    var permObj = this.requestedPerms.find(o => o.perm === perm)
    if (!permObj) return
    var newValue = +(e.currentTarget.value)
    await beaker.sitedata.setPermission(this.origin, perm, newValue)
    permObj.value = newValue
    this.requestUpdate()
  }

  async onClearPerm (e, perm) {
    e.preventDefault()
    var permObj = this.requestedPerms.find(o => o.perm === perm)
    if (!permObj) return
    await beaker.sitedata.clearPermission(this.origin, perm)
    this.requestedPerms = this.requestedPerms.filter(p => p !== permObj)
    this.requestUpdate()
  }
}

customElements.define('site-perms', RequestedPerms)
