import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import css from '../../css/com/paginator.css.js'
import { emit } from '../lib/dom.js'

export class PostButtons extends LitElement {
  static get properties () {
    return {
      page: {type: Number},
      label: {type: String},
      atEnd: {type: Boolean, attribute: 'at-end'}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.page = 0
    this.label = ''
    this.atEnd = false
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      ${this.page > 0 ? html`<a href="#" @click=${this.onClickLeft}><span class="fas fa-fw fa-caret-left"></span></a>` : ''}
      <span class="label">${this.label || this.page}</span>
      ${!this.atEnd ? html`<a href="#" @click=${this.onClickRight}><span class="fas fa-fw fa-caret-right"></span></a>` : ''}
    `
  }

  // events
  // =

  onClickLeft () {
    emit(this, 'change-page', {detail: {page: this.page - 1}})
  }

  onClickRight () {
    emit(this, 'change-page', {detail: {page: this.page + 1}})
  }
}

customElements.define('beaker-paginator', PostButtons)
