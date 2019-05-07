/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import _pick from 'lodash.pick'
import _isEqual from 'lodash.isequal'

class BookmarkMenu extends LitElement {
  static get properties () {
    return {
      href: {type: String},
      title: {type: String},
      description: {type: String},
      tags: {type: String},
      pinned: {type: Boolean},
      isPublic: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.bookmark = null
    this.bookmarkIsNew = false
    this.href = ''
    this.title = ''
    this.description = ''
    this.tags = ''
    this.pinned = false
    this.isPublic = false
  }

  async init (params) {
    this.bookmarkIsNew = params.bookmarkIsNew
    const b = this.bookmark = await bg.bookmarks.get(params.url)
    if (b && b.tags) b.tags = tagsToString(b.tags)
    if (b) {
      this.href = b.href
      this.title = b.title
      this.description = b.description
      this.tags = b.tags
      this.pinned = b.pinned
      this.isPublic = b.isPublic
    } else {
      this.href = params.url
    }
    await this.requestUpdate()

    // focus and highlight input
    var input = this.shadowRoot.querySelector('input')
    input.focus()
    input.setSelectionRange(0, input.value.length)
  }

  get canSave () {
    if (this.bookmarkIsNew) {
      return true
    }
    return !_isEqual(
      _pick(this, ['href', 'title', 'description', 'tags', 'pinned', 'isPublic']),
      _pick(this.bookmark, ['href', 'title', 'description', 'tags', 'pinned', 'isPublic'])
    )
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div class="header">
          <i class="fas fa-star"></i>
          Edit this bookmark
        </div>

        <form @submit=${this.onSaveBookmark}>
          <div class="input-group">
            <label for="title">Title</label>
            <input class="bookmark-title" type="text" name="title" placeholder="Title" value="${this.title}" @keyup=${this.onChangeTitle}/>
          </div>

          <div class="input-group">
            <label for="description">Description</label>
            <textarea class="bookmark-description" name="description" placeholder="Description" @keyup=${this.onChangeDescription}>${this.description}</textarea>
          </div>

          <div class="input-group tags">
            <label for="tags">Tags</label>
            <input
              type="text"
              placeholder="Separate with spaces"
              name="tags"
              value="${this.tags}"
              @keyup=${this.onChangeTags}
            >
          </div>
          <div class="other-options">
            <label class="toggle">
              <span class="text"><i class="fas fa-fw fa-broadcast-tower"></i> Share publicly</span>
              <input @change=${this.onChangePublic} ?checked=${this.isPublic || false} type="checkbox" name="isPublic" value="isPublic">
              <div class="switch"></div>
            </label>

            <label class="toggle">
              <span class="text"><i class="fas fa-fw fa-thumbtack"></i> Pin to start page</span>
              <input @change=${this.onChangePinned} ?checked=${this.pinned || false} type="checkbox" name="pinned" value="pinned">
              <div class="switch"></div>
            </label>
          </div>

          <div class="buttons">
            <button type="button" class="btn remove" @click=${this.onClickRemoveBookmark}>
              Remove bookmark
            </button>

            <button class="btn primary" ?disabled=${!this.canSave} type="submit">
              Save
            </button>
          </div>
        </form>
      </div>
    `
  }

  // events
  // =

  async onSaveBookmark (e) {
    e.preventDefault()
    if (!this.canSave) {
      return
    }

    // update bookmark
    var b = this.bookmark
    b.href = this.href
    b.title = this.title
    b.description = this.description
    b.tags = this.tags.split(' ').filter(Boolean)
    b.isPublic = this.isPublic
    b.pinned = this.pinned
    await bg.bookmarks.add(b)
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  async onClickRemoveBookmark (e) {
    var b = this.bookmark
    if (!b) return
    await bg.bookmarks.remove(b.href)
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onChangeTags (e) {
    this.tags = e.target.value
  }

  onChangePinned (e) {
    this.pinned = e.target.checked
  }

  onChangePublic (e, v) {
    this.isPublic = e.target.checked
  }
}
BookmarkMenu.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 15px;
  color: #333;
  background: #fff;
  height: 400px;
  overflow: hidden;
}

h3 {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  color: rgba(0, 0, 0, 0.5);
  margin-bottom: 10px;
}

.header {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 15px;
  border: 0;
}

.fa-star {
  border: none;
  font-size: 24px;
  margin-right: 10px;
  color: transparent;
  text-shadow: 0px 0px 4px rgba(255, 255, 255, 0.3);
  background-color: #bbb;
  -webkit-background-clip: text;
}

form {
  font-size: 13px;
  margin: 0;
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 10px;
}

.input-group label {
  display: block;
  font-size: 12px;
  margin-bottom: 2px;
}

.other-options {
  margin-top: 20px;
}

.other-options .input-group {
  flex-direction: row;
  align-items: center;
}

.other-options .input-group label {
  display: inline-block;
  margin-right: auto;
  font-weight: normal;
  font-size: 13px;
}

.other-options .toggle {
  border-top: 1px solid #ddd;
  background: #fafafa;
  margin: 0 -20px;
  padding: 12px 20px;
  line-height: 1;
}

.other-options .toggle:hover {
  background: #eee;
}

.input-group input,
.input-group textarea {
  display: inline-block;
  font-size: 0.725rem;
}

.input-group textarea {
  height: 50px;
  padding-top: 5px;
}

.input-group input {
  height: 28px;
  line-height: 28px;
  color: rgba(0, 0, 0, 0.75);
}

.buttons {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  margin: 0 -20px;
  border-top: 1px solid #ddd;
  text-align: right;
}

.buttons .btn {
  margin-left: 5px;
}

.buttons .btn.remove {
  margin-right: auto;
  margin-left: 0;
}
`]

customElements.define('bookmark-menu', BookmarkMenu)

// internal methods
// =

function tagsToString (tags) {
  return (tags || []).join(' ')
}
