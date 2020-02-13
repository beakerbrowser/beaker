import {LitElement, html} from '../../vendor/lit-element/lit-element.js'
import {repeat} from '../../vendor/lit-element/lit-html/directives/repeat.js'
import {classMap} from '../../vendor/lit-element/lit-html/directives/class-map.js'
import * as QP from '../lib/query-params.js'
import searchInputCSS from '../../css/com/search-input.css.js'

export class SearchInput extends LitElement {
  static get properties () {
    return {
      placeholder: {type: String},
      query: {type: String},
    }
  }

  static get styles () {
    return searchInputCSS
  }

  constructor () {
    super()
    this.placeholder = ''
    this.query = QP.getParam('q', undefined)
  }

  get value () {
    return this.query
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="search-container">
        <i class="fas fa-search"></i>
        <input
          type="text"
          class="search"
          placeholder="${this.placeholder}"
          value="${this.query}"
          @keyup=${this.onKeyupInput}
        >
      </div>
    `
  }

  // events
  // =

  onKeyupInput (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()

      window.location = `/search?q=${encodeURIComponent(this.query)}`
      return
    }
    this.query = e.target.value
  }
}

customElements.define('beaker-search-input', SearchInput)