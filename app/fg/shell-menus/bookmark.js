/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

const DEFAULT_LOCATIONS = ['/library/bookmarks', '/desktop']

class BookmarkMenu extends LitElement {
  static get properties () {
    return {
      href: {type: String},
      title: {type: String}
    }
  }

  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.bookmark = null
    this.location = '/library/bookmarks'
    this.href = ''
    this.title = ''
  }

  async init (params) {
    this.href = params.url
    this.title = params.metadata.title || ''
    await this.requestUpdate()

    // focus and highlight input
    var input = this.shadowRoot.querySelector('input[type=text]')
    input.focus()
    input.setSelectionRange(0, input.value.length)
  }

  // rendering
  // =

  render () {
    const locopt = (v, label) => {
      return html`<option value=${v} ?selected=${this.location === v}>${label}</option>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <form @submit=${this.onSaveBookmark}>
          <div class="input-group">
            <label for="location">Save link to</label>
            <select name="location" @change=${this.onChangeLocation}>
              ${!DEFAULT_LOCATIONS.includes(this.location) ? locopt(this.location, this.location) : ''}
              ${DEFAULT_LOCATIONS.map(loc => locopt(loc, loc))}
              <option disabled>──────────</option>
              ${locopt('!other', 'Choose folder...')}
            </select>
          </div>

          <div class="input-group">
            <label for="title">Title</label>
            <input type="text" name="title" placeholder="Title" value="${this.title}" @keyup=${this.onChangeTitle}/>
          </div>

          <div class="input-group">
            <label for="href">URL</label>
            <input type="text" name="href" placeholder="Title" value="${this.href}" @keyup=${this.onChangeHref}/>
          </div>

          <div class="buttons">
            <button type="button" class="btn remove" @click=${this.onClickCancel}>
              Cancel
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
    await bg.bookmarks.add({
      location: this.location,
      href: this.href,
      title: this.title
    })
    bg.shellMenus.close()
  }

  async onClickCancel (e) {
    bg.shellMenus.close()
  }

  async onChangeLocation (e) {
    var value = e.target.value
    if (value === '!other') {
      this.setAttribute('stay-open', 1)
      value = (await bg.navigator.selectFileDialog({
        title: 'Select the folder to save to'
      }).catch(e => ([this.location])))[0].path
      this.removeAttribute('stay-open')
    }
    this.location = value
   
    // if canceled, we need to manually revert the selection
    await this.requestUpdate()
    this.shadowRoot.querySelector('[name="location"]').value = this.location
  }

  onChangeHref (e) {
    this.href = e.target.value
  }

  onChangeTitle (e) {
    this.title = e.target.value
  }
}
BookmarkMenu.styles = [commonCSS, inputsCSS, buttonsCSS, css`
.wrapper {
  box-sizing: border-box;
  padding: 15px;
  color: #333;
  background: #fff;
  height: 215px;
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
