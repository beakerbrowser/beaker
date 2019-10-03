import {LitElement, html} from '../../../vendor/lit-element/lit-element.js'
import composerCSS from '../../../css/com/status/composer.css.js'
import { on } from '../../dom.js'

export class StatusComposer extends LitElement {
  static get properties () {
    return {
      isFocused: {type: Boolean},
      draftText: {type: String}
    }
  }

  constructor () {
    super()
    this.isFocused = false
    this.draftText = ''
    on(document, 'focus-composer', () => this.onClickPlaceholder())
  }

  _submit () {
    if (!this.draftText) return
    this.dispatchEvent(new CustomEvent('submit', {detail: {body: this.draftText}}))
    this.draftText = ''
  }

  // rendering
  // =

  render () {
    if (this.isFocused || this.draftText) {
      return this.renderActive()
    }
    return this.renderInactive()
  }

  renderInactive () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="input-placeholder" @click=${this.onClickPlaceholder}>
        <span class="fas fa-fw fa-pencil-alt" style="margin-right: 8px"></span> Compose a new status
      </div>
    `
  }

  renderActive () {
    return html`
      <textarea
        placeholder="Enter your status here"
        @keydown=${this.onKeydownTextarea}
        @keyup=${this.onChangeTextarea}
        @blur=${this.onBlurTextarea}
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

  async onClickPlaceholder () {
    this.isFocused = true

    // focus after update
    await this.updateComplete
    this.shadowRoot.querySelector('textarea').focus()
  }

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

  onBlurTextarea () {
    this.isFocused = false
  }

  onClickPost () {
    this._submit()
  }
}
StatusComposer.styles = composerCSS

customElements.define('beaker-status-composer', StatusComposer)