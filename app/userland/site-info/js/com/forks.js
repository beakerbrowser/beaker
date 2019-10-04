import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import sidebarForksCSS from '../../css/com/forks.css.js'

class SiteInfoForks extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      forkOf: {type: String},
      forks: {type: Array}
    }
  }

  static get styles () {
    return [sidebarForksCSS]
  }

  constructor () {
    super()
    this.origin = ''
    this.forkOf = ''
    this.forks = []
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="list">
        ${this.forkOf ? html`
          <div class="fork-of">
            This site is a fork of <a href="${this.forkOf}">${toNiceUrl(this.forkOf)}</a>
            <button @click=${e => this.onClickCompare(e, {url: this.forkOf})} style="margin-left: 5px">Compare</button>
          </div>
        ` : ''}
        ${repeat(this.forks, site => html`
          <div class="fork">
            <button @click=${e => this.onClickCompare(e, site)}>Compare</button>
            <div>
              <span class="fas fa-fw fa-user-circle"></span> <a href=${site.key}>Anonymous / ${site.meta.title}</a>
            </div>
          </div>
        `)}
      </div>
    `
  }

  // events
  // =

  onClickCompare (e, site) {
    e.preventDefault()
    e.stopPropagation()
    beaker.browser.openUrl(`beaker://compare/?base=${site.key}&target=${this.origin}`, {setActive: true})
    beaker.browser.toggleSiteInfo(false)
  }
}

customElements.define('site-info-forks', SiteInfoForks)
