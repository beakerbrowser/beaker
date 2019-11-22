import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize, ucfirst, toNiceUrl, toNiceDomain } from '../../app-stdlib/js/strings.js'
import mainCSS from '../css/main.css.js'
import './com/forks.js'
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
      manifest: {type: Object},
      requestedPerms: {type: Object},
      forks: {type: Array},
      followers: {type: Array}
    }
  }

  static get styles () {
    return [mainCSS]
  }

  get isDat () {
    return this.url && this.url.startsWith('dat:')
  }

  get isHttps () {
    return this.url && this.url.startsWith('https:')
  }

  get isHttp () {
    return this.url && this.url.startsWith('http:')
  }

  get isRootDrive () {
    return this.origin === navigator.filesystem.url
  }

  get drive () {
    return new DatArchive(this.url)
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

  get isDatDomainUnconfirmed () {
    // viewing a dat at a hostname but no domain is confirmed
    var hostname = this.hostname.replace(/\+.*$/i, '')
    return this.isDat && !isDatHashRegex.test(hostname) && this.info.domain !== hostname
  }

  constructor () {
    super()
    this.reset()

    // global event listeners
    // window.addEventListener('blur', e => {
    //   beaker.browser.toggleSiteInfo(false)
    //   this.reset()
    // })
    // window.addEventListener('keydown', e => {
    //   if (e.key === 'Escape') {
    //     beaker.browser.toggleSiteInfo(false)
    //   }
    // })
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
    this.user = undefined
    this.isLoading = true
    this.readOnly = true
    this.info = undefined
    this.requestedPerms = undefined
    this.currentDriveHandler = undefined
    this.driveHandlers = []
  }

  async load () {
    this.isLoading = true
    if (!this.url) return
    try {
      if (!this.user) {
        let st = await navigator.filesystem.stat('/profile')
        let userDrive = new DatArchive(st.mount.key)
        this.user = await userDrive.getInfo()
      }

      this.info = {}
      if (this.isDat) {
        // get drive info
        let drive = this.drive
        this.info = await drive.getInfo()
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

      this.currentDriveHandler = await beaker.browser.getTabDriveHandler()
      this.driveHandlers = await beaker.types.getDriveHandlers(this.info.type)
      console.log(this.currentDriveHandler, this.driveHandlers)

      // choose default view
      if (!this.view) {
        this.view = this.isDat ? 'apps' : 'permissions'
      }

      // all sites: get requested perms
      var perms = await beaker.sitedata.getPermissions(this.origin)
      this.requestedPerms = await Promise.all(Object.entries(perms).map(async ([perm, value]) => {
        var opts = {}
        var permParam = beakerPermissions.getPermParam(perm)
        if (isDatHashRegex.test(permParam)) {
          let archiveInfo
          try { archiveInfo = await (new DatArchive(permParam)).getInfo() }
          catch (e) { /* ignore */ }
          opts.title = archiveInfo && archiveInfo.title ? archiveInfo.title : toNiceDomain(permParam)
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
      return html`<div></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.renderSiteInfo()}
      ${this.renderNav()}
      <div class="inner">
        ${this.isDatDomainUnconfirmed ? html`
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

        ${this.view === 'apps' ? html`
          <div class="handlers">
            ${repeat(this.driveHandlers, h => this.renderHandler(h))}
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
      </div>
    `
  }

  renderSiteInfo () {
    if (this.isRootDrive) {
      // dont render anything in the root drive
      return ''
    }
    return html`
      <div class="site-info">
        <div class="details">
          <h1>${this.info.title}</h1>
          ${this.isDat && this.info.description ? html`<p class="desc">${this.info.description}</p>` : ''}
          ${this.isDat ? this.renderAuthor() : ''}
          ${this.isDat && this.info.forkOf ? html`
            <p class="fork-of"><span class="fas fa-fw fa-code-branch"></span> Fork of <a href=${this.info.forkOf}>${toNiceUrl(this.info.forkOf)}</a></p>
          ` : ''}
        </div>
      </div>
    `
  }

  renderAuthor () {
    if (!this.info.author) return ''
    return html`
      <p class="author">
        by <a href="${this.info.author}" target="_blank">Paul Frazee</a>
      </p>
    `
  }

  renderNav () {
    if (this.isRootDrive) return ''
    return html`
      <div class="nav">
        <div class="tabs">
          ${this.isDat ? html`
            <a class=${classMap({active: this.view === 'apps'})} @click=${e => this.onSetView(e, 'apps')}>
              <span class="fas fa-fw fa-drafting-compass"></span>
              Viewing with
            </a>
          ` : ''}
          <a class=${classMap({active: this.view === 'permissions'})} @click=${e => this.onSetView(e, 'permissions')}>
            <span class="fas fa-fw fa-key"></span>
            Permissions
          </a>
          ${this.isDat ? html`
            <a class=${classMap({active: this.view === 'peers'})} @click=${e => this.onSetView(e, 'peers')}>
              <span class="fas fa-fw fa-share-alt"></span>
              ${this.info.peers} ${pluralize(this.info.peers, 'peer')}
            </a>
          ` : ''}
        </div>
      </div>
    `
  }

  renderHandler (handler) {
    const isCurrent = this.currentDriveHandler === handler.url
    return html`
      <div class="handler" @click=${e => this.onSelectHandler(e, handler)}>
        <span class="far fa-fw fa-${isCurrent ? 'check-circle' : 'circle'}"></span>
        <img class="favicon" src="asset:favicon:${handler.url}">
        <span class="title">${handler.title}</span>
      </div>
    `
  }

  // events
  // =

  onSetView (e, view) {
    e.preventDefault()
    this.view = view
  }

  async onSelectHandler (e, handler) {
    this.currentDriveHandler = handler.url
    await beaker.browser.setTabDriveHandler(handler.url)
    beaker.browser.refreshPage()
    beaker.browser.toggleSiteInfo(false)
  }
}

customElements.define('site-info-app', SiteInfoApp)
