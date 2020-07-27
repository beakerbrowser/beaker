import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import css from '../../css/com/create-box.css.js'

export class CreateBox extends LitElement {
  static get properties () {
    return {
      draftText: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.draftText = ''
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <form class="container" @submit=${this.onSubmit}>
        <textarea
          placeholder="Add a comment to this page"
          @keyup=${this.onKeyupTextarea}
        ></textarea>
        <div>
          <button type="submit" class="primary" ?disabled=${!this.draftText}>Post</button>
        </div>
      </form>
      ${this.renderPreview()}
    `
  }

  renderPreview () {
    if (!this.draftText) { 
      return ''
    }
    return html`
      <div class="preview">
        ${unsafeHTML(beaker.markdown.toHTML(this.draftText))}
      </div>
    `
  }

  // events
  // =

  onKeyupTextarea (e) {
    this.draftText = e.currentTarget.value.trim()
  }

  onSubmit (e) {
    e.preventDefault()
    if (!this.draftText) return
    emit(this, 'create-comment', {detail: {text: this.draftText}})
    e.currentTarget.reset()
    this.draftText = ''
  }
}

customElements.define('create-box', CreateBox)
