import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as beakerPermissions from '../../../../lib/permissions'
import requestedPermsCSS from '../../css/com/requested-perms.css.js'

class RequestedPerms extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      perms: {type: Array}
    }
  }

  static get styles () {
    return [requestedPermsCSS]
  }

  constructor () {
    super()
    this.origin = ''
    this.perms = []
  }
  // rendering
  // =

  render () {
    var perms = this.perms.map(perm => this.renderPerm(perm)).filter(el => typeof el !== 'undefined')
    if (!perms.length) {
      return html`<div class="field-group">No permissions assigned</div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="field-group">
        <div class="field-group-title">Permissions</div>
        ${perms}
      </div>
    `
  }

  renderPerm ({perm, value, opts}) {
    const permId = beakerPermissions.getPermId(perm)
    const permParam = beakerPermissions.getPermParam(perm)
    const desc = beakerPermissions.renderPermDesc({bg: null, html, url: this.url, permId, permParam, permOpts: opts})
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
    var permObj = this.perms.find(o => o.perm === perm)
    if (!permObj) return
    var newValue = +(e.currentTarget.value)
    await beaker.sitedata.setPermission(this.origin, perm, newValue)
    permObj.value = newValue
    this.requestUpdate()
  }

  async onClearPerm (e, perm) {
    e.preventDefault()
    var permObj = this.perms.find(o => o.perm === perm)
    if (!permObj) return
    await beaker.sitedata.clearPermission(this.origin, perm)
    this.perms = this.perms.filter(p => p !== permObj)
    this.requestUpdate()
  }
}

customElements.define('requested-perms', RequestedPerms)
