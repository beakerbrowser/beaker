import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import sideFiltersCSS from '../../css/com/side-filters.css.js'
import { emit } from '../../../app-stdlib/js/dom.js'

class LibrarySideFilters extends LitElement {
  static get properties () {
    return {
      current: {type: String}
    }
  }

  static get styles () {
    return sideFiltersCSS
  }

  constructor () {
    super()
    this.current = false
  }

  // rendering
  // =

  render () {
    const item = (value, label) => {
      const cls = classMap({
        item: true,
        current: value === this.current
      })
      return html`
        <div>
          <a class=${cls} title=${label} @click=${e => this.onClick(e, value)}>${label}</a>
        </div>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="heading">Filter by:</div>
      <div class="tags">
        ${item('writable', 'Writable')}
        ${item('readonly', 'Read-only')}
      </div>
    `
  }

  // events
  // =

  onClick (e, writable) {
    e.preventDefault()
    emit(this, 'change', {bubbles: true, detail: {writable}})
  }
}
customElements.define('library-side-filters', LibrarySideFilters)