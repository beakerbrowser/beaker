import { LitElement, html } from '../../../../app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../../../app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import bookmarkResultCSS from '../../../css/com/search/bookmark-result.css.js'
import { highlightSearchResult } from '../../../../app-stdlib/js/strings.js'

class SearchBookmarkResult extends LitElement {
  static get properties () {
    return {
      fsUrl: {type: String},
      userUrl: {type: String},
      item: {type: Object},
      highlightNonce: {type: String}
    }
  }

  static get styles () {
    return bookmarkResultCSS
  }

  constructor () {
    super()
    this.fsUrl = undefined
    this.userUrl = undefined
    this.item = undefined
    this.highlightNonce = undefined
  }

  get isUsersPrivate () {
    return this.item && this.item.author.url === this.fsUrl
  }

  get isUsersPublic () {
    return this.item && this.item.author.url === this.userUrl
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="title"><a href=${this.item.href}>${unsafeHTML(highlightSearchResult(this.item.record.title, this.highlightNonce))}</a></div>
      <div class="description">${unsafeHTML(highlightSearchResult(this.item.record.description, this.highlightNonce))}</div>
      <div class="author"><span class="far fa-fw fa-star"></span> Bookmarked by ${this.renderAuthorLink()}</div>
    `
  }

  renderAuthorLink () {
    if (this.isUsersPrivate) return html`me [ private ]`
    if (this.isUsersPublic) return html`me [ public ]`
    return html`<a href=${this.item.author.url}>${this.item.author.title || 'Anonymous'}</a>`
  }

  // events
  // =
}
customElements.define('search-bookmark-result', SearchBookmarkResult)