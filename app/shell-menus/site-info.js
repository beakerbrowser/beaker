/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import prettyHash from 'pretty-hash'
import prettyBytes from 'pretty-bytes'
import _get from 'lodash.get'
import { PERM_ICONS, renderPermDesc } from '../lib/fg/perms'
import { getPermId, getPermParam, pluralize } from '../lib/strings'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import './hoverable.js'

const POLL_INTERVAL = 500 // ms
const IS_DAT_KEY_REGEX = /^[0-9a-f]{64}$/i

class SiteInfoMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.view = ''
    this.url = null
    this.loadError = null
    this.datInfo = null
    this.appInfo = null
    this.sitePerms = null
    this.me = null
    this.followers = null
    this.follows = null
    if (this.poll) {
      clearInterval(this.poll)
    }
    this.poll = 0
  }

  async init (params) {
    // fetch tab information
    this.view = ''
    var state = await bg.views.getTabState('active', {datInfo: true, sitePerms: true})
    this.url = state.url
    this.loadError = state.loadError
    this.datInfo = state.datInfo
    this.sitePerms = state.sitePerms

    if (this.isApplication) {
      this.appInfo = await bg.applications.getInfo(this.datInfo.url)
    }

    if (this.isDat) {
      this.poll = setInterval(this.doPoll.bind(this), POLL_INTERVAL)
    }

    // render
    this.requestUpdate()

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
    this.requestUpdate()
  }

  async doPoll () {
    try {
      var stats = await bg.views.getNetworkState('active')
      Object.assign(this.datInfo, stats)
      this.requestUpdate()
    } catch (e) {
      clearInterval(this.poll)
    }
  }

  updated () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.shellMenus.resizeSelf({height})
  }

  setView (v) {
    this.view = v
    this.requestUpdate()
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

  get isSaved () {
    return this.datInfo && this.datInfo.userSettings && this.datInfo.userSettings.isSaved
  }

  get isApplication () {
    return this.isDat && Array.isArray(this.datInfo.type) && this.datInfo.type.includes('unwalled.garden/application')
  }

  get isMe () {
    return this.datInfo && this.me && this.me.url === this.datInfo.url
  }

  get isMySite () {
    return this.datInfo && this.datInfo.isOwner
  }

  get amIFollowing () {
    if (!this.me || !this.followers) return false
    return !!this.followers.find(f => f.url === this.me.url)
  }

  get followsMe () {
    if (!this.me || !this.follows) return false
    return !!this.follows.find(f => f.url === this.me.url)
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
    if (this.view === 'settings') {
      return this.renderSettingsView()
    } else if (this.view === 'socialgraph') {
      return this.renderSocialgraphView()
    } else if (this.view === 'network') {
      return this.renderNetworkView()
    } else {
      return this.renderMainView()
    }
  }

  renderMainView () {
    var numFollowers = this.followers && this.followers.length || 0
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="details">
          ${this.renderActions()}
          <div class="heading">
            <h2>${this.siteTitle}</h2>
          </div>
          ${this.renderSiteDescription()}
        </div>
        ${this.isApplication ? html`
          <div class="application-state">
            ${this.appInfo.installed ? html`
              <span><i class="fas fa-check"></i> This application is installed</span>
              <button class="primary" @click=${this.onClickUninstall}>Uninstall</button>
            ` : html`
              <span><strong>Install ${this.siteTitle}</strong> to get the most out of it!</span>
              <button class="primary" @click=${this.onClickInstall}><i class="fas fa-download"></i> Install</button>
            `}
          </div>
        ` : ''}
        <div class="menu ${this.isDat ? 'centered' : ''}">
          ${this.isDat ? html`
            <div class="menu-item" @click=${e => this.setView('socialgraph')}>
              <span class="fa-fw far fa-user"></span>
              <span>${numFollowers} ${pluralize(numFollowers, 'follower')}</span>
            </div>
          ` : ''}
          ${this.isDat ? html`
            <div class="menu-item" @click=${e => this.setView('network')}>
              <span class="fa-fw fas fa-share-alt"></span>
              <span>${this.datInfo.peers} ${pluralize(this.datInfo.peers, 'peer')}</span>
            </div>
          ` : ''}
          <div class="menu-item" @click=${e => this.setView('settings')}>
            <span class="fa-fw fas fa-cog"></span>
            <span>Settings</span>
          </div>
        </div>
        ${this.renderProtocolDescription()}
      </div>
    `
  }

  renderSocialgraphView () {
    var connectedSites = this.connectedSites
    var followingSites = this.followingSites
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="heading">
          <button class="back" @click=${e => this.setView('')}>
            <span class="fas fa-caret-left"></span>
          </button>
          <h2>Social graph</h2>
        </div>
        <div class="content followers">
          ${connectedSites.length === 0 && followingSites.length === 0
            ? html`
              <h3>Followers</h3>
              <div class="empty">Not followed by anyone you know.</div>
            `
            : ''}
          ${connectedSites.length > 0
            ? html`
              <h3>Connected with</h3>
              ${connectedSites.map(f => html`
                <div class="follower" @click=${e => this.onOpenUrl(e, f.url)}>
                  <img src="asset:thumb:${f.url}">
                  <div class="title">${f.title}</div>
                </div>
              `)}
            ` : ''}
          ${followingSites.length > 0
            ? html`
              <h3>Followed by</h3>
              ${followingSites.map(f => html`
                <div class="follower" @click=${e => this.onOpenUrl(e, f.url)}>
                  <img src="asset:thumb:${f.url}">
                  <div class="title">${f.title}</div>
                </div>
              `)}
            ` : ''}
        </div>
      </div>
    `
  }

  renderNetworkView () {
    var stats = this.datInfo.networkStats
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="heading">
          <button class="back" @click=${e => this.setView('')}>
            <span class="fas fa-caret-left"></span>
          </button>
          <h2>Dat network</h2>
        </div>
        <div class="content" style="padding: 14px 13px">
          <div class="network-stats">
            <div>${this.datInfo.peers} <small>${pluralize(this.datInfo.peers, 'peer')}</small></div>
            <div>${prettyBytes(stats.uploadTotal)} <small>uploaded</small></div>
            <div>${prettyBytes(stats.downloadTotal)} <small>downloaded</small></div>
          </div>
          <div>
            <button
              @click=${e => this.onOpenUrl(e, `beaker://swarm-debugger/${this.datInfo.url}`)}
              style="margin-right: 5px"
            >Network Debugger</button>
            <span class="fas fa-fw fa-arrow-up"></span> ${prettyBytes(stats.uploadSpeed)}/s
            <span class="fas fa-fw fa-arrow-down"></span> ${prettyBytes(stats.downloadSpeed)}/s
          </div>
        </div>
      </div>
    `
  }

  renderSettingsView () {
    var permsEls = []
    if (this.appInfo && this.appInfo.installed && this.appInfo.enabled && this.appInfo.permissions.length) {
      permsEls = permsEls.concat(this.appInfo.permissions.map(this.renderAppPerm.bind(this)))
    }
    if (this.sitePerms) {
      permsEls = permsEls.concat(this.sitePerms.map(this.renderPerm.bind(this)).filter(Boolean))
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="heading">
          <button class="back" @click=${e => this.setView('')}>
            <span class="fas fa-caret-left"></span>
          </button>
          <h2>Settings</h2>
        </div>
        <div class="content">
          ${this.isMySite ? html`
            <h3>Site information</h3>
            <form @submit=${this.onSubmitSiteInformation}>
              <div class="field">
                <label>Title</label>
                <input name="title" type="text" placeholder="Title" value=${this.datInfo.title}>
              </div>
              <div class="field">
                <label>Description</label>
                <input name="description" type="text" placeholder="Description" value=${this.datInfo.description}>
              </div>
              <div class="field">
                <label></label>
                <div>
                  <button type="submit">Save</button>
                </div>
              </div>
            </form>
          ` : ''}
          <h3>Permissions</h3>
          ${permsEls.length > 0
            ? html`<div class="perms">${permsEls}</div>`
            : html`<div class="empty">No permissions assigned.</div>`}
        </div>
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
        </div>
      `
    } else if (this.isDat) {
      return html`
        <div class="details-actions">
          ${this.isMySite ? html`<span class="label">Your site</span>` : ''}
          ${this.followsMe ? html`<span class="label">Follows you</span>` : ''}
          ${!this.isMySite
            ? this.isSaved
              ? html`
                <beaker-hoverable @click=${this.onToggleSaved}>
                  <button slot="default" style="width: 76px"><span class="fas fa-save"></span> Saved</button>
                  <button class="warning" slot="hover" style="width: 76px"><span class="fas fa-times"></span> Unsave</button>
                </beaker-hoverable>
              `
              : html`<button @click=${this.onToggleSaved}><span class="fas fa-save"></span> Save</button>`
            : ''}
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
    if ((protocol === 'https:' && isInsecureResponse) || protocol === 'http:') {
      return html`
        <div class="details-protocol-description">
          <p><span class="fas fa-exclamation-triangle"></span> Your connection to this site is not secure.</p>
          <p>
            You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.
          </p>
        </div>
      `
    }
    return ''
  }

  renderAppPerm ({id, caps, description}) {
    return html`
      <div class="perm">
        <label><i class="far fa-window-restore"></i> Application: ${description}</label>
      </div>
    `
  }

  renderPerm ({perm, value, opts}) {
    if (perm.startsWith('app:')) return false // handle separately
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
      </div>
    `
  }

  // events
  // =

  async onToggleSaved () {
    this.datInfo.userSettings = this.datInfo.userSettings || {}
    if (this.isSaved) {
      await bg.archives.remove(this.datInfo.url)
      this.datInfo.userSettings.isSaved = false
    } else {
      await bg.archives.add(this.datInfo.url)
      this.datInfo.userSettings.isSaved = true
    }
    this.requestUpdate()
  }

  async onClickInstall () {
    var url = this.datInfo.url
    bg.shellMenus.close()
    if (await bg.applications.requestInstall(url)) {
      bg.shellMenus.loadURL(url) // refresh page
    }
  }

  async onClickUninstall () {
    bg.applications.uninstall(this.datInfo.url)
    bg.shellMenus.loadURL(this.datInfo.url) // refresh page
    bg.shellMenus.close()
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

  onSubmitSiteInformation (e) {
    e.preventDefault()
    e.stopPropagation()

    var updates = {
      title: e.currentTarget.title.value,
      description: e.currentTarget.description.value
    }
    bg.datArchive.configure(this.datInfo.url, updates)
    Object.assign(this.datInfo, updates)
    bg.shellMenus.loadURL(this.datInfo.url) // reload the page
  }

  onTogglePerm (perm) {
    // update perm
    var permObj = this.sitePerms.find(o => o.perm === perm)
    var newValue = (permObj.value == 1) ? 0 : 1
    bg.sitedata.setPermission(this.url, perm, newValue).then(() => {
      permObj.value = newValue
      this.requestUpdate()
    })
  }
}
SiteInfoMenu.styles = [inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  color: #333;
  background: #fff;
}

.heading {
  display: flex;
  align-items: center;
}

.back {
  margin: 10px;
  font-size: 18px;
  border: 0;
  box-shadow: none;
}

.back:hover {
  background: #eee;
}

h3 {
  margin: 0px 18px 12px;
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

.content {
  max-height: 400px;
  overflow-y: auto;
}

.details {
  position: relative;
  padding: 0 15px;
  min-height: 30px;
}

.details small {
  font-size: 12px;
  color: #707070;
}

.details-site-description {
  margin-bottom: 1rem;
  line-height: 1.4;
  font-size: 15px;
}

.details-protocol-description {
  border-top: 1px solid #ddd;
  padding: 15px;
  background: rgb(243, 241, 241);
  line-height: 1.3;
}

.details-protocol-description > :first-child {
  margin-top: 0;
}

.details-protocol-description > :last-child {
  margin-bottom: 0;
}

.details-actions {
  position: absolute;
  top: 15px;
  right: 15px;
}

.application-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #d2e6ff;
  padding: 10px 14px;
  border-top: 1px solid #6a96f9;
  border-bottom: 1px solid #6a96f9;
}

.application-state span {
  color: #093869;
}

.menu {
  display: flex;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  border-top: 1px solid #ddd;
}

.application-state + .menu {
  border-top: 0;
}

.menu.centered {
  text-align: center;
  font-size: 13px;
}

.menu-item {
  flex: 1;
  padding: 10px 13px;
  border-right: 1px solid #ddd;
  font-variant-numeric: tabular-nums;
}

.menu.centered .menu-item .fa-fw {
  margin-left: -5px;
}

.menu-item:last-child {
  border-right: 0;
}

.menu-item:hover {
  background: rgb(243, 241, 241);
}

.content {
  border-top: 1px solid #ddd;
  padding-bottom: 6px;
}

.content h3 {
  margin: 13px 13px 6px;
}

.empty {
  padding: 2px 13px 13px;
  font-size: 14px;
}

.follower {
  display: flex;
  align-items: center;
  padding: 10px 13px;
  cursor: default;
}

.follower:hover {
  background: #f5f5f5;
}

.follower img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 13px;
}

.follower .title {
  font-size: 15px;
}

.network-stats {
  display: flex;
  font-size: 16px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 0 0 10px;
  white-space: nowrap;
}

.network-stats > div {
  flex: 1;
  padding: 10px;
  border-right: 1px solid #ddd;
}

.network-stats > div:last-child {
  border-right: 0;
}


form {
  padding: 4px 0;
}

.field {
  display: flex;
  align-items: center;
  padding: 4px 13px;
}

.field label {
  flex: 0 0 80px;
}

.field input {
  flex: 1;
}

.perms {
  overflow-x: hidden;
}

.perms i {
  color: #777;
  margin-right: 7px;
}

.perms label {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  font-size: 14px;
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
