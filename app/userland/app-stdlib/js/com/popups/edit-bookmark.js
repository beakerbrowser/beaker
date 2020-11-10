/* globals beaker */
import { html, css } from '../../../vendor/lit-element/lit-element.js'
import { BasePopup } from './base.js'
import popupsCSS from '../../../css/com/popups.css.js'
import { normalizeUrl, createResourceSlug, joinPath } from '../../strings.js'
import { getAvailableName } from '../../fs.js'

// exported api
// =

export class EditBookmarkPopup extends BasePopup {
  constructor (bookmark) {
    super()
    this.bookmark = bookmark
    if (bookmark && typeof beaker.bookmarks === 'undefined') {
      // NOTE
      // we're still migrating beaker-app-stdlib from being a purely internal library
      // and the 'edit bookmark' logic needs to be updated. sorry!
      // -prf
      throw new Error('Can only create bookmarks with EditBookmarkPopup - edit not yet implemented')
    }
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

    .popup-inner input[type="text"] {
      padding: 6px;
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
      <link rel="stylesheet" href=${(new URL('../../../css/fontawesome.css', import.meta.url)).toString()}>
      <form @submit=${this.onSubmit}>
        <div>
          <label for="href-input">URL</label>
          <input required type="text" id="href-input" name="href" value="${this.bookmark?.href || ''}" placeholder="E.g. beakerbrowser.com" />

          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value="${this.bookmark?.title || ''}" placeholder="E.g. Beaker Browser" />

          ${typeof beaker.bookmarks === 'undefined' ? '' : html`
            <label class="checkbox" for="pinned-input">
              <input type="checkbox" id="pinned-input" name="pinned" value="1" ?checked=${!!this.bookmark?.pinned} />
              Pin to start page
            </label>
          `}
        </div>

        <div class="actions">
          ${this.bookmark ? html`<button type="button" class="btn delete" @click=${this.onDelete} tabindex="3">Delete</button>` : ''}
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

    let b = {
      href: e.target.href.value,
      title: e.target.title.value,
      pinned: e.target.pinned?.checked
    }
    console.log(b)
    if (typeof beaker.bookmarks === 'undefined') {
      // userland
      b.href = normalizeUrl(b.href)
      let drive = beaker.hyperdrive.drive('hyper://private/')
      let slug = createResourceSlug(b.href, b.title)
      let filename = await getAvailableName('/bookmarks', slug, drive, 'goto') // avoid collisions
      let path = joinPath('/bookmarks', filename)
      await drive.writeFile(path, '', {metadata: {href: b.href, title: b.title}})
    } else {
      // builtin
      if (this.bookmark && b.href !== this.bookmark.href) {
        await beaker.bookmarks.remove(this.bookmark.href)
      }
      await beaker.bookmarks.add(b)
    }

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