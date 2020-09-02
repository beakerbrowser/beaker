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
      font-size: 13px;
    }

    .popup-inner label.checkbox {
      display: flex;
      align-items: center;
      margin: 5px 0;
    }

    .popup-inner input[type="checkbox"] {
      display: inline;
      height: auto;
      width: auto;
      margin: 0 10px 0 2px;
    }

    .delete {
      margin-right: auto;
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
    return this.bookmark ? 'Edit bookmark' : 'New bookmark'
  }

  renderBody () {
    var isPublic = this.bookmark && this.bookmark.site.url !== 'hyper://private'
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.bookmark?.href || ''}" placeholder="E.g. beakerbrowser.com" />

          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.bookmark?.title || ''}" placeholder="E.g. Beaker Browser" />

          <label class="checkbox" for="public-input" @click=${this.onTogglePublic}>
            <input type="checkbox" id="public-input" name="public" value="1" ?checked=${isPublic} />
            Public
          </label>

          <label class="checkbox" for="pinned-input">
            <input type="checkbox" id="pinned-input" name="pinned" value="1" ?checked=${!!this.bookmark?.pinned} />
            Pin to start page
          </label>
        </div>

        <div class="actions">
          ${this.bookmark ? html`<button type="button" class="btn delete" @click=${this.onDelete} tabindex="3">Delete</button>` : ''}
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">${isPublic ? 'Publish' : 'Save'}</button>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  onTogglePublic (e) {
    var isPublic = this.shadowRoot.querySelector('[name="public"]').checked
    this.shadowRoot.querySelector('button.primary').textContent = isPublic ? 'Publish' : 'Save'
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    let b = {
      href: e.target.href.value,
      title: e.target.title.value,
      pinned: e.target.pinned.checked,
      site: e.target.public.checked ? `hyper://${(await beaker.browser.getProfile()).key}` : 'hyper://private'
    }
    console.log(b)
    if (this.bookmark && b.href !== this.bookmark.href) {
      await beaker.bookmarks.remove(this.bookmark.href)
    }
    await beaker.bookmarks.add(b)

    this.dispatchEvent(new CustomEvent('resolve'))
  }

  async onDelete (e) {
    e.preventDefault()
    e.stopPropagation()
    await beaker.bookmarks.remove(this.bookmark.href)
    this.dispatchEvent(new CustomEvent('resolve'))
  }
}

customElements.define('edit-bookmark-popup', EditBookmarkPopup)