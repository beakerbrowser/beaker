import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/views/history.css.js'

export class HistoryView extends LitElement {
  static get properties () {
    return {
      links: {type: Array},
      filter: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.links = undefined
    this.filter = undefined
    this.load()
  }
  
  updated (changedProperties) {
    if (changedProperties.has('filter') && changedProperties.get('filter') != this.filter) {
      this.queueLoad()
    }
  }

  queueLoad () {
    if (this.loadTO) {
      clearTimeout(this.loadTO)
    }
    this.loadTO = setTimeout(() => {
      this.load()
      this.loadTO = undefined
    }, 200)
  }

  async load () {
    var links = await beaker.history.getVisitHistory({search: this.filter, limit: 300})
    this.links = links
  }

  // rendering
  // =

  render () {
    var links = this.links
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${links ? html`
        <div class="links">
          ${repeat(links, link => this.renderLink(link))}
          ${links.length === 0 && !this.filter ? html`
            <div class="empty"><span class="fas fa-rss"></span><div>No sites have been visited recently.</div></div>
          ` : ''}
          ${links.length === 0 && this.filter ? html`
            <div class="empty"><div>No matches found for "${this.filter}".</div></div>
          ` : ''}
        </div>
      ` : html`
        <div class="loading"><span class="spinner"></span></div>
      `}
    `
  }

  renderLink (link) {
    return html`
      <a class="link" href=${link.url}>
        <img src="asset:favicon:${link.url}">
        <span class="title">${link.title}</span>
        <span class="url">${link.url}</span>
      </a>
    `
  }

  // events
  // =


}

customElements.define('history-view', HistoryView)
