import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { emit } from '../dom.js'
import hoverMenuCSS from '../../css/com/hover-menu.css.js'

// NOTE
// We use the globalOpenCounter to let multiple side-by-side hover-menus share "open" state
// This is to create a menubar behavior.
//
// Each time a hover-menu is opened, the counter increments
// 500ms after a hover-menu closes, the counter decrements
// If the counter > 0 on hover, we open the menu
// (only relevant when require-click attr is set)
// -prf
var globalOpenCounter = 0

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

    const item = ({id, label, divider, disabled, heading}) => {
      if (heading) return html`<div class="heading">${heading}</div>`
      if (divider) return html`<hr>`
      if (disabled) return html`<a class="item disabled">${label}</a>`
      return html`
        <a class="item" @click=${e => this.onClickItem(e, id)}>
          ${label}
        </a>
      `
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="dropdown" @click=${this.onClick} @mouseover=${this.onMouseOver} @mouseleave=${this.onMouseLeave}>
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

  onClickItem (e, id) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'change', {bubbles: true, detail: {id}})
  }

  onMouseOver (e) {
    if (!this.hasAttribute('require-click')) {
      this.isOpen = true
      globalOpenCounter++
    } else if (!this.isOpen && globalOpenCounter > 0) {
      this.isOpen = true
      globalOpenCounter++
    }
  }

  onClick (e) {
    if (!this.isOpen) {
      this.isOpen = true
      globalOpenCounter++
    }
  }

  onMouseLeave (e) {
    if (this.isOpen) {
      setTimeout(() => { globalOpenCounter-- }, 500)
      this.isOpen = false
    }
  }
}
HoverMenu.styles = hoverMenuCSS
customElements.define('hover-menu', HoverMenu)