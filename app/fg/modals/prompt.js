/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class PromptModal extends LitElement {
  constructor () {
    super()
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.message = params.message || 'Please enter a value'
    await this.requestUpdate()

    if (params.default) {
      this.shadowRoot.querySelector('input').value = params.default
    }

    // adjust height based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({width, height})
  }

  firstUpdated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // rendering
  // =

  render () {
    return html`
      <div class="wrapper">
        <form @submit=${this.onSubmit}>
          <div class="message">${this.message}</div>
          <input name="input">
          <div class="actions">
            <button class="btn" @click=${this.onClickCancel} type="button">Cancel</button>
            <button class="btn primary" type="submit">OK</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.resolve()
  }

  async onSubmit (e) {
    e.preventDefault()
    this.cbs.resolve({value: e.target.input.value})
  }
}
PromptModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 5px 15px;
  font-size: 16px;
}

input {
  width: 460px;
  padding: 5px 6px;
  font-size: 16px;
  margin: 5px;
}

.actions {
  margin: 10px 4px;
  text-align: right;
}

.btn {
  width: 75px;
}
`]

customElements.define('prompt-modal', PromptModal)