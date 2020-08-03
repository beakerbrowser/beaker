import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import css from '../../css/com/res-summary.css.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import 'beaker://app-stdlib/js/com/img-fallbacks.js'

export class ResSummary extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      siteInfo: {type: Object},
      fileInfo: {type: Object}
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
    this.fileInfo = undefined
  }

  get origin () {
    try {
      return (new URL(this.url)).origin
    } catch (e) {
      return this.url
    }
  }

  get pathname () {
    try {
      return (new URL(this.url)).pathname
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
    const st = this.fileInfo
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="site-info">
        <span class="fas fa-fw fa-sitemap"></span>
        <div class="info">
          <h1>
            <a href=${this.origin}>${this.siteInfo.title || this.origin}</a>
          </h1>
        </div>
        <div class="ctrls">
          ${this.renderFollowBtn()}
        </div>
      </div>
      ${st ? html`
        ${''/*TODO<div class="group">
          <div class="group-title">Summary</div>
          <div class="group-content">
            <a href="#" class="provenance tooltip-left" data-tooltip="According to Andrew Osheroff"><span class="fas fa-info-circle"></span></a>
            <div class="value">A bunch of self-indulgent nonsense</div>
          </div>
          <div class="group-content">
            <a href="#" class="provenance tooltip-left" data-tooltip="According to Paul Frazee"><span class="fas fa-info-circle"></span></a>
            <div class="value">A brilliant overview of the zeitgeist of technology and politics</div>
          </div>
        </div>*/}
      ` : ''}
    `
  }

  renderFollowBtn () {
    if (this.siteInfo.url.startsWith('hyper://')) {
      const mine = this.siteInfo.writable
      return html`
        <div class="btn-group">
          <button ?disabled=${mine} data-tooltip=${mine ? 'This is my site' : 'Follow this site'}>
            <span class="fas fa-fw fa-rss"></span> Follow
          </button>
          <button>3</button>
        </div>
      `
    }
  }

  // events
  // =
}

customElements.define('res-summary', ResSummary)
