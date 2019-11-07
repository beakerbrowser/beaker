import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { until } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/until.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/com/viewfile-query.css.js'
import './file-grid.js'

export class ViewfileQuery extends LitElement {
  static get properties () {
    return {
      driveUrl: {type: String, attribute: 'drive-url'},
      pathname: {type: String},
      info: {type: Object},
      selection: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  get url () {
    return joinPath(this.driveUrl, this.pathname)
  }

  constructor () {
    super()
    this.driveUrl = undefined
    this.pathname = undefined
    this.info = undefined
    this.items = undefined
    this.selection = undefined
  }

  async load () {
    if (!this.items) {
    }
    return this.renderItems()
  }

  // rendering
  // =

  render () {
    if (this.items) {
      return this.renderItems()
    }
    return html`${until(this.load(), 'Loading...')}`
  }

  renderItems () {
    return html`
      <inline-file-list
        .items=${this.items}
        .selection=${this.selection}
        show-origin
      ></inline-file-list>
    `
  }

  // events
  // =
}

customElements.define('viewfile-query', ViewfileQuery)
