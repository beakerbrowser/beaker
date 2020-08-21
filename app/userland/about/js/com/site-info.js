import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import css from '../../css/com/site-info.css.js'
import { joinPath, pluralize, shorten } from 'beaker://app-stdlib/js/strings.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { SitesListPopup } from 'beaker://app-stdlib/js/com/popups/sites-list.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

export class SiteInfo extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteInfo: {type: Object},
      subscribers: {type: Array},
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
    this.profileUrl = ''
  }

  get origin () {
    try {
      return (new URL(this.url)).origin
    } catch (e) {
      return this.url
    }
  }

  get isSubscribed () {
    return this.subscribers.find(s => s.site.url === this.profileUrl)
  }

  // rendering
  // =

  render () {
    if (!this.siteInfo) {
      return html``
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="full">
        <a href=${this.siteInfo.url}>
          <beaker-img-fallbacks>
            <img class="thumb" src="${joinPath(this.siteInfo.url, 'thumb')}" slot="img1">
            <img class="thumb" src="asset:favicon-100:${this.url}" slot="img2">
          </beaker-img-fallbacks>
        </a>
        <div class="info">
          <div class="title"><a href=${this.siteInfo.url}>${this.siteInfo.title || this.origin}</a></div>
          ${this.siteInfo.description ? html`<div class="description">${this.siteInfo.description}</div>` : ''}
          <div class="known-subscribers">
            <a
              href="#" 
              @click=${this.onClickShowSites}
              data-tooltip=${shorten(this.subscribers?.map(r => r.site.title || 'Untitled').join(', ') || '', 100)}
            >
              <strong>${this.subscribers?.length}</strong>
              ${pluralize(this.subscribers?.length || 0, 'subscriber')} you know
            </a>
          </div>
        </div>
        <div class="ctrls">
          ${this.renderSubscribeButton()}
        </div>
      </div>
    `
  }

  renderSubscribeButton () {
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
