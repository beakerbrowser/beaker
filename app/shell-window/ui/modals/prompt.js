import * as yo from 'yo-yo'
import {BaseModal} from './base'

// exported api
// =

export class PromptModal extends BaseModal {
  constructor (opts) {
    super()
    this.message = opts.message
    this.defaultValue = opts.default || ''
  }

  render () {
    return yo`
      <div class="prompt-modal">
        <form onsubmit=${this.onSubmit.bind(this)}>
          <div class="prompt-modal-message">${this.message}</div>
          <input type="text" class="prompt-modal-input" value=${this.defaultValue} autofocus />
          <div class="actions">
            <button class="btn" type="button" onclick=${() => this.close(null)}>Cancel</button>
            <button class="btn primary" type="submit">OK</button>
          </div>
        </form>
      </div>`
  }

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()
    this.close(null, {value: e.currentTarget.querySelector('input').value})
  }

  postFirstRender () {
    document.querySelector('.modal input').focus()
  }
}
