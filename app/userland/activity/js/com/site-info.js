import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import css from '../../css/com/site-info.css.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

export class SiteInfo extends LitElement {
  static get properties () {
    return {
      compact: {type: Boolean},
      url: {type: String},
      siteInfo: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.compact = false
    this.url = undefined
    this.siteInfo = undefined
  }

  get origin () {
    try {
      return (new URL(this.url)).origin
    } catch (e) {
      return this.url
    }
  }

  // rendering
  // =

  render () {
    if (!this.siteInfo) {
      return html``
    }
    if (!this.compact) {
      return this.renderFull()
    }
    return this.renderCompact()
  }

  renderCompact () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="compact">
        <div class="info">
          <h1><a href=${this.origin}>${this.siteInfo.title || this.origin}</a></h1>
          <div class="known-followers">3 known followers</div>
        </div>
        <div class="ctrls">
          ${this.renderFollowBtn()}
        </div>
      </div>
    `
  }

  renderFull () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="full">
        <beaker-img-fallbacks>
          <img class="thumb" src="${joinPath(this.siteInfo.url, 'thumb')}" slot="img1">
          <img class="thumb" src="asset:favicon-100:${this.url}" slot="img2">
        </beaker-img-fallbacks>
        <div class="info">
          <h1>${this.siteInfo.title || this.origin}</h1>
          ${this.siteInfo.description ? html`<div>${this.siteInfo.description}</div>` : ''}
          <div class="ctrls">
            ${this.renderFollowBtn()}
          </div>
        </div>
      </div>
    `
  }

  renderFollowBtn () {
    if (this.siteInfo.writable) {
      return html`<span class="my-site"><span class="fas fa-fw fa-pencil-alt"></span> My Site</span>`
    }
    if (this.siteInfo.url.startsWith('hyper://')) {
      return html`
        <button><span class="fas fa-fw fa-rss"></span> Follow</button>
      `
    }
  }

  // events
  // =
}

customElements.define('site-info', SiteInfo)
