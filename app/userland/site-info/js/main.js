import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { pluralize, ucfirst, toNiceUrl, toNiceDomain } from '../../app-stdlib/js/strings.js'
import libTools from '@beaker/library-tools'
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
      rootUrl: {type: String},
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

  get isRootArchive () {
    return this.origin === this.rootUrl
  }

  get archive () {
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

  get isLocalUser () {
    // TODO handle other users than the current one
    return this.origin === this.user.url
  }

  get isDatDomainUnconfirmed () {
    // viewing a dat at a hostname but no domain is confirmed
    var hostname = this.hostname.replace(/\+.*$/i, '')
    return this.isDat && !isDatHashRegex.test(hostname) && this.info.domain !== hostname
  }

  get isSaved () {
    return this.info && this.info.userSettings && this.info.userSettings.isSaved
  }

  get isAutoUploadEnabled () {
    return this.info && this.info.userSettings && this.info.userSettings.autoUpload
  }

  get numForks () {
    return this.forks && this.forks.length
  }

  get isFollowing () {
    return this.user && this.followers && this.followers.find(u => u.url === this.user.url)
  }

  get numFollowers () {
    return this.followers && this.followers.length
  }

  get isPreviewModeEnabled () {
    return this.info && this.info.userSettings && this.info.userSettings.previewMode
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
          if (isPopup || e.metaKey) {
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
    this.rootUrl = null
    this.user = null
    this.feedAuthors = []
    this.isLoading = true
    this.readOnly = true
    this.info = null
    this.manifest = null
    this.requestedPerms = null
    this.forks = null
    this.followers = null
  }

  async load () {
    this.isLoading = true
    if (!this.url) return

    if (!this.rootUrl) {
      this.rootUrl = (await navigator.filesystem.get()).url
    }
    if (!this.user) {
      this.user = await uwg.profiles.me()
    }
    this.followedUsers = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
   
    this.info = {}
    this.manifest = null
    this.followers = null
    if (this.isDat) {
      // get archive info
      let archive = this.archive
      this.info = await archive.getInfo()
      this.readOnly = !this.info.isOwner

      // watch for network events
      if (!this.onNetworkChanged) {
        // TODO
        // this.onNetworkChanged = (e) => {
        //   this.info.peers = e.peers
        //   this.requestUpdate()
        // }
        // archive.addEventListener('network-changed', this.onNetworkChanged)
      }

      // read manifest
      try {
        this.manifest = JSON.parse(await archive.readFile('/dat.json', 'utf8'))
      } catch (e) {
        this.manifest = {}
      }

      // fetch forks
      this.forks = await uwg.library.list({forkOf: this.origin})

      // read social data
      this.followers = (await uwg.follows.list({author: this.feedAuthors, topic: this.origin})).map(({author}) => author)
    } else {
      this.info = {
        title: this.hostname,
        domain: this.isHttps ? this.hostname : undefined  
      }
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

    this.isLoading = false
  }

  async updateManifest (fn) {
    // read current manifest
    var manifest
    try {
      manifest = JSON.parse(await this.archive.readFile('/dat.json', 'utf8'))
    } catch (e) {
      manifest = {}
    }
    // run updater fn
    fn(manifest)
    // write new manifest
    await this.archive.writeFile('/dat.json', JSON.stringify(manifest, null, 2))
    this.manifest = manifest
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
      ${this.renderPrimaryActions()}
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

        ${this.isDat && this.view === 'forks' ? html`
          <site-info-forks
            origin=${this.origin}
            .forkOf=${this.info.forkOf}
            .forks=${this.forks}
          ></site-info-forks>
        ` : ''}

        ${this.view === 'settings' ? html`
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
    if (this.isRootArchive) {
      // dont render anything in the root archive
      return ''
    }
    return html`
      <div class="site-info">
        <div class="details">
          <h1>${this.info.title}</h1>
          ${this.isDat ? this.renderDescription() : ''}
          ${this.isDat ? this.renderDetails() : ''}
          ${this.isDat && this.info.forkOf ? html`
            <p class="fork-of"><span class="fas fa-fw fa-code-branch"></span> Fork of <a href=${this.info.forkOf}>${toNiceUrl(this.info.forkOf)}</a></p>
          ` : ''}
          ${this.renderFollowers()}
        </div>
      </div>
    `
  }

  renderDescription () {
    return html`
      <p class="desc"><span class="fas fa-fw fa-info-circle"></span> ${this.info.description || html`<em>No description</em>`}</p>
    `
  }

  renderDetails () {
    var cat = libTools.typeToCategory(this.info && this.info.type)
    var more = cat === 'person'
      ? html`<span class="fas fa-fw fa-rss" style="margin-left: 4px"></span> ${this.numFollowers} ${pluralize(this.numFollowers, 'follower')}`
      : html`by <a href="#">Paul Frazee</a>`
    return html`<p class="type">
      <span class="fa-fw ${libTools.getFAIcon(cat)}"></span>
      ${ucfirst(cat)}
      ${more}
    </p>`
  }

  renderFollowers () {
    if (this.numFollowers) {
      return html`
        <div class="followers">
          <span>Followed by</span>
          ${repeat(this.followers, user => html`
            <a
              href="#"
              @click=${e => this.onClickLink(e, user.url)}
              @auxclick=${e => this.onClickLink(e, user.url, true)}
            >${user.title || 'Anonymous'}</a>
          `)}
        </div>
      `
    }
  }

  renderPrimaryActions () {
    if (!this.isDat || this.isRootArchive) {
      return ''
    }

    var btns = []
    if (!this.isLocalUser && this.info.type === 'unwalled.garden/person') {
      let cantFollow = false
      let tooltip = 'Receive updates from this site'
      if (this.isDatDomainUnconfirmed) {
        cantFollow = true
        tooltip = 'This site needs to confirm its domain'
      }
      if (this.isFollowing) {
        btns.push(html`
          <button class="primary" ?disabled=${cantFollow} data-tooltip=${tooltip} @click=${this.onClickUnfollow}>
            <span class="fas fa-fw fa-rss"></span>
            Following
          </button>
        `)
      } else {
        btns.push(html`
          <button ?disabled=${cantFollow} data-tooltip=${tooltip} @click=${this.onClickFollow}>
            <span class="fas fa-fw fa-rss"></span>
            Follow
          </button>
        `)
      }
    }
    if (this.isSaved) {
      btns.push(html`
        <button
          class="primary tooltip-right"
          data-tooltip=${this.isLocalUser ? 'This is your personal site (cannot unsave)' : 'This site is saved to your library'}
          ?disabled=${this.isLocalUser}
          @click=${this.onClickUnsave}
        >
          <span class="fas fa-fw fa-save"></span>
          Saved
        </button>
      `)
    } else {
      btns.push(html`
        <button
          class="tooltip-right"
          data-tooltip="Add this site to your library"
          ?disabled=${this.isLocalUser}
          @click=${this.onClickSave}
        >
          <span class="fas fa-fw fa-save"></span>
          Save
        </button>
      `)
    }
    if (this.isSaved && this.isAutoUploadEnabled) {
      btns.push(html`
        <button class="primary" @click=${this.onClickUnhost} data-tooltip="Host this site from your device">
          <span class="fas fa-fw fa-cloud-upload-alt"></span>
          Hosting
        </button>
      `)
    } else {
      btns.push(html`
        <button @click=${this.onClickHost} data-tooltip="Host this site from your device">
          <span class="fas fa-fw fa-cloud-upload-alt"></span>
          Host
        </button>
      `)
    }
    return html`
      <div class="primary-actions">
        ${btns}
        <button @click=${this.onClickFork} data-tooltip="Create a duplicate of this site">
          <span class="fas fa-fw fa-code-branch"></span>
          Fork Site
        </button>
      </div>
    `
  }

  renderNav () {
    if (this.isRootArchive) return ''
    return html`
      <div class="nav">
        <div class="tabs">
          <a class=${classMap({active: this.view === 'settings'})} @click=${e => this.onSetView(e, 'settings')}>
            <span class="fas fa-fw fa-cog"></span>
            Settings
          </a>
          ${this.isDat ? html `
            <a class=${classMap({active: this.view === 'peers'})} @click=${e => this.onSetView(e, 'peers')}>
              <span class="fas fa-fw fa-share-alt"></span>
              ${this.info.peers} ${pluralize(this.info.peers, 'peer')}
            </a>
            <a class=${classMap({active: this.view === 'forks'})} @click=${e => this.onSetView(e, 'forks')}>
              <span class="fas fa-fw fa-code-branch"></span>
              ${this.numForks} ${pluralize(this.numForks, 'fork')}
            </a>
          ` : ''}
        </div>
      </div>
    `
  }

  // events
  // =

  onSetView (e, view) {
    e.preventDefault()
    this.view = view
  }

  onOpenFile (e) {
    beaker.browser.gotoUrl(e.detail.url)
  }

  onClickLink (e, href, aux) {
    e.preventDefault()
    if (aux || e.metaKey) {
      beaker.browser.openUrl(href, {setActive: true, isSidebarActive: true})
    } else {
      beaker.browser.gotoUrl(href)
    }
  }

  async onClickChangeTitle (e) {
    var title = prompt('Rename this site', this.info.title || '')
    if (title) {
      await this.updateManifest(manifest => {
        manifest.title = title
      })
      this.info.title = title
      this.requestUpdate()
    }
  }

  async onClickChangeDescription (e) {
    var description = prompt('Enter the new description', this.info.description || '')
    if (description) {
      await this.updateManifest(manifest => {
        manifest.description = description
      })
      this.info.description = description
      this.requestUpdate()
    }
  }

  async onClickHost (e) {
    await uwg.library.configure(this.origin, {isSaved: true, isHosting: true})
    this.load()
  }

  async onClickUnhost (e) {
    await uwg.library.configure(this.origin, {isHosting: false})
    this.load()
  }

  async onClickSave (e) {
    await uwg.library.configure(this.origin, {isSaved: true})
    this.load()
  }

  async onClickUnsave (e) {
    await uwg.library.configure(this.origin, {isSaved: false})
    this.load()
  }

  async onClickFollow () {
    await uwg.follows.add(this.origin)
    this.load()
  }

  async onClickUnfollow () {
    await uwg.follows.remove(this.origin)
    this.load()
  }

  async onClickFork () {
    const clone = await DatArchive.fork(this.origin, {prompt: true}).catch(() => false)
    if (clone) {
      beaker.browser.openUrl(clone.url, {setActive: true, isSidebarActive: true})
    }
  }
}

customElements.define('site-info-app', SiteInfoApp)
