import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { toNiceDriveType } from '../lib/strings.js'
import '../com/search/results.js'
import '../com/post-buttons.js'
import '../com/topics.js'

export class SearchView extends LitElement {
  static get properties () {
    return {
      user: {type: Object}
    }
  }
 
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()
    this.user = undefined
    var qp = new URLSearchParams(location.search)
    this.driveType = qp.get('drive-type') || undefined
    this.query = qp.get('query') || undefined
  }

  async load () {
    await this.requestUpdate()
  }

  render () {
    if (!this.user) return html``
    return html`
      <div class="layout right-col">
        <main>
          <h3 style="margin: 0 6px 10px; color: #556">
            <span class="fas fa-fw fa-search"></span>
            ${this.query ? 'Searching for' : 'Listing all'} ${toNiceDriveType(this.driveType) || 'post'}s ${this.query ? `matching "${this.query}"` : ''}
          </h3>
          <beaker-search-results loadable .user=${this.user} drive-type=${this.driveType || ''} query=${this.query || ''}></beaker-search-results>
        </main>
        <nav>
          <beaker-post-buttons></beaker-post-buttons>
          <beaker-topics loadable></beaker-topics>
        </nav>
      </div>
    `
  }

  // events
  // =

}

customElements.define('beaker-search-view', SearchView)
