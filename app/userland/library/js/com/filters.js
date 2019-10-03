import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import filtersCSS from '../../css/com/filters.css.js'
import '../current-filter.js'

class LibraryFilters extends LitElement {
  static get properties () {
    return {
      query: {type: String},
      writable: {type: String}
    }
  }

  static get styles () {
    return filtersCSS
  }

  constructor () {
    super()
    this.query = ''
    this.writable = ''
  }

  // rendering
  // =

  render () {
    return html`
      <div class="filters">
        ${this.query ? html`<start-current-filter label="${'"' + this.query + '"'}" @click=${this.onClickQueryFilter}></start-current-filter>` : ''}
        ${this.writable ? html`<start-current-filter label="${this.writable}" @click=${this.onClickWritableFilter}></start-current-filter>` : ''}
      </div>
    `
  }

  // events
  // =

  onClickQueryFilter (e) {
    emit(this, 'clear-query', {bubbles: true})
  }

  onClickWritableFilter (e) {
    emit(this, 'clear-writable', {bubbles: true})
  }
}
customElements.define('library-filters', LibraryFilters)