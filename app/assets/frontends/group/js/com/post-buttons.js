import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import css from '../../css/com/post-buttons.css.js'

export class PostButtons extends LitElement {
  static get styles () {
    return css
  }

  constructor () {
    super()
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <button @click=${e => this.onClickBtn('link')}><span class="fas fa-fw fa-link"></span> Post a new link</button>
      <button @click=${e => this.onClickBtn('text')}><span class="far fa-fw fa-comment-alt"></span> Post a text post</button>
      <button @click=${e => this.onClickBtn('file')}><span class="far fa-fw fa-file"></span> Post a file</button>
    `
  }

  // events
  // =

  onClickBtn (type) {
    window.location = '/compose?type=' + type
  }
}

customElements.define('beaker-post-buttons', PostButtons)
