import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import subviewTabsCSS from '../../css/com/subview-tabs.css.js'

class SubviewTabs extends LitElement {
  static get properties () {
    return {
      current: {type: String},
      items: {type: Array}
    }
  }

  static get styles () {
    return subviewTabsCSS
  }

  constructor () {
    super()
    this.current = ''
    this.items = []
  }

  // rendering
  // =

  render () {
    const item = (id, icon, label) => {
      const cls = classMap({
        item: true,
        current: id === this.currentView
      })
      return html`
        <a class=${cls} @click=${e => this.onClick(e, id)}>
          <span class="fa-fw ${icon || 'no-icon'}"></span>
          <span class="label">${label}</span>
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.items.map(({id, label}) => html`
        <a class=${classMap({item: true, current: id === this.current})} @click=${e => this.onClick(e, id)}>
          ${label}
        </a>
      `)}
    `
  }

  // events
  // =

  onClick (e, id) {
    e.preventDefault()
    emit(this, 'change', {bubbles: true, detail: {id}})
  }
}
customElements.define('subview-tabs', SubviewTabs)