/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class BookmarkMenu extends LitElement {
  static get properties () {
    return {
      href: {type: String},
      title: {type: String},
      tags: {type: String},
      pinned: {type: Boolean}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.bookmark = null
    this.href = ''
    this.title = ''
    this.tags = ''
    this.pinned = false
  }

  async init (params) {
    const b = this.bookmark = await bg.bookmarks.getBookmark(params.url)
    if (b) {
      this.href = b.href
      this.title = b.title
      this.tags = tagsToString(b.tags)
      this.pinned = b.pinned
    } else {
      this.href = params.url
    }
    await this.requestUpdate()

    // focus and highlight input
    var input = this.shadowRoot.querySelector('input')
    input.focus()
    input.setSelectionRange(0, input.value.length)
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
            <label for="title">Title:</label>
            <input class="bookmark-title" type="text" name="title" value="${this.title}" @keyup=${this.onChangeTitle}/>
          </div>

          <div class="input-group tags">
            <label>Tags:</label>
            <input
              type="text"
              placeholder="Separate with spaces"
              name="tags"
              value="${this.tags}"
              @keyup=${this.onChangeTags}
            >
          </div>

          <div>
            <h3>Other options</h3>

            <label class="toggle">
              <span class="text">Pin to start page</span>
              <input @change=${this.onChangePinned} ?checked=${this.pinned || false} type="checkbox" name="pinned" value="pinned">
              <div class="switch"></div>
            </label>
          </div>

          <div class="buttons">
            <button type="button" class="btn remove" @click=${this.onClickRemoveBookmark}>
              Remove bookmark
            </button>

            <button class="btn primary" type="submit">
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

    // update bookmark
    var b = this.bookmark
    b.href = this.href
    b.title = this.title
    b.tags = this.tags.split(' ').filter(Boolean)
    await bg.bookmarks.bookmarkPrivate(b.href, b)
    bg.views.refreshState('active')

    // set the pinned status of the bookmark
    await bg.bookmarks.setBookmarkPinned(b.href, this.pinned)
    bg.shellMenus.close()
  }

  async onClickRemoveBookmark (e) {
    var b = this.bookmark
    if (!b) return
    await bg.bookmarks.unbookmarkPrivate(b.href)
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  async onChangeTags (e) {
    this.tags = e.target.value
  }

  async onChangePinned (e) {
    this.pinned = e.target.checked
  }
}
BookmarkMenu.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 15px;
  color: #333;
  background: #fff;
  height: 250px;
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
  align-items: center;
  margin-bottom: 10px;
  display: flex;
}

.input-group label {
  display: inline-block;
  width: 45px;
  margin-right: 7px;
  margin-bottom: 0;
  text-align: right;
}

.input-group input,
.input-group textarea {
  display: inline-block;
  flex: 1;
  font-size: 0.725rem;
}

.input-group textarea {
  height: 70px;
  padding-top: 5px;
}

.input-group input {
  height: 28px;
  line-height: 28px;
  font-size: inherit;
  flex: 1;
  color: rgba(0, 0, 0, 0.75);
}

.buttons {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  margin-top: 15px;
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
