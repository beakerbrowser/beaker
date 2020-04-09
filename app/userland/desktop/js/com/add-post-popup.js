/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'
import _debounce from 'beaker://app-stdlib/vendor/lodash.debounce.js'

// exported api
// =

export class AddPostPopup extends BasePopup {
  constructor () {
    super()
  }

  static get properties () {
    return {
    }
  }

  static get styles () {
    return [popupsCSS, spinnerCSS, css`
    .popup-inner {
      width: 500px;
    }

    .popup-inner label {
      font-size: 11px;
    }

    .popup-inner textarea {
      min-height: 100px;
    }

    .popup-inner .actions {
      justify-content: space-between;
    }

    .popup-inner .actions small {
      color: #778;
    }
    `]
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  get filenameValue () {
    return this.shadowRoot.querySelector('[name=filename]').value
  }

  get bodyValue () {
    try {
      return this.shadowRoot.querySelector('[name=body]').value
    } catch (e) {
      return undefined
    }
  }

  // management
  //

  static async create () {
    return BasePopup.create(AddPostPopup)
  }

  static destroy () {
    return BasePopup.destroy('add-post-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `New post`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <textarea
            required
            id="body-input"
            name="body"
            placeholder="What's new?"
            tabindex="1"
          ></textarea>
        </div>
        <div>
          <input
            type="text"
            id="filename-input"
            name="filename"
            placeholder="Filename (optional)"
            tabindex="2"
          />
        </div>

        <div class="actions">
          <div>
            <small><span class="fas fa-fw fa-info"></span> Markdown is supported.</small>
          </div>
          <div>            
            <button type="button" class="btn" @click=${this.onReject} tabindex="4">Cancel</button>
            <button
              type="submit"
              class="btn primary"
              tabindex="3"
            >
              Publish
            </button>
          </div>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('textarea').focus()
  }

  // events
  // =

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    if (!this.bodyValue) {
      return
    }

    var detail = {filename: this.filenameValue, body: this.bodyValue}
    this.dispatchEvent(new CustomEvent('resolve', {detail}))
  }
}

customElements.define('add-post-popup', AddPostPopup)