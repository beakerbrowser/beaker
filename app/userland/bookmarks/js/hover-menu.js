import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import hoverMenuCSS from '../css/hover-menu.css.js'

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
    const item = ([id, label]) => {
      if (label.divider) return html`<hr>`
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
          ${this.current}
          <span class="fas fa-angle-down"></span>
        </div>
        ${this.isOpen
          ? html`
            <div class="dropdown-menu">
              ${repeat(Object.entries(this.options), item)}
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