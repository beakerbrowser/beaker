/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'

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

    .popup-inner label[for="pinned-input"] {
      margin: 16px 0;
    }

    .popup-inner input[type="checkbox"] {
      display: inline;
      height: auto;
      width: auto;
      margin: 0 5px;
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
          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.bookmark?.stat.metadata.title || ''}" placeholder="E.g. Beaker Browser" />

          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.bookmark?.stat.metadata.href || ''}" placeholder="E.g. beakerbrowser.com" />

          <label for="pinned-input">
            <input type="checkbox" id="pinned-input" name="pinned" value="1" ?checked=${!!this.bookmark?.stat.metadata.pinned} />
            Pin to start page
          </label>
        </div>

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">Save</button>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var pinned = e.target.pinned.checked
    if (this.bookmark) {
      await beaker.hyperdrive.drive('hyper://system/').updateMetadata(this.bookmark.path, {
        href: e.target.href.value,
        title: e.target.title.value,
        pinned: pinned ? '1' : undefined
      })
      if (!pinned) await beaker.hyperdrive.drive('hyper://system/').deleteMetadata(this.bookmark.path, ['pinned'])
    } else {
      await beaker.bookmarks.add({
        href: e.target.href.value,
        title: e.target.title.value,
        pinned
      })
    }

    this.dispatchEvent(new CustomEvent('resolve'))
  }
}

customElements.define('edit-bookmark-popup', EditBookmarkPopup)