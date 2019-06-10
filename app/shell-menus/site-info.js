/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import prettyHash from 'pretty-hash'
import _get from 'lodash.get'
import { PERM_ICONS, renderPermDesc } from '../lib/fg/perms'
import { getPermId, getPermParam } from '../lib/strings'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

const IS_DAT_KEY_REGEX = /^[0-9a-f]{64}$/i

class SiteInfoMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.url = null
    this.loadError = null
    this.datInfo = null
    this.sitePerms = null
  }

  async init (params) {
    // fetch tab information
    var state = await bg.views.getTabState('active', {datInfo: true, sitePerms: true})
    this.url = state.url
    this.loadError = state.loadError
    this.datInfo = state.datInfo
    this.sitePerms = state.sitePerms

    // update site perms
    this.sitePerms = await Promise.all(Object.entries(state.sitePerms).map(async ([perm, value]) => {
      var opts = {}
      var permParam = getPermParam(perm)
      if (IS_DAT_KEY_REGEX.test(permParam)) {
        let archiveInfo
        try { archiveInfo = await bg.datArchive.getInfo(permParam) }
        catch (e) { /* ignore */ }
        opts.title = archiveInfo && archiveInfo.title ? archiveInfo.title : prettyHash(permParam)
      }
      return {perm, value, opts}
    }))

    // render
    await this.requestUpdate()

    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    await bg.shellMenus.resizeSelf({height})
  }

  get protocol () {
    try {
      var u = new URL(this.url)
      return u.protocol
    } catch (e) {
      return ''
    }
  }

  get hostname () {
    try {
      var u = new URL(this.url)
      return u.hostname
    } catch (e) {
      return ''
    }
  }

  // rendering
  // =

  render () {
    var permsEls = []
    if (this.sitePerms) {
      for (var perm of this.sitePerms) {
        permsEls.push(this.renderPerm(perm))
      }
    }

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="details">
          <div class="details-title">
            ${this.renderTitle()}
          </div>
          <p class="details-desc">
            ${this.renderProtocolDescription()}
          </p>
        </div>
        ${permsEls.length ? html`<h2 class="perms-heading">Permissions</h2>` : ''}
        <div class="perms">${permsEls}</div>
      </div>
    `
  }

  renderTitle () {
    if (this.datInfo && this.datInfo.title) {
      return this.datInfo.title
    } else if (this.protocol === 'dat:') {
      return 'Untitled'
    }
    return this.hostname
  }

  renderProtocolDescription () {
    const protocol = this.protocol
    const isInsecureResponse = _get(this, 'loadError.isInsecureResponse')
    if (protocol === 'https:' && !isInsecureResponse) {
      return 'Your connection to this site is secure.'
    }
    if ((protocol === 'https:' && isInsecureResponse) || protocol === 'http:') {
      return html`
        <div>
          <p>Your connection to this site is not secure.</p>
          <small>
            You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.
          </small>
        </div>
      `
    }
    if (protocol === 'dat:') {
      return html`
        <div>
          This site was downloaded from a secure peer-to-peer network.
          <a @click=${this.onClickLearnMore}>Learn More</a>
        </div>
      `
    }
    if (protocol === 'beaker:') {
      return 'This page is provided by Beaker. Your information on this page is secure.'
    }
    return ''
  }

  renderPerm ({perm, value, opts}) {
    const permId = getPermId(perm)
    const permParam = getPermParam(perm)
    const cls = classMap({checked: value})
    return html`
      <div class="perm">
        <label class=${cls} @click=${e => this.onTogglePerm(perm)}>
          <i class="${PERM_ICONS[permId]}"></i>
          ${renderPermDesc({bg, url: this.url, permId, permParam, permOpts: opts})}
          <input type="checkbox" value="${perm}" ?checked=${value}>
        </label>
      </div>`
  }

  // events
  // =

  onTogglePerm (perm) {
    // update perm
    var permObj = this.sitePerms.find(o => o.perm === perm)
    var newValue = (permObj.value == 1) ? 0 : 1
    bg.sitedata.setPermission(this.url, perm, newValue).then(() => {
      permObj.value = newValue
      this.requestUpdate()
    })
  }

  onClickLearnMore () {
    bg.shellMenus.createTab('https://github.com/beakerbrowser/beaker/wiki/Is-Dat-%22Secure-P2P%3F%22')
  }
}
SiteInfoMenu.styles = [inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  color: #333;
  background: #fff;
}

a {
  color: blue;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}

.details {
  padding: 15px;
}

.details small {
  font-size: 12px;
  color: #707070;
}

.details-title {
  font-size: 14px;
  font-weight: 500;
}

.details-desc {
  margin-bottom: 0;
  line-height: 1.3;
}

.perms-heading {
  font-size: 11px;
  font-weight: 500;
  color: #707070;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin: 5px 0 5px 15px;
}

.perms {
  background: #fafafa;
  border-radius: 0 0 4px 4px;
  overflow-x: hidden;
}

.perms i {
  color: #777;
  margin-right: 7px;
}

.perms .perm {
  border-top: 1px solid #eee;
}

.perms label {
  display: flex;
  align-items: center;
  padding: 8px 15px;
  margin: 0;
  font-weight: 400;
}

.perms label span {
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perms input {
  height: auto;
  margin: 0;
  margin-left: auto;
}
`]

customElements.define('site-info-menu', SiteInfoMenu)
