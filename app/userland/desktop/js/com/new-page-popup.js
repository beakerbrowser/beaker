/* globals beaker */
import { html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'

// exported api
// =

export class NewPagePopup extends BasePopup {
  constructor (opts) {
    super()
    this.type = opts.type
    this.private = opts.private
    this.draft = opts.draft
    this.drive = opts.drive

    this.title = ''
    this.path = this.getDefaultPath()
  }

  getDefaultPath () {
    if (this.draft) {
      return `/drafts/`
    }
    if (this.type === 'beaker/blogpost') {
      return `/blog/`
    }
    return `/pages/`
  }

  async computePath () {
    var path = this.getDefaultPath()
    var name = await getAvailableName(path, this.title.toLowerCase(), this.drive, 'md')
    return `${path}${name}`
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

  static async create (opts) {
    if (opts.private || opts.draft) {
      opts.drive = beaker.hyperdrive.drive('hyper://system/')
    } else {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      opts.drive = beaker.hyperdrive.drive(addressBook.profiles[0].key)
    }
    return BasePopup.create(NewPagePopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('new-page-popup')
  }

  // rendering
  // =

  renderTitle () {
    var title = 'page'
    if (this.type === 'beaker/blogpost') {
      title = 'blog post'
    }
    if (this.draft) title += ' draft'
    if (this.private) title = 'private ' + title
    return `New ${title}`
  }

  renderBody () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <div>
          <label for="title-input">Title</label>
          <input required type="text" id="title-input" name="title" value=${this.title} @keyup=${this.onKeyupTitle} />
        </div>
        <div>
          <label for="path-input">Location</label>
          <input type="text" id="path-input" name="path" placeholder="/" value="My Private Site ${this.path}" disabled />
        </div>

        <div class="actions">
          <button type="button" class="btn" @click=${this.onReject} tabindex="2">Cancel</button>
          <button type="submit" class="btn primary" tabindex="1">Create</button>
        </div>
      </form>
    `
  }

  updated () {
    this.shadowRoot.querySelector('input').focus()
  }

  // events
  // =

  async onKeyupTitle (e) {
    this.title = e.currentTarget.value.trim()
    this.path = await this.computePath()
    this.requestUpdate()
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var metadata = {
      type: this.type,
      title: this.title
    }
    if (this.draft) metadata['beaker/draft'] = '1'
    await this.drive.writeFile(this.path, `# ${this.title}`, {metadata})
    var url = joinPath(this.drive.url, this.path)
    this.dispatchEvent(new CustomEvent('resolve', {detail: {url}}))
  }
}

customElements.define('new-page-popup', NewPagePopup)