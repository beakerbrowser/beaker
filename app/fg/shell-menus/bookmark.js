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
      pinned: {type: Boolean},
      toolbar: {type: Boolean}
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
    this.pinned = false
    this.toolbar = false
    this.existingBookmark = undefined
  }

  async init (params) {
    this.existingBookmark = await bg.bookmarks.get(params.url)
    if (this.existingBookmark) {
      this.href = this.existingBookmark.href || params.url
      this.title = this.existingBookmark.title || params.metadata.title || ''
      this.pinned = this.existingBookmark.pinned
      this.toolbar = this.existingBookmark.toolbar
    } else {
      this.href = params.url
      this.title = params.metadata && params.metadata.title ? params.metadata.title : ''
      this.toolbar = params.toolbar || false
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
            <input type="text" name="title" placeholder="Title" value="${this.title}" @keyup=${this.onChangeTitle}/>
          </div>

          <div class="input-group">
            <label for="href">URL</label>
            <input type="text" name="href" placeholder="Title" value="${this.href}" @keyup=${this.onChangeHref}/>
          </div>

          <div class="input-group" style="margin: 15px 0 5px">
            <label for="pinned-checkbox">
              <input id="pinned-checkbox" type="checkbox" name="pinned" value="1" ?checked=${this.pinned} @change=${this.onChangePinned}/>
              Pin to start page
            </label>
          </div>

          <div class="input-group" style="margin: 5px 0 15px">
            <label for="toolbar-checkbox">
              <input id="toolbar-checkbox" type="checkbox" name="toolbar" value="1" ?checked=${this.toolbar} @change=${this.onChangeToolbar}/>
              Add to toolbar
            </label>
          </div>

          <div class="buttons">
            <button type="button" class="btn remove" @click=${this.onClickCancel}>
              ${this.existingBookmark ? 'Delete' : 'Cancel'}
            </button>
            <button class="btn primary" type="submit">
              ${this.existingBookmark ? 'Save' : 'Done'}
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
    await bg.bookmarks.add({
      href: this.href,
      title: this.title,
      pinned: this.pinned,
      toolbar: this.toolbar
    })
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  async onClickCancel (e) {
    e.preventDefault()
    if (this.existingBookmark) {
      await bg.bookmarks.remove(this.href)
      bg.views.refreshState('active')
    }
    bg.shellMenus.close()
  }

  onChangeHref (e) {
    this.href = e.target.value
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangePinned (e) {
    this.pinned = !this.pinned
  }

  onChangeToolbar (e) {
    this.toolbar = !this.toolbar
  }
}
BookmarkMenu.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 15px 15px 0;
  height: 225px;
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
}

.input-group input[type=checkbox] {
  display: inline;
  width: auto;
  height: auto;
  margin: 0 5px;
  position: relative;
  top: 2px;
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

class BookmarkEditMenu extends BookmarkMenu {}
customElements.define('bookmark-edit-menu', BookmarkEditMenu)