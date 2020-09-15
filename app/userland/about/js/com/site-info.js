import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import css from '../../css/com/site-info.css.js'
import { toNiceUrl, pluralize, shorten } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { SitesListPopup } from 'beaker://app-stdlib/js/com/popups/sites-list.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

export class SiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteInfo: {type: Object},
      subscribers: {type: Array},
      isSubscribedToUser: {type: Boolean, attribute: 'is-subscribed-to-user'},
      profileUrl: {type: String, attribute: 'profile-url'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.url = undefined
    this.siteInfo = undefined
    this.subscribers = undefined
    this.isSubscribedToUser = false
    this.profileUrl = ''
  }

  get origin () {
    try {
      return (new URL(this.url)).origin
    } catch (e) {
      return this.url
    }
  }

  get isPrivate () {
    return this.url.startsWith('hyper://private')
  }

  get isSubscribed () {
    return this.subscribers.find(s => s.site.url === this.profileUrl)
  }

  // rendering
  // =

  render () {
    if (!this.siteInfo) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="full">
          <div class="info">
            <div class="title"><span class="spinner"></span> Loading...</div>
          </div>
        </div>
      `
    }
    const showSubs = !(this.isPrivate || this.siteInfo.writable && !this.subscribers?.length)
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="full">
        <a href=${this.siteInfo.url}>
          <beaker-img-fallbacks>
            <img class="thumb" src="asset:thumb:${this.siteInfo.url}" slot="img1">
            <img class="thumb" src="asset:favicon-100:${this.url}" slot="img2">
          </beaker-img-fallbacks>
        </a>
        <div class="info">
          <div class="title"><a href=${this.siteInfo.url}>${this.siteInfo.title || toNiceUrl(this.origin)}</a></div>
          ${this.siteInfo.description ? html`<div class="description">${this.siteInfo.description}</div>` : ''}
          ${showSubs ? html`
            <div class="known-subscribers">
              <a
                href="#" 
                @click=${this.onClickShowSites}
                data-tooltip=${shorten(this.subscribers?.map(r => r.site.title || 'Untitled').join(', ') || '', 100)}
              >
                <strong>${this.subscribers?.length}</strong>
                ${pluralize(this.subscribers?.length || 0, 'subscriber')}
              </a>
              ${this.isSubscribedToUser ? html`
                <span class="label">Subscribed to you</span>
              ` : ''}
            </div>
          ` : ''}
        </div>
        <div class="ctrls">
          ${this.renderSubscribeButton()}
        </div>
      </div>
    `
  }

  renderSubscribeButton () {
    if (this.isPrivate) {
      return ''
    }
    if (this.siteInfo.writable) {
      return html`
        <button @click=${this.onEditProperties}>Edit Profile</button>
      `
    }
    if (this.siteInfo.url.startsWith('hyper://')) {
      return html`
        <button class="subscribe" @click=${this.onToggleSubscribe}>
          ${this.isSubscribed ? html`
            <span class="fas fa-fw fa-check"></span> Subscribed
          ` : html`
            Subscribe
          `}
        </button>
      `
    }
  }

  // events
  // =

  onClickShowSites (e) {
    e.preventDefault()
    e.stopPropagation()
    SitesListPopup.create('Subscribers', this.subscribers.map(s => s.site))
  }

  onToggleSubscribe (e) {
    emit(this, 'toggle-subscribe')
  }

  onEditProperties (e) {
    emit(this, 'edit-properties')
  }
}

customElements.define('site-info', SiteInfo)
