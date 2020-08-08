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
    this.currentView = 'action-options'
    this.profileUrl = ''
    this.draftText = ''
  }

  setView (view) {
    this.currentView = view
  }

  // rendering
  // =

  render () {
    if (this.currentView === 'action-options') {
      return html`
        <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
        ${this.profileUrl ? html`<img class="thumb" src=${joinPath(this.profileUrl, 'thumb')}>` : ''}
        <div class="action-options">
          <button class="transparent" @click=${e => this.setView('edit')}>
            <span class="far fa-fw fa-comment-alt"></span> Add Comment
          </button>
        </div>
      `
    }
    const navItem = (id, label) => html`
      <a
        class=${this.currentView === id ? 'current' : ''}
        @click=${e => { this.currentView = id }}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.profileUrl ? html`<img class="thumb" src=${joinPath(this.profileUrl, 'thumb')}>` : ''}
      <form class="container comment" @submit=${this.onSubmit}>
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
              autofocus
              @keyup=${this.onKeyupTextarea}
            >${this.draftText}</textarea>
          ` : ''}
          ${this.currentView === 'preview' ? this.renderPreview() : ''}
        </div>
        <div class="actions">
          <button @click=${this.onClickCancel}>Cancel</button>
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
      <div class="preview markdown">
        ${unsafeHTML(beaker.markdown.toHTML(this.draftText))}
      </div>
    `
  }

  // events
  // =

  onKeyupTextarea (e) {
    this.draftText = e.currentTarget.value.trim()
  }

  onClickCancel (e) {
    e.preventDefault()
    if (this.draftText && !confirm('Discard this draft?')) {
      return
    }
    this.draftText = ''
    this.currentView = 'action-options'
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
