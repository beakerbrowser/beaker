/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'

// exported api
// =

export class EditFilePopup extends BasePopup {
  constructor (file) {
    super()
    this.file = file
  }

  get isLink () {
    return this.file.name.endsWith('.goto')
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

  static async create (file) {
    return BasePopup.create(EditFilePopup, file)
  }

  static destroy () {
    return BasePopup.destroy('edit-file-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `Edit desktop ${this.isLink ? 'link' : 'file'}`
  }

  renderBody () {
    if (this.isLink) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <form @submit=${this.onSubmit}>
          <div>
            <label for="title-input">Title</label>
            <input required type="text" id="title-input" name="title" value="${this.file.stat.metadata.title}" placeholder="E.g. Beaker Browser" />

            <label for="href-input">URL</label>
            <input required type="text" id="href-input" name="href" value="${this.file.stat.metadata.href}" placeholder="E.g. beakerbrowser.com" />
          </div>

          <div class="actions">
            <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
            <button type="submit" class="btn primary" tabindex="1">Save</button>
          </div>
        </form>
      `
    } else {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <form @submit=${this.onSubmit}>
          <div>
            <label for="name-input">Filename</label>
            <input required type="text" id="name-input" name="name" value="${this.file.name}" placeholder="E.g. Beaker Browser" />
          </div>

          <div class="actions">
            <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
            <button type="submit" class="btn primary" tabindex="1">Save</button>
          </div>
        </form>
      `
    }
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    if (this.isLink) {
      await beaker.filesystem.updateMetadata(`/desktop/${this.file.name}`, {
        href: e.target.href.value,
        title: e.target.title.value
      })
    } else {
      await beaker.filesystem.rename(`/desktop/${this.file.name}`, `/desktop/${e.target.name.value}`)
    }

    this.dispatchEvent(new CustomEvent('resolve'))
  }
}

customElements.define('edit-file-popup', EditFilePopup)