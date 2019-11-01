import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { emit } from '../dom.js'
import hoverMenuCSS from '../../css/com/hover-menu.css.js'

class HoverMenu extends LitElement {
  static get properties () {
    return {
      icon: {type: 'String'},
      current: {type: 'String'},
      options: {type: 'Object'},
      isOpen: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.icon = ''
    this.current = ''
    this.options = {}
    this.isOpen = false
  }

  // rendering
  // =

  render () {
    var items = Array.isArray(this.options) ? this.options : Object.entries(this.options).map(([id, label]) => ({id, label}))

    const item = ({id, label, divider, disabled}) => {
      if (divider) return html`<hr>`
      if (disabled) return html`<a class="item disabled">${label}</a>`
      return html`
        <a class="item" @click=${e => this.onClick(e, id)}>
          ${label}
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="dropdown" @mouseover=${this.onMouseOver} @mouseleave=${this.onMouseLeave}>
        <div class="dropdown-box">
          <span class="fa-fw ${this.icon}"></span>
          <span class="menu-label">${unsafeHTML(this.current)}</span>
          <span class="fas fa-caret-down"></span>
        </div>
        ${this.isOpen
          ? html`
            <div class="dropdown-menu">
              ${repeat(items, item)}
            </div>
          ` : ''}
      </div>
    `
  }

  // events
  // =

  onClick (e, id) {
    e.preventDefault()
    emit(this, 'change', {bubbles: true, detail: {id}})
  }

  onMouseOver (e) {
    this.isOpen = true
  }

  onMouseLeave (e) {
    this.isOpen = false
  }
}
HoverMenu.styles = hoverMenuCSS
customElements.define('hover-menu', HoverMenu)