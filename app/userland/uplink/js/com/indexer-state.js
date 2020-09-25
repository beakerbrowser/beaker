import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { pluralize } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/com/indexer-state.css.js'

class IndexerState extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
    this.state = {}
    this.load()
  }

  async load () {
    this.state = await beaker.index.getState()
    var events = beaker.index.events()
    events.addEventListener('site-state-change', siteState => {
      this.state.sites[siteState.url] = siteState
      this.requestUpdate()
    })
    this.requestUpdate()
  }

  render () {
    var sitesGettingIndexed = Object.values(this.state.sites || {}).filter(s => typeof s.progress !== 'undefined')
    if (!sitesGettingIndexed?.length) return html``
    var numSites = sitesGettingIndexed.length
    var progress = Math.round(sitesGettingIndexed.reduce((acc, s) => s.progress + acc, 0) / numSites)
    return html`
      <div>
        <span class="spinner"></span>
        ${numSites} ${pluralize(numSites, 'site')} syncing
        <progress value=${progress} max="100"></progress>
      </div>
    `
  }
}

customElements.define('beaker-indexer-state', IndexerState)