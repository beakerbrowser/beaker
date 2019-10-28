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
      description: {type: String},
      isPublic: {type: Boolean},
      hasChanges: {type: Boolean}
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
    this.description = ''
    this.isPublic = undefined
    this.hasChanges = false
  }

  async init (params) {
    const b = this.bookmark = await bg.bookmarks.get(params.url)
    if (b) {
      this.href = b.href
      this.title = b.title
      this.description = b.description
      this.isPublic = b.isPublic
    } else {
      this.href = params.url
      this.title = params.metadata.title || ''
      this.description = params.metadata.description || ''
    }
    await this.requestUpdate()

    // focus and highlight input
    var input = this.shadowRoot.querySelector('input[type=text]')
    input.focus()
    input.setSelectionRange(0, input.value.length)
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <form @submit=${this.onSaveBookmark}>
          <div class="input-group">
            <label for="title">Title</label>
            <input class="bookmark-title" type="text" name="title" placeholder="Title" value="${this.title}" @keyup=${this.onChangeTitle}/>
          </div>

          <div class="input-group">
            <label for="description">Description</label>
            <textarea class="bookmark-description" name="description" placeholder="Description" @keyup=${this.onChangeDescription}>${this.description}</textarea>
          </div>

          <div class="input-group public">
            <label>
              <input type="checkbox" ?checked=${this.isPublic} @change=${this.onChangePublic}>
              Share this bookmark publicly
            </label>
          </div>

          <div class="buttons">
            <button type="button" class="btn remove" @click=${this.onClickRemoveBookmark}>
              ${this.bookmark ? 'Remove' : 'Cancel'}
            </button>
            <button class="btn primary" type="submit">
              Done
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
    var newB = {
      href: this.href,
      title: this.title,
      description: this.description,
      isPublic: this.isPublic
    }
    if (this.bookmark) await bg.bookmarks.update(this.href, newB)
    else await bg.bookmarks.add(newB)
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  async onClickRemoveBookmark (e) {
    var b = this.bookmark
    if (b) {
      await bg.bookmarks.remove(b.href)
    }
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  onChangeTitle (e) {
    this.title = e.target.value
    this.hasChanges = true
  }

  onChangeDescription (e) {
    this.description = e.target.value
    this.hasChanges = true
  }

  onChangePublic (e) {
    this.isPublic = e.currentTarget.checked
    this.hasChanges = true
  }
}
BookmarkMenu.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 15px;
  color: #333;
  background: #fff;
  height: 226px;
  overflow: hidden;
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

.input-group input,
.input-group textarea {
  display: inline-block;
  font-size: 0.725rem;
}

.input-group textarea {
  height: 50px;
  padding-top: 5px;
  resize: none;
}

.input-group input[type=text] {
  height: 28px;
  line-height: 28px;
  color: rgba(0, 0, 0, 0.75);
}

.input-group input[type=checkbox] {
  height: auto;
}

.input-group.public {
  margin: 14px 0;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  padding: 0;
  margin: 15px -20px 0;
}

.buttons button {
  height: 40px;
  flex: 1;
  text-align: center;
  border-radius: 0;
}
`]

customElements.define('bookmark-menu', BookmarkMenu)
