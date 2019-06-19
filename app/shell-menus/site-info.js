/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import prettyHash from 'pretty-hash'
import _get from 'lodash.get'
import { PERM_ICONS, renderPermDesc } from '../lib/fg/perms'
import { getPermId, getPermParam } from '../lib/strings'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import './hoverable.js'

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
    this.me = null
    this.followers = null
    this.follows = null
  }

  async init (params) {
    // fetch tab information
    var state = await bg.views.getTabState('active', {datInfo: true, sitePerms: true})
    this.url = state.url
    this.loadError = state.loadError
    this.datInfo = state.datInfo
    this.sitePerms = state.sitePerms
    if (this.datInfo) {
      this.me = await bg.profiles.me()
      this.followers = (await bg.follows.list({filters: {topics: this.datInfo.url}})).map(({author}) => author)
      this.follows = (await bg.follows.list({filters: {authors: this.datInfo.url}})).map(({topic}) => topic)

      // filter down to users followed by the local user
      if (!this.isMe) {
        let userFollows = (await bg.follows.list({filters: {authors: this.me.url}})).map(({topic}) => topic).concat([this.me])
        this.followers = this.followers.filter(f1 => userFollows.find(f2 => f2.url === f1.url))
      }
    }

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

  get isDat () {
    return !!this.datInfo
  }

  get isMe () {
    return this.datInfo && this.me && this.me.url === this.datInfo.url
  }

  get amIFollowing () {
    if (!this.me || !this.followers) return false
    return !!this.followers.find(f => f.url === this.me.url)
  }

  get connectedSites () {
    if (!this.followers) return []
    return this.followers.filter(f1 => this.follows.find(f2 => f2.url === f1.url))
  }

  get followingSites () {
    if (!this.followers) return []
    return this.followers.filter(f1 => !this.follows.find(f2 => f2.url === f1.url))
  }

  get siteTitle () {
    if (this.datInfo && this.datInfo.title) {
      return this.datInfo.title
    } else if (this.protocol === 'dat:') {
      return 'Untitled'
    }
    return this.hostname
  }

  get siteDescription () {
    if (this.datInfo && this.datInfo.description) {
      return this.datInfo.description
    }
    return false
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
          ${this.renderActions()}
          ${this.renderSiteTitle()}
          ${this.renderSiteDescription()}
          ${this.renderSiteSocialgraph()}
        </div>
        ${permsEls.length ? html`<h2 class="perms-heading">Permissions</h2>` : ''}
        <div class="perms">${permsEls}</div>
        <div class="details-protocol-description">
          ${this.renderProtocolDescription()}
        </div>
      </div>
    `
  }

  renderSiteTitle () {
    return html`
      <div class="details-site-title">
        ${this.siteTitle}
      </div>
    `
  }

  renderSiteDescription () {
    var siteDescription = this.siteDescription
    if (!siteDescription) return ''
    return html`
      <div class="details-site-description">
        ${this.siteDescription}
      </div>
    `
  }

  renderSiteSocialgraph () {
    if (!this.isDat) return ''
    var connectedSites = this.connectedSites
    var followingSites = this.followingSites
    const list = arr => {
      if (arr.length <= 1) return arr
      if (arr.length === 2) return [arr[0], ' and ', arr[1]]
      var arr2 = []
      for (let i = 0; i < arr.length; i++) {
        arr2.push(arr[i])
        if (i <= arr.length - 3) arr2.push(', ')
        if (i === arr.length - 2) arr2.push(', and ')
      }
      return arr2
    }
    return html`
      <div class="details-site-socialgraph">
        <span class="far fa-user"></span>
        ${connectedSites.length
          ? html`
            Connected with ${list(connectedSites.map(site => this.renderFollow(site)))}.
          ` : ''}
        ${followingSites.length
          ? html`
            Followed by ${list(followingSites.map(site => this.renderFollow(site)))}.
          ` : ''}
        ${!connectedSites.length && !followingSites.length
          ? 'Not followed by anyone you follow.'
          : ''}
      </div>
    `
  }

  renderFollow (site) {
    return html`<a href="#" @click=${e => this.onOpenUrl(e, site.url)} title="${site.title}">${site.title}</a>`
  }

  renderActions () {
    if (this.isMe) {
      return html`
        <div class="details-actions">
          <span class="label">This is you!</span>
          <button @click=${e => this.onOpenUrl(e, 'beaker://settings')}><span class="fas fa-pencil-alt"></span> Edit profile</button>
        </div>
      `
    }
    if (this.isDat) {
      return html`
        <div class="details-actions">
          ${this.amIFollowing
            ? html`
              <beaker-hoverable @click=${this.onToggleFollow}>
                <button slot="default" style="width: 86px"><span class="fa fa-check"></span> Following</button>
                <button class="warning" slot="hover" style="width: 86px"><span class="fa fa-times"></span> Unfollow</button>
              </beaker-hoverable>
            `
            : html`<button @click=${this.onToggleFollow}><span class="fas fa-rss"></span> Follow</button>`}
        </div>
      `
    }
    return ''
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

  async onToggleFollow () {
    if (this.amIFollowing) {
      await bg.follows.remove(this.datInfo.url)
    } else {
      await bg.follows.add(this.datInfo.url)
    }
    this.init()
  }

  onOpenUrl (e, url) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    bg.shellMenus.createTab(url)
  }

  onClickLearnMore () {
    bg.shellMenus.createTab('https://dat.foundation')
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

button {
  cursor: pointer;
}

.label {
  position: relative;
  top: -1px;
  display: inline-block;
  color: rgb(59, 62, 66);
  font-weight: 500;
  margin-right: 4px;
  padding: 4px 6px 5px;
  border-radius: 4px;
  background: rgb(210, 219, 228);
  font-size: 10px;
  line-height: 1;
}

.details {
  position: relative;
  padding: 15px 15px 0;
}

.details small {
  font-size: 12px;
  color: #707070;
}

.details-site-title {
  font-size: 19px;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.details-site-description {
  margin-bottom: 1rem;
  line-height: 1.4;
  font-size: 14px;
}

.details-site-socialgraph {
  margin-bottom: 1rem;
}

.details-protocol-description {
  border-top: 1px solid #ddd;
  padding: 0.5rem;
  background: rgb(243, 241, 241);
  line-height: 1.3;
}

.details-actions {
  position: absolute;
  top: 15px;
  right: 15px;
}

.perms-heading {
  font-size: 11px;
  font-weight: 500;
  color: #707070;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  margin: 25px 0 5px 15px;
}

.perms {
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
