import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { ifDefined } from '../../vendor/lit-element/lit-html/directives/if-defined.js'
import { SitesListPopup } from './popups/sites-list.js'
import css from '../../css/com/sites-list.css.js'
import { emit } from '../dom.js'
import { shorten, pluralize, isSameOrigin, toNiceDomain } from '../strings.js'
import { writeToClipboard } from '../clipboard.js'
import * as toast from './toast.js'

const EXPLORER_URL = site => `beaker://explorer/${site.url.slice('hyper://'.length)}`

export class SitesList extends LitElement {
  static get properties () {
    return {
      listing: {type: String},
      singleRow: {type: Boolean, attribute: 'single-row'},
      filter: {type: String},
      limit: {type: Number},
      profile: {type: Object},
      sites: {type: Array},
      emptyMessage: {type: String, attribute: 'empty-message'},
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.listing = undefined
    this.singleRow = false
    this.filter = undefined
    this.limit = undefined
    this.profile = undefined
    this.sites = undefined
    this.emptyMessage = undefined

    // query state
    this.activeQuery = undefined
  }

  get profileUrl () {
    return this.profile?.url
  }

  get isLoading () {
    return !this.sites || !!this.activeQuery
  }

  async load () {
    this.queueQuery()
  }

  updated (changedProperties) {
    if (typeof this.sites === 'undefined') {
      if (!this.activeQuery) {
        this.queueQuery()
      }
      return
    } else if (changedProperties.has('singleRow') && changedProperties.get('singleRow') != this.singleRow) {
      this.queueQuery()
    } else if (changedProperties.has('filter') && changedProperties.get('filter') != this.filter) {
      this.queueQuery()
    } else if (changedProperties.has('listing') && changedProperties.get('listing') != this.listing) {
      this.queueQuery()
    }
  }

  getSiteIdent (site) {
    if (isSameOrigin(site.origin, this.profileUrl)) {
      return 'profile'
    }
    if (isSameOrigin(site.origin, 'hyper://private')) {
      return 'private'
    }
    return undefined
  }

  queueQuery () {
    if (!this.activeQuery) {
      this.activeQuery = this.query()
      this.requestUpdate()
    } else {
      this.activeQuery = this.activeQuery.catch(e => undefined).then(r => {
        this.activeQuery = undefined
        this.queueQuery()
      })
    }
  }

  async query () {
    emit(this, 'load-state-updated')

    var subs = await beaker.index.query({
      path: '/subscriptions/*.goto',
      index: 'local'
    })

    var sites
    var isFiltered = false
    if (this.listing === 'mine') {
      sites = await beaker.drives.list({includeSystem: true})
      sites = sites.filter(s => s.info?.writable)
      sites = sites.map(s => ({
        origin: s.url,
        url: s.url,
        title: s.info?.title || 'Untitled',
        description: s.info?.description,
        writable: s.info?.writable,
        forkOf: s.forkOf
      }))
    } else if (this.listing === 'subscribed') {
      sites = await Promise.all(
        subs
          .filter(sub => isSameOrigin(sub.site.url, this.profileUrl))
          .map(sub => beaker.index.getSite(sub.metadata.href))
      )
    } else if (this.listing === 'subscribers') {
      let subs2 = await beaker.index.query({
        links: this.profileUrl,
        path: '/subscriptions/*.goto',
        index: ['local', 'network']
      })
      sites = await Promise.all(subs2.map(sub => beaker.index.getSite(sub.site.url, {cacheOnly: true})))
    } else if (this.listing === 'network') {
      isFiltered = true
      sites = await beaker.index.listSites({
        search: this.filter,
        index: 'network',
        limit: 15
      })
    } else {
      isFiltered = true
      sites = await beaker.index.listSites({
        search: this.filter,
        index: ['local', 'network']
      })
    }

    if (this.filter && !isFiltered) {
      sites = sites.filter(s => (
        (s.title || '').toLowerCase().includes(this.filter.toLowerCase())
        || (s.description || '').toLowerCase().includes(this.filter.toLowerCase())
      ))
    }
    if (this.singleRow) {
      sites = sites.slice(0, 3)
    } else if (this.limit) {
      sites = sites.slice(0, this.limit)
    }

    if (!isFiltered) {
      sites.sort((a, b) => a.title.localeCompare(b.title))
    }

    for (let sub of subs) {
      try {
        let origin = (new URL(sub.metadata.href)).origin
        let site = sites.find(s => s.origin === origin)
        if (site) {
          site.subscriptions = site.subscriptions || []
          site.subscriptions.push(sub)
        }
      } catch (e) {
        console.debug(e)
        // skip
      }
    }

    // always put the profile and private site on top
    moveToTopIfExists(sites, this.profile?.url)
    moveToTopIfExists(sites, 'hyper://private/')
    this.sites = sites
    console.log(this.sites)
    this.activeQuery = undefined
    emit(this, 'load-state-updated')
  }

  async loadUnkownSites () {
    for (let site of this.sites) {
      if (!site.unknown) continue
      try {
        let info = await beaker.index.getSite(site.origin)
        site.title = info.title
        site.description = info.description
        this.sites = this.sites.slice()
      } catch {
        // not found, ignore
      }
    }
  }

  isSubscribed (site) {
    return site.subscriptions?.find(sub => isSameOrigin(sub.site.url, this.profileUrl))
  }

  // rendering
  // =

  render () {
    if (!this.sites) {
      return html``
    }
    if (!this.sites.length) {
      if (!this.emptyMessage) return html``
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        <div class="sites empty">
          <span>${this.emptyMessage}</div></span>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="container">
        <div class="sites ${this.singleRow ? 'single-row' : 'full'}">
          ${repeat(this.sites, site => site.origin, site => this.renderSite(site))}
        </div>
      </div>
    `
  }

  renderSite (site) {
    var title = site.title || toNiceDomain(site.origin)
    return html`
      <div class="site">
        <div class="thumb">
          <a href=${site.origin} title=${title}><img src="asset:thumb:${site.origin}"></a>
        </div>
        <div class="info">
          <div class="title"><a href=${site.origin} title=${title}>${title}</a></div>
          <div class="description">${shorten(site.description, 200)}</div>
          ${site.forkOf ? html`
            <div class="fork-of">
              <span class="label">${site.forkOf.label}</span>
              Fork of <a href="hyper://${site.forkOf.key}">${toNiceDomain(`hyper://${site.forkOf.key}`)}</a>
            </div>
          ` : ''}
          ${!isSameOrigin(site.origin, 'hyper://private') && (!site.writable || site.subscriptions?.length > 0) ? html`
            <div class="known-subscribers">
              <a
                href="#" 
                class="tooltip-top"
                @click=${e => this.onClickShowSubscribers(e, site.subscriptions)}
                data-tooltip=${
                  ifDefined(site.subscriptions?.length > 0
                    ? shorten(site.subscriptions?.map(r => r.site.title || 'Untitled').join(', ') || '', 100)
                    : undefined)
                }
              >
                <strong>${site.subscriptions?.length || 0}</strong>
                ${pluralize(site.subscriptions?.length || 0, 'known subscriber')}
              </a>
            </div>
          ` : ''}
          <div class="ctrls">
            ${site.writable ? html`
              ${isSameOrigin(site.origin, 'hyper://private') ? html`
                <span class="label">My Private Site</span></div>
              ` : isSameOrigin(site.origin, this.profileUrl) ? html`
                <span class="label">My Profile Site</span></div>
              ` : html`
                <span class="label">My Site</span>
              `}
              <button class="transparent" @click=${e => this.onClickMenu(e, site)}>
                <span class="fas fa-fw fa-ellipsis-h"></span>
              </button>
            ` : html`
              <button @click=${e => this.onToggleSubscribe(e, site)}>
                ${this.isSubscribed(site) ? html`
                  <span class="fas fa-fw fa-check"></span> Subscribed
                ` : html`
                  <span class="fas fa-fw fa-rss"></span> Subscribe
                `}
              </button>
            `}
          </div>
        </div>
      </div>
    `
  }

  // events
  // =

  onClickShowSubscribers (e, subscriptions) {
    e.preventDefault()
    e.stopPropagation()
    SitesListPopup.create('Subscribers', subscriptions.map(s => s.site))
  }

  async onToggleSubscribe (e, site) {
    if (this.isSubscribed(site)) {
      site.subscriptions = site.subscriptions.filter(s => !isSameOrigin(s.site.url, this.profileUrl))
      this.requestUpdate()
      await beaker.subscriptions.remove(site.url)
    } else {
      site.subscriptions = (site.subscriptions || []).concat([{site: this.profile}])
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: site.origin,
        title: site.title,
        site: this.profileUrl
      })
    }
  }

  async onClickMenu (e, site) {
    var items = [
      {
        label: 'Open in a New Tab',
        click: () => window.open(site.url)
      },
      {
        label: 'Copy Site Link',
        click: () => {
          writeToClipboard(site.url)
          toast.create('Copied to clipboard')
        }
      },
      {type: 'separator'},
      {
        label: 'Explore Files',
        click: () => window.open(EXPLORER_URL(site))
      },
      {
        label: 'Fork this Site',
        click: () => this.onForkSite(site)
      },
      {type: 'separator'},
      {
        label: 'Edit Properties',
        click: () => this.onEditProps(site)
      },
      {
        label: site.writable ? 'Remove from My Library' : 'Stop hosting',
        disabled: !!this.getSiteIdent(site),
        click: () => this.onRemoveSite(site)
      }
    ]
    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }

    var choice = await beaker.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
  }

  async onForkSite (site) {
    site = await beaker.hyperdrive.forkDrive(site.url)
    toast.create('Site created')
    window.open(site.url)
    this.load()
  }

  async onEditProps (site) {
    await beaker.shell.drivePropertiesDialog(site.url)
    this.load()
  }

  async onRemoveSite (site) {
    await beaker.drives.remove(site.url)
    const undo = async () => {
      await beaker.drives.configure(site.url)
      this.load()
      this.requestUpdate()
    }
    toast.create('Site removed', '', 10e3, {label: 'Undo', click: undo})
    this.load()
  }
}

customElements.define('beaker-sites-list', SitesList)

function moveToTopIfExists (arr, url) {
  var i = arr.findIndex(v => v.url === url)
  if (i !== -1) {
    let item = arr[i]
    arr.splice(i, 1)
    arr.unshift(item)
  }
}