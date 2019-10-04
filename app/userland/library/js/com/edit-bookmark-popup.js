/* globals beaker */
import { html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from '../../../app-stdlib/js/com/popups/base.js'
import popupsCSS from '../../../app-stdlib/css/com/popups.css.js'

// exported api
// =

export class EditBookmarkPopup extends BasePopup {
  constructor (bookmark) {
    super()
    this.bookmark = bookmark
  }

  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 500px;
    }

    .popup-inner label {
      font-size: 11px;
    }

    label.checkbox {
      font-size: 12px;
      margin: 15px 0px -8px;
    }

    label.checkbox input {
      display: inline;
      width: auto;
      height: auto;
    }
    `]
  }

  // management
  //

  static async create (bookmark) {
    return BasePopup.create(EditBookmarkPopup, bookmark)
  }

  static destroy () {
    return BasePopup.destroy('edit-bookmark-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `Edit bookmark`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.bookmark.href}" placeholder="E.g. beakerbrowser.com" />

          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.bookmark.title}" placeholder="E.g. Beaker Browser" />

          <label for="description-input">Description</label>
          <input type="text" id="description-input" name="description" value="${this.bookmark.description}" />

          <label for="tags-input">Tags</label>
          <input type="text" id="tags-input" name="tags" value="${this.bookmark.tags.join(' ')}" />

          <label class="checkbox">
            <input type="checkbox" name="public" ?checked=${this.bookmark.visibility === 'public'}>
            Share this bookmark publicly
          </label>
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
        title: e.target.title.value,
        description: e.target.description.value,
        tags: e.target.tags.value.split(' ').filter(Boolean),
        visibility: e.target.public.checked ? 'public' : 'private'
      }
    }))
  }
}

customElements.define('edit-bookmark-popup', EditBookmarkPopup)