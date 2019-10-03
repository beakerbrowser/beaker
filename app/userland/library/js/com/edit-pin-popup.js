/* globals beaker */
import { html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from '../../../app-stdlib/js/com/popups/base.js'
import popupsCSS from '../../../app-stdlib/css/com/popups.css.js'

// exported api
// =

export class EditPinPopup extends BasePopup {
  constructor (pin) {
    super()
    this.pin = pin
  }

  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 500px;
    }

    .popup-inner label {
      font-size: 11px;
    }
    `]
  }

  // management
  //

  static async create (pin) {
    return BasePopup.create(EditPinPopup, pin)
  }

  static destroy () {
    return BasePopup.destroy('edit-pin-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `Edit pin`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.pin.href}" placeholder="E.g. beakerbrowser.com" />

          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.pin.title}" placeholder="E.g. Beaker Browser" />
        </div>

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">Save</button>
        </div>
      </form>
    `
  }
  
  // events
  // =

  onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('resolve', {
      detail: {
        href: e.target.href.value,
        title: e.target.title.value
      }
    }))
  }
}

customElements.define('edit-pin-popup', EditPinPopup)