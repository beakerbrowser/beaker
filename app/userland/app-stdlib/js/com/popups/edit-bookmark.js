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
    this.isPublic = this.bookmark ? (this.bookmark?.site?.url !== 'hyper://private') : true
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

    .viz-selector {
      margin-bottom: 10px;
    }

    .viz-selector > span {
      display: inline-flex;
      margin-right: 5px;
    }

    .viz-selector a {
      border: 1px solid var(--border-color--light);
      border-radius: 4px;
      padding: 4px 6px;
    }

    .viz-selector a:first-child {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    .viz-selector a:last-child {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .viz-selector a.selected {
      background: var(--bg-color--selected);
      border-color: var(--bg-color--selected);
      color: var(--bg-color--default);
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
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.bookmark?.href || ''}" placeholder="E.g. beakerbrowser.com" />

          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.bookmark?.title || ''}" placeholder="E.g. Beaker Browser" />

          <label for="public-input">Visibility</label>
          <div class="viz-selector">
            <span>
              <a class="${this.isPublic ? 'selected' : ''}" @click=${this.onTogglePublic}>
                <span class="fas fa-fw fa-globe-americas"></span> Public
              </a>
              <a class="${!this.isPublic ? 'selected' : ''}" @click=${this.onTogglePublic}>
                <span class="fas fa-fw fa-lock"></span> Private
              </a>
            </span>
            ${this.isPublic ? 'Visible to everybody' : 'Only visible to you'}
          </div>

          <label class="checkbox" for="pinned-input">
            <input type="checkbox" id="pinned-input" name="pinned" value="1" ?checked=${!!this.bookmark?.pinned} />
            Pin to start page
          </label>
        </div>

        <div class="actions">
          ${this.bookmark ? html`<button type="button" class="btn delete" @click=${this.onDelete} tabindex="3">Delete</button>` : ''}
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">${this.isPublic ? 'Publish' : 'Save'}</button>
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
    this.isPublic = !this.isPublic
    this.requestUpdate()
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    let b = {
      href: e.target.href.value,
      title: e.target.title.value,
      pinned: e.target.pinned.checked,
      site: this.isPublic ? `hyper://${(await beaker.browser.getProfile()).key}` : 'hyper://private'
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