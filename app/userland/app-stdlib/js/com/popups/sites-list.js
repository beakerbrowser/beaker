/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import { BasePopup } from './base.js'
import buttonsCSS from '../../../css/buttons2.css.js'
import spinnerCSS from '../../../css/com/spinner.css.js'
import popupsCSS from '../../../css/com/popups.css.js'
import { toNiceUrl } from '../../strings.js'

// exported api
// =

export class SitesListPopup extends BasePopup {
  static get properties () {
    return {isLoading: {type: Boolean}}
  }

  static get styles () {
    return [buttonsCSS, spinnerCSS, popupsCSS, css`
      .loading {
        padding: 10px 10px 0;
      }
      .sites {
        margin: -5px 0 0 !important;
      }
      .site {
        display: flex;
        align-items: center;
        padding: 8px 4px;
        font-size: 14px;
      }
      .site:hover {
        background: var(--bg-color--light);
      }
      .site .thumb {
        display: block;
        width: 24px;
        height: 24px;
        object-fit: cover;
        border-radius: 50%;
        margin-right: 10px;
      }
      .site .title {
        font-weight: 500;
      }
      .site .url {
        color: var(--text-color--light);
      }
    `]
  }

  constructor ({title, sites}) {
    super()
    this.title = title
    if (sites instanceof Promise) {
      this.isLoading = true
      this.sites = undefined
      sites.then(s => {
        this.isLoading = false
        this.sites = s
      })
    } else {
      this.isLoading = false
      this.sites = sites
    }
  }

  // management
  //

  static async create (title, sites) {
    return BasePopup.create(SitesListPopup, {title, sites})
  }

  static destroy () {
    return BasePopup.destroy('sites-list-popup')
  }

  // rendering
  // =

  renderTitle () {
    return this.title || 'Sites'
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href=${(new URL('../../../css/fontawesome.css', import.meta.url)).toString()}>
      <div class="sites">
        ${this.isLoading ? html`
          <div class="loading"><span class="spinner"></span></div>
        ` : html`
          ${repeat(this.sites, site => this.renderSite(site))}
        `}
      </div>
    `
  }

  renderSite (site) {
    const title = site.title || 'Untitled'
    return html`
      <a href=${site.url} class="site" title=${title} target="_blank">
        <img class="thumb" src="${site.url}/thumb"/>
        <span class="details">
          <span class="title">${title}</span>
        </span>
      </a>
    `
  }
}
customElements.define('sites-list-popup', SitesListPopup)
