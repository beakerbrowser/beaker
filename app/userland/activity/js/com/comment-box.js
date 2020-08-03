import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import css from '../../css/com/comment-box.css.js'

export class CommentBox extends LitElement {
  static get properties () {
    return {
      currentView: {type: String},
      profileUrl: {type: String, attribute: 'profile-url'},
      draftText: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.currentView = 'edit'
    this.profileUrl = ''
    this.draftText = ''
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`
      <a
        class=${this.currentView === id ? 'current' : ''}
        @click=${e => { this.currentView = id }}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.profileUrl ? html`<img class="thumb" src=${joinPath(this.profileUrl, 'thumb')}>` : ''}
      <form class="container" @submit=${this.onSubmit}>
        <nav>
          <span></span>
          ${navItem('edit', 'Write')}
          ${navItem('preview', 'Preview')}
          <span></span>
        </nav>
        <div class="content">
          ${this.currentView === 'edit' ? html`
            <textarea
              placeholder="Add a comment"
              @keyup=${this.onKeyupTextarea}
            >${this.draftText}</textarea>
          ` : ''}
          ${this.currentView === 'preview' ? this.renderPreview() : ''}
        </div>
        <div class="actions">
          <button type="submit" class="primary" ?disabled=${!this.draftText}>Post Comment</button>
        </div>
      </form>
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

customElements.define('comment-box', CommentBox)
