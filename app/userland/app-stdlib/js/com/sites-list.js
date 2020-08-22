import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { ifDefined } from '../../vendor/lit-element/lit-html/directives/if-defined.js'
import { SitesListPopup } from './popups/sites-list.js'
import css from '../../css/com/sites-list.css.js'
import { emit } from '../dom.js'
import { shorten, pluralize } from '../strings.js'

export class SitesList extends LitElement {
  static get properties () {
    return {
      listing: {type: String},
      singleRow: {type: Boolean, attribute: 'single-row'},
      filter: {type: String},
      profile: {type: Object},
      sites: {type: Array}
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
    this.profile = undefined
    this.sites = undefined

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
    var [sites, subs] = await Promise.all([
      beaker.database.listSites({
        filter: {
          search: this.filter,
          writable: this.listing === 'mine'
        },
        limit: this.singleRow ? 8 : 1e9
      }),
      beaker.database.listRecords({
        filter: {index: 'beaker/index/subscriptions'},
        limit: 1e9
      })
    ])

    var unknownSites = []
    for (let sub of subs) {
      try {
        let origin = (new URL(sub.metadata.href)).origin
        let site = sites.find(s => s.origin === origin)
        if (site) {
          site.subscriptions = site.subscriptions || []
          site.subscriptions.push(sub)
        } else {
          if (isSameOrigin(origin, this.profileUrl)) continue
          let unknownSite = unknownSites.find(s => s.origin === origin)
          if (!unknownSite) {
            unknownSite = {origin, title: 'Loading...', description: '', writable: false, subscriptions: [], unknown: true}
            unknownSites.push(unknownSite)
          }
          unknownSite.subscriptions.push(sub)
        }
      } catch (e) {
        console.debug(e)
        // skip
      }
    }

    if (this.listing === 'subscribed') {
      this.sites = sites
        .filter(site => this.isSubscribed(site))
        .sort((a, b) => a.title.localeCompare(b.title))
    } else if (this.listing === 'suggested') {
      this.sites = sites
        .concat(unknownSites) // include unknown sites
        .filter(site => !this.isSubscribed(site))
        .sort((a, b) => (b.subscriptions?.length || 0) - (a.subscriptions?.length || 0))
      /* dont await */this.loadUnkownSites() // try to get their meta in the background
    } else {
      this.sites = sites.sort((a, b) => a.title.localeCompare(b.title))
    }
    console.log(this.sites)
    this.activeQuery = undefined
    emit(this, 'load-state-updated')
  }

  async loadUnkownSites () {
    for (let site of this.sites) {
      if (!site.unknown) continue
      try {
        let info = await beaker.database.getSite(site.origin)
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
      return html``
    }
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.renderHeader()}
      <div class="container">
        <div class="sites ${this.singleRow ? 'single-row' : 'grid'}">
          ${repeat(this.sites, site => site.origin, site => this.renderSite(site))}
        </div>
        ${this.singleRow && this.sites.length >= 3 ? html`
          <div class="show-more" @click=${e => { this.singleRow = false }}>
            <span class="fas fa-chevron-circle-down"></span>
            <span>Show more</span>
          </div>
        ` : ''}
      </div>
    `
  }

  renderHeader () {
    if (this.listing === 'mine') {
      return html`<h2><span>My Sites</span></h2>`
    }
    if (this.listing === 'subscribed') {
      return html`<h2><span>Subscribed Sites</span></h2>`
    }
    if (this.listing === 'suggested') {
      return html`<h2><span>Suggested Sites</span></h2>`
    }
  }

  renderSite (site) {
    return html`
      <div class="site">
        <div class="thumb">
          <a href=${site.origin} title=${site.title}><img src="asset:thumb:${site.origin}"></a>
          ${isSameOrigin(site.origin, this.profileUrl) ? html`
            <span class="writable">
              My Profile
            </span>
          ` : site.writable ? html`
            <span class="writable">
              Mine
            </span>
          ` : html`
            <button class="transparent" @click=${e => this.onToggleSubscribe(e, site)}>
              ${this.isSubscribed(site) ? html`
                <span class="fas fa-fw fa-check"></span> Subscribed
              ` : html`
                <span class="fas fa-fw fa-rss"></span> Subscribe
              `}
            </button>
          `}
        </div>
        <div class="info">
          <div class="title"><a href=${site.origin} title=${site.title}>${site.title}</a></div>
          <div class="description">${shorten(site.description, 200)}</div>
          ${!isSameOrigin(site.origin, 'hyper://private') ? html`
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
                ${pluralize(site.subscriptions?.length || 0, 'subscriber')} you know
              </a>
            </div>
          ` : ''}
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
      site.subscriptions = site.subscriptions.concat([{site: this.profile}])
      this.requestUpdate()
      await beaker.subscriptions.add({
        href: site.origin,
        title: site.title,
        site: this.profileUrl
      })
    }
  }
}

customElements.define('beaker-sites-list', SitesList)

function isSameOrigin (a, b) {
	return getOrigin(a) === getOrigin(b)
}

function getOrigin (str) {
	let i = str.indexOf('://')
	let j = str.indexOf('/', i + 3)
	return str.slice(0, j === -1 ? undefined : j)
}