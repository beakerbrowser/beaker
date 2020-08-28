import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { toNiceUrl } from '../../../app-stdlib/js/strings.js'
import viewCSS from '../../css/views/indexer.css.js'

const events = beaker.index.events()

class IndexerView extends LitElement {
  static get properties () {
    return {
    }
  }

  static get styles () {
    return viewCSS
  }

  constructor () {
    super()
    this.state = {}
  }

  async load () {
    this.state = await beaker.index.getState()
    console.log(this.state)
    events.addEventListener('status-change', ({task, nextRun}) => {
      this.state.status = {task, nextRun}
      this.requestUpdate()
    })
    events.addEventListener('site-state-change', siteState => {
      this.state.sites[siteState.url] = siteState
      this.requestUpdate()
    })
    events.addEventListener('targets-change', ({targets}) => {
      this.state.targets = targets
      this.requestUpdate()
    })
    events.addEventListener('queue-change', ({queue}) => {
      this.state.queue = queue
      this.requestUpdate()
    })
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="status">
        <h2>
          Status: ${this.state?.status?.task}
          <small>
            ${this.state?.status?.task === 'waiting' ? html`
              Next crawl at ${(new Date(this.state.status.nextRun)).toLocaleTimeString()}
            ` : html`<span class="spinner"></span>
            `}
          </small>
        </h2>
      </div>
      <section class="twocol">
        <div>
          <h3>Currently Indexing</h3>
          <div class="sites-list fixed-height">
            ${this.state?.targets?.map(origin => html`
              <div><a class="url" href=${origin}>${toNiceUrl(origin)}</a></div>
            `)}
          </div>
        </div>
        <div>
          <h3>Queue</h3>
          <div class="sites-list fixed-height">
            ${this.state?.queue?.map(origin => html`
              <div><a class="url" href=${origin}>${toNiceUrl(origin)}</a></div>
            `)}
          </div>
        </div>
      </section>
      <section>
        <h3>Site States</h3>
        <div class="sites-list">
          ${Object.values(this.state?.sites || {}).map(site => html`
            <div>
              <a class="url" href=${site.url}>${toNiceUrl(site.url)}</a>
              <span class="version">v${site.last_indexed_version}</span>
              <span class="last-index">Last index: ${(new Date(site.last_indexed_ts)).toLocaleString()}</span>
              <span class="errors">${site.error ? site.error : 'No errors'}</span>
            </div>
          `)}
        </div>
      </section>
    `
  }
}
customElements.define('indexer-view', IndexerView)