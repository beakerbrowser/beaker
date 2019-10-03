import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { emit } from '../../app-stdlib/js/dom.js'
import currentFilterCSS from '../css/current-filter.css.js'

class CurrentFilter extends LitElement {
  static get properties () {
    return {
      label: {type: 'String'}
    }
  }

  constructor () {
    super()
    this.label = ''
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <span @click=${this.onClick}>
        ${this.label}
        <span class="fas fa-times"></span>
      </span>
    `
  }

  // events
  // =

  onClick (e) {
    e.preventDefault()
    emit(this, 'click', {bubbles: true})
  }
}
CurrentFilter.styles = currentFilterCSS
customElements.define('start-current-filter', CurrentFilter)