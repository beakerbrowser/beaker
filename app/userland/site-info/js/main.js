import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { pluralize, toNiceDomain } from '../../app-stdlib/js/strings.js'
import _get from 'lodash.get'
import * as beakerPermissions from '@beaker/permissions'
import mainCSS from '../css/main.css.js'
import './com/drive-history.js'
import './com/drive-forks.js'
import './com/user-session.js'
import './com/requested-perms.js'

const isDatHashRegex = /^[a-z0-9]{64}/i

class SiteInfoApp extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      view: {type: String},
      user: {type: Object},
      feedAuthors: {type: Array},
      isLoading: {type: Boolean},
      readOnly: {type: Boolean},
      info: {type: Object},
      requestedPerms: {type: Object},
      driveCfg: {type: Object},
      forks: {type: Array}
    }
  }

  static get styles () {
    return [mainCSS]
  }

  get isDrive () {
    return this.url && this.url.startsWith('hyper:')
  }

  get isHttps () {
    return this.url && this.url.startsWith('https:')
  }

  get isHttp () {
    return this.url && this.url.startsWith('http:')
  }

  get isBeaker () {
    return this.url && this.url.startsWith('beaker:')
  }

  get isRootDrive () {
    return this.origin === hyperdrive.getSystemDrive().url
  }

  get drive () {
    return hyperdrive.load(this.url)
  }

  get origin () {
    let urlp = new URL(this.url)
    return urlp.origin
  }

  get hostname () {
    let urlp = new URL(this.url)
    return urlp.hostname
  }

  get pathname () {
    let urlp = new URL(this.url)
    return urlp.pathname
  }

  get isDriveDomainUnconfirmed () {
    // viewing a dat at a hostname but no domain is confirmed
    var hostname = this.hostname.replace(/\+.*$/i, '')
    return this.isDrive && !isDatHashRegex.test(hostname) && this.info.domain !== hostname
  }

  constructor () {
    super()
    this.reset()

    // global event listeners
    window.addEventListener('blur', e => {
      beaker.browser.toggleSiteInfo(false)
      this.reset()
    })
    window.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        beaker.browser.toggleSiteInfo(false)
      }
    })
    const globalAnchorClickHandler = (isPopup) => e => {
      e.preventDefault()
      var a = e.path.reduce((acc, v) => acc || (v.tagName === 'A' ? v : undefined), undefined)
      if (a) {
        var href = a.getAttribute('href')
        if (href && href !== '#' && !href.startsWith('beaker://')) {
          if (isPopup || e.metaKey || a.getAttribute('target') === '_blank') {
            beaker.browser.openUrl(href, {setActive: true})
          } else {
            beaker.browser.gotoUrl(href)
          }
          beaker.browser.toggleSiteInfo(false)
        }
      }
    }
    document.body.addEventListener('auxclick', globalAnchorClickHandler(true))
    document.body.addEventListener('click', globalAnchorClickHandler(false))

    // export interface
    window.init = this.init.bind(this)
    window.reset = this.reset.bind(this)
  }

  init (params) {
    this.url = params.url
    this.load()
  }

  reset () {
    this.url = ''
    this.view = undefined
    this.isLoading = true
    this.readOnly = true
    this.info = undefined
    this.driveCfg = undefined
    this.forks = undefined
    this.requestedPerms = undefined
  }

  async load () {
    this.isLoading = true
    if (!this.url) return
    try {
      this.info = {}
      if (this.isDrive) {
        // get drive info
        let drive = this.drive
        ;[this.info, this.driveCfg, this.forks] = await Promise.all([
          drive.getInfo(),
          beaker.drives.get(this.url),
          beaker.drives.getForks(this.url)
        ])
        this.readOnly = !this.info.writable

        // watch for network events
        if (!this.onNetworkChanged) {
          // TODO
          // this.onNetworkChanged = (e) => {
          //   this.info.peers = e.peers
          //   this.requestUpdate()
          // }
          // drive.addEventListener('network-changed', this.onNetworkChanged)
        }
      } else {
        this.info = {
          title: this.hostname,
          domain: this.isHttps ? this.hostname : undefined
        }
      }

      // choose default view
      if (!this.view) {
        if (this.isDrive) {
          this.view = 'forks'
        } else {
          this.view = 'permissions'
        }
      }

      // all sites: get requested perms
      var perms = await beaker.sitedata.getPermissions(this.origin)
      this.requestedPerms = await Promise.all(Object.entries(perms).map(async ([perm, value]) => {
        var opts = {}
        var permParam = beakerPermissions.getPermParam(perm)
        if (isDatHashRegex.test(permParam)) {
          let driveInfo
          try { driveInfo = await hyperdrive.load(permParam).getInfo() }
          catch (e) { /* ignore */ }
          opts.title = driveInfo && driveInfo.title ? driveInfo.title : toNiceDomain(permParam)
        }
        return {perm, value, opts}
      }))
    } catch (e) {
      console.error(e)
    }
    this.isLoading = false
  }

  // rendering
  // =

  render () {
    if (this.isLoading) {
      return html`<div class="loading"><span class="spinner"></span> Loading...</div>`
    }
    if (this.isDrive && this.info && this.info.version === 0) {
      return html`
        <div class="site-info">
          <div class="details">
            <h1>Site not found</h1>
            <p class="protocol">Make sure the address is correct and try again</p>
          </div>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div>
        ${this.renderSiteInfo()}
        ${this.renderNav()}
        ${this.renderView()}
      </div>
    `
  }

  renderSiteInfo () {
    var protocol = ''
    if (this.isHttps) protocol = html`<p class="protocol">Accessed using a secure connection</p>`
    if (this.isBeaker) protocol = html`<p class="protocol">This page is served by Beaker</p>`
    var isSaved = _get(this.driveCfg, 'saved')
    return html`
      <div class="site-info">
        <div class="details">
          ${this.isDrive ? html`
            <div class="floating-right">
              <button class="transparent" title=${isSaved ? 'Saved to My Library' : 'Save to My Library'} @click=${this.onClickToggleSaved}>
                ${isSaved ? html`<span class="far fa-check-square"></span> Saved` : html`<span class="far fa-square"></span> Saved`}
              </button>
              <button class="transparent" title="Drive Properties" @click=${this.onClickDriveProperties}><span class="far fa-list-alt"></span></button>
            </div>
          ` : ''}
          <h1>${this.info.title}</h1>
          ${this.isDrive && this.info.description ? html`<p class="desc">${this.info.description}</p>` : ''}
          ${protocol}
        </div>
      </div>
    `
  }

  renderNav () {
    if (this.isRootDrive) return ''
    return html`
      <div class="nav">
        <div class="tabs">
          ${this.isDrive ? html`
            <a class=${classMap({active: this.view === 'forks'})} @click=${e => this.onSetView(e, 'forks')}>
              <span class="fas fa-fw fa-code-branch"></span>
              Forks
            </a>
            <a class=${classMap({active: this.view === 'revisions'})} @click=${e => this.onSetView(e, 'revisions')}>
              <span class="fas fa-fw fa-history"></span>
              Revisions
            </a>
            <a class=${classMap({active: this.view === 'peers'})} @click=${e => this.onSetView(e, 'peers')}>
              <span class="fas fa-fw fa-share-alt"></span>
              ${this.info.peers} ${pluralize(this.info.peers, 'peer')}
            </a>
          ` : ''}
          <a class=${classMap({active: this.view === 'permissions'})} @click=${e => this.onSetView(e, 'permissions')}>
            <span class="fas fa-fw fa-key"></span>
            Permissions
          </a>
        </div>
      </div>
    `
  }

  renderView () {
    return html`
      <div class="inner">
        ${this.isDriveDomainUnconfirmed ? html`
          <div class="notice">
            <p><span class="fas fa-fw fa-exclamation-triangle"></span> Domain issue</p>
            <p>
              This site has not confirmed <code>${this.hostname}</code> as its primary domain.
              It's safe to view but you will not be able to follow it or use its advanced features.
            </p>
          </div>
        ` : ''}

        ${this.isHttp ? html`
          <div class="notice">
            <p class="warning">
              <span class="fas fa-exclamation-triangle"></span> Your connection to this site is not secure.
            </p>
            <p>
              You should not enter any sensitive information on this site (for example, passwords or credit cards) because it could be stolen by attackers.
            </p>
          </div>
        ` : ''}

        ${this.view === 'permissions' ? html`
          <user-session
            origin=${this.origin}
          ></user-session>
          <requested-perms
            origin=${this.origin}
            .perms=${this.requestedPerms}
          ></requested-perms>
        ` : ''}
 
        ${this.view === 'forks' ? html`
          <drive-forks url=${this.url} origin=${this.origin} .info=${this.info} .forks=${this.forks} @change-url=${this.onChangeUrl}></drive-forks>
        ` : ''}

        ${this.view === 'revisions' ? html`
          <drive-history url=${this.url} origin=${this.origin} .info=${this.info}></drive-history>
        ` : ''}
      </div>
    `
  }

  async updated () {
    setTimeout(() => {
      // adjust height based on rendering
      var height = this.shadowRoot.querySelector('div').clientHeight
      if (!height) return
      beaker.browser.resizeSiteInfo({height})
    }, 50)
  }

  // events
  // =

  onSetView (e, view) {
    e.preventDefault()
    this.view = view
  }

  onChangeUrl (e) {
    this.url = e.detail.url
    beaker.browser.gotoUrl(this.url)
    this.load()
  }

  async onClickToggleSaved (e) {
    if (_get(this.driveCfg, 'saved')) {
      await beaker.drives.remove(this.origin)
    } else {
      await beaker.drives.configure(this.origin)
    }
    this.load()
  }

  onClickDriveProperties (e) {
    beaker.browser.toggleSiteInfo(false)
    navigator.drivePropertiesDialog(this.origin)
  }
}

customElements.define('site-info-app', SiteInfoApp)
