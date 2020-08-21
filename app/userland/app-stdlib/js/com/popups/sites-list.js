/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import { BasePopup } from './base.js'
import buttonsCSS from '../../../css/buttons2.css.js'
import popupsCSS from '../../../css/com/popups.css.js'
import { toNiceUrl } from '../../strings.js'

// exported api
// =

export class SitesListPopup extends BasePopup {
  static get styles () {
    return [buttonsCSS, popupsCSS, css`
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
    this.sites = sites
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
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="sites">
        ${repeat(this.sites, site => this.renderSite(site))}
      </div>
    `
  }

  renderSite (site) {
    const title = site.title || 'Untitled'
    return html`
      <a href=${site.url} class="site" title=${title} target="_blank">
        <img class="thumb" src="asset:thumb:${site.url}"/>
        <span class="details">
          <span class="title">${title}</span>
          <span class="url">${toNiceUrl(site.url)}</span>
        </span>
      </a>
    `
  }
}
customElements.define('sites-list-popup', SitesListPopup)
