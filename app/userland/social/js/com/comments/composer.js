import {LitElement, html} from '../../../vendor/lit-element/lit-element.js'
import commentComposerCSS from '../../../css/com/comments/composer.css.js'
import { emit } from '../../lib/dom.js'

export class CommentComposer extends LitElement {
  static get properties () {
    return {
      href: {type: String},
      parent: {type: String},
      isFocused: {type: Boolean},
      draftText: {type: String},
      placeholder: {type: String}
    }
  }

  constructor () {
    super()
    this.href = ''
    this.parent = ''
    this.isFocused = false
    this.draftText = ''
    this.placeholder = 'Write a new comment'
  }

  _submit () {
    if (!this.draftText) return
    var detail = {
      href: this.href,
      parent: this.parent || undefined,
      content: this.draftText
    }
    emit(this, 'submit-comment', {bubbles: true, detail})
    this.draftText = ''
  }

  focus () {
    this.shadowRoot.querySelector('textarea').focus()
  }

  // rendering
  // =

  render () {
    return html`
      <textarea
        placeholder="Enter your comment here"
        @keydown=${this.onKeydownTextarea}
        @keyup=${this.onChangeTextarea}
      >${this.draftText}</textarea>
      <div class="actions">
        <button
          class="btn primary"
          ?disabled=${this.draftText.length === 0}
          @click=${this.onClickPost}
        >Post</button>
      </div>
    `
  }

  // events
  // =

  onKeydownTextarea (e) {
    // check for cmd/ctrl+enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      e.currentTarget.value = ''
      e.currentTarget.blur()
      return this._submit()
    }
    this.onChangeTextarea(e)
  }

  onChangeTextarea (e) {
    this.draftText = e.currentTarget.value
  }

  onClickPost () {
    this._submit()
  }
}
CommentComposer.styles = commentComposerCSS

customElements.define('beaker-comment-composer', CommentComposer)