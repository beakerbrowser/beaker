import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { toNiceDomain, pluralize } from '../../app-stdlib/js/strings.js'
import { writeToClipboard } from '../../app-stdlib/js/clipboard.js'
import * as contextMenu from '../../app-stdlib/js/com/context-menu.js'
import * as toast from '../../app-stdlib/js/com/toast.js'
import _get from 'lodash.get'
import * as beakerPermissions from '../../../lib/permissions'
import mainCSS from '../css/main.css.js'
import './com/user-session.js'
import './com/requested-perms.js'
import './com/identity.js'
import './com/drive-forks.js'

const isDatHashRegex = /^[a-z0-9]{64}/i

class SiteInfoApp extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      view: {type: String},
      user: {type: Object},
      isLoading: {type: Boolean},
      info: {type: Object},
      cert: {type: Object},
      requestedPerms: {type: Object},
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
    return this.origin === beaker.hyperdrive.drive('hyper://system/').url
  }

  get drive () {
    return beaker.hyperdrive.drive(this.url)
  }

  get origin () {
    let urlp = new URL(this.url)
    return urlp.origin + '/'
  }

  get hostname () {
    let urlp = new URL(this.url)
    return urlp.hostname
  }

  get pathname () {
    let urlp = new URL(this.url)
    return urlp.pathname
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
    this.info = undefined
    this.cert = undefined
    this.driveCfg = undefined
    this.requestedPerms = undefined
    this.forks = undefined
    contextMenu.destroy()
  }

  async load () {
    this.isLoading = true
    if (!this.url) return
    try {
      this.info = {}
      this.driveCfg = undefined
      if (this.isDrive) {
        // get drive info
        let drive = this.drive
        ;[this.info, this.driveCfg, this.forks] = await Promise.all([
          drive.getInfo(),
          beaker.drives.get(this.url),
          beaker.drives.getForks(this.url)
        ])
      } else {
        this.info = {
          title: this.hostname,
          domain: this.isHttps ? this.hostname : undefined
        }
      }

      if (!this.view) {
        this.view = 'identity'
      }

      // all sites: get cert and requested perms
      var perms
      ;[perms, this.cert] = await Promise.all([
        beaker.sitedata.getPermissions(this.origin),
        beaker.browser.getCertificate(this.url)
      ])
      if (this.cert && this.cert.type === 'hyperdrive') {
        this.cert.driveInfo = this.info
      }
      this.requestedPerms = await Promise.all(Object.entries(perms).map(async ([perm, value]) => {
        var opts = {}
        var permParam = beakerPermissions.getPermParam(perm)
        if (isDatHashRegex.test(permParam)) {
          let driveInfo
          try { driveInfo = await beaker.beaker.hyperdrive.drive(permParam).getInfo() }
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
    var writable = this.info ? this.info.writable : false
    var isSaved = this.driveCfg ? this.driveCfg.saved : false
    var isInternal = this.driveCfg ? this.driveCfg.ident.internal : false
    return html`
      <div class="site-info">
        <div class="details">
          <p class="buttons">
            <button @click=${this.onCopyUrl}><span class="fas fa-fw fa-link"></span> Copy URL</button>
            ${this.isDrive && !isInternal ? html`
              ${writable ? html`
                <button @click=${this.onToggleSaveDrive}>
                  ${isSaved ? html`<span class="fas fa-fw fa-trash"></span> Remove From Library` : html`<span class="fas fa-fw fa-trash-restore"></span> Readd To Library`}
                </button>
              ` : html`
                <button @click=${this.onToggleSaveDrive}>
                  ${isSaved ? html`<span class="fas fa-fw fa-times"></span> Stop Hosting` : html`<span class="fas fa-fw fa-share-alt"></span> Host This Drive`}
                </button>
              `}
            ` : ''}
            ${this.isDrive ? html`
              <button @click=${this.onClickDriveTools}>
                Tools <span class="fa-fw fa fa-caret-down"></span>
              </button>
            ` : ''}
          </p>
        </div>
      </div>
    `
  }

  renderNav () {
    return html`
      <div class="nav">
        <div class="tabs">
          <a class=${classMap({active: this.view === 'identity'})} @click=${e => this.onSetView(e, 'identity')}>
            <span class="fas fa-fw fa-user"></span>
            Identity
          </a>
          <a class=${classMap({active: this.view === 'permissions'})} @click=${e => this.onSetView(e, 'permissions')}>
            <span class="fas fa-fw fa-key"></span>
            Permissions
          </a>
          ${this.isDrive ? html`
            <a class=${classMap({active: this.view === 'forks'})} @click=${e => this.onSetView(e, 'forks')}>
              <span class="fas fa-fw fa-code-branch"></span>
              Forks
            </a>
            ${''/* TODO <a class=${classMap({active: this.view === 'peers'})} @click=${e => this.onSetView(e, 'peers')}>
              <span class="fas fa-fw fa-share-alt"></span>
              ${this.info.peers} ${pluralize(this.info.peers, 'peer')}
            </a>*/}
          ` : ''}
        </div>
      </div>
    `
  }

  renderView () {
    return html`
      <div class="inner">
        ${this.view === 'identity' ? html`
          <identity-signals url=${this.url} .cert=${this.cert} @change-url=${this.onChangeUrl}></identity-signals>
        ` : ''}

        ${this.view === 'permissions' ? html`
          <requested-perms
            origin=${this.origin}
            .perms=${this.requestedPerms}
          ></requested-perms>
        ` : ''}

        ${this.view === 'forks' ? html`
          <drive-forks url=${this.url} origin=${this.origin} .info=${this.info} .forks=${this.forks} @change-url=${this.onChangeUrl}></drive-forks>
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

  onCopyUrl (e) {
    writeToClipboard(this.url)
    toast.create('URL Copied', '', 2e3)
  }

  async onClickDriveProperties (e) {
    await beaker.shell.drivePropertiesDialog(this.url)
    this.load()
  }

  async onToggleSaveDrive (e) {
    if (this.driveCfg && this.driveCfg.saved) {
      await beaker.drives.remove(this.origin)
    } else {
      await beaker.drives.configure(this.origin)
    }
    this.load()
  }

  async onClickDriveTools (e) {
    e.preventDefault()
    e.stopPropagation()
    let rect = e.currentTarget.getClientRects()[0]
    return contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'fas fa-fw fa-code-branch',
          label: 'Fork Drive',
          click: () => this.onForkDrive()
        },
        this.info && this.info.writable ? {
          icon: 'far fa-fw fa-folder-open',
          label: 'Sync with local folder',
          click: async () => {
            await beaker.folderSync.syncDialog(this.info.url)
            await beaker.browser.refreshTabState()
          }
        } : undefined,
        {
          icon: 'far fa-fw fa-list-alt',
          label: 'Drive Properties',
          click: () => this.onDriveProps()
        }
      ].filter(Boolean)
    })
  }

  async onForkDrive () {
    var drive = await beaker.hyperdrive.forkDrive(this.url, {detached: false})
    beaker.browser.openUrl(drive.url, {setActive: true})
  }

  async onDriveProps () {
    await beaker.shell.drivePropertiesDialog(this.url)
    this.load()
  }
}

customElements.define('site-info-app', SiteInfoApp)
