import { LitElement, html } from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../../../app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import datResultCSS from '../../../css/com/search/dat-result.css.js'
import { highlightSearchResult } from '../../../../app-stdlib/js/strings.js'

class SearchDatResult extends LitElement {
  static get properties () {
    return {
      userUrl: {type: String},
      item: {type: Object},
      highlightNonce: {type: String}
    }
  }

  static get styles () {
    return datResultCSS
  }

  constructor () {
    super()
    this.userUrl = undefined
    this.item = undefined
    this.highlightNonce = undefined
  }

  get isUsersPublic () {
    return this.item && this.item.author.url === this.userUrl
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <a href=${this.item.href}><img src="asset:thumb:${this.item.href}"></a>
      <div class="details">
        <div class="title"><a href=${this.item.href}>${unsafeHTML(highlightSearchResult(this.item.record.title, this.highlightNonce))}</a></div>
        <div class="description">${unsafeHTML(highlightSearchResult(this.item.record.description, this.highlightNonce))}</div>
        <div class="author"><span class="far fa-fw fa-folder"></span> Dat by ${this.renderAuthorLink()}</div>
      </div>
    `
  }

  renderAuthorLink () {
    if (this.isUsersPublic) return html`me [ public ]`
    return html`<a href=${this.item.author.url}>${this.item.author.title || 'Anonymous'}</a>`
  }

  // events
  // =

}
customElements.define('search-dat-result', SearchDatResult)