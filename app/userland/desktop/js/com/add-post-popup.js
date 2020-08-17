/* globals beaker */
import { LitElement, html, css } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { unsafeHTML } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/unsafe-html.js'
import { BasePopup } from 'beaker://app-stdlib/js/com/popups/base.js'
import { joinPath } from 'beaker://app-stdlib/js/strings.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import popupsCSS from 'beaker://app-stdlib/css/com/popups.css.js'

// TEMPORARY

class PostComposer extends LitElement {
  static get properties () {
    return {
      driveUrl: {type: String, attribute: 'drive-url'},
      currentView: {type: String},
      draftText: {type: String}
    }
  }

  constructor () {
    super()
    this.driveUrl = undefined
    this.currentView = 'edit'
    this.draftText = ''
    this.blobs = []
  }

  static get styles () {
    return [inputsCSS, buttonsCSS, tooltipCSS, css`
    nav {
      display: flex;
      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }
    
    nav a {
      border: 1px solid transparent;
      padding: 5px 14px;
    }
    
    nav a.current {
      position: relative;
      background: var(--bg-color--default);
      border: 1px solid var(--border-color--light);
      border-bottom: 1px solid transparent;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }

    nav a.current:after {
      content: '';
      background: var(--bg-color--default);
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 2px;
    }
    
    nav a:hover:not(.current) {
      text-decoration: none;
      cursor: pointer;
      background: var(--bg-color--light);
    }

    .view {
      margin-bottom: 10px;
    }

    label {
      font-size: 11px;
    }

    textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 100px;
      max-height: 50vh;
      resize: vertical;
      font-family: system-ui;
      font-size: 14px;
      padding: 14px;
      border-color: var(--border-color--light);
      border-top-left-radius: 0;
    }

    textarea:focus {
      box-shadow: none;
      border-color: var(--border-color--light);
    }

    textarea::placeholder {
      font-family: system-ui;
      font-size: 14px;
    }

    .markdown :-webkit-any(h1, h2, h3, h4, h5) {
      font-family: arial;
      color: var(--text-color--light);
    }
    .markdown h1 { font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
    .markdown h2 { font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
    .markdown h3 { font-size: 19px; font-weight: 500; }
    .markdown h4 { font-size: 16px; font-weight: 600; }
    .markdown h5 { font-size: 16px; font-weight: 500; }
    .markdown pre { font-size: 13px; }
    .markdown :-webkit-any(video, audio, img) { max-width: 100%; }
    .markdown a { color: var(--text-color--link); }
    .markdown hr { border: 0; border-bottom: 1px solid var(--border-color--semi-light); }

    .preview {
      font-size: 14px;
      border: 1px solid var(--border-color--light);
      border-radius: 4px;
      padding: 14px;
    }
    .preview > :first-child {
      margin-top: 0;
    }
    .preview > :last-child {
      margin-bottom: 0;
    }

    .actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .actions input[type="file"] {
      display: none;
    }

    .actions .ctrls :-webkit-any(.far, .fas) {
      font-size: 16px;
      color: var(--text-color--light);
    }
    `]
  }

  // rendering
  // =

  render () {
    const navItem = (id, label) => html`
      <a
        class=${this.currentView === id ? 'current' : ''}
        @click=${e => { this.currentView = id }}
      >${label}</a>
    `

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <form @submit=${this.onSubmit}>
        <nav>
          ${navItem('edit', 'Write')}
          ${navItem('preview', 'Preview')}
        </nav>

        <div class="view">
          ${this.currentView === 'edit' ? html`
            <textarea
              required
              id="body-input"
              name="body"
              placeholder="What's new?"
              @keyup=${this.onKeyupTextarea}
            >${this.draftText}</textarea>
          ` : ''}
          ${this.currentView === 'preview' ? this.renderPreview() : ''}
        </div>

        <div class="actions">
          <div class="ctrls">
            <input type="file" class="image-select" accept=".png,.gif,.jpg,.jpeg" @change=${this.onChangeImage}>
            <button class="transparent tooltip-right" @click=${this.onClickAddImage} data-tooltip="Add Image">
              <span class="far fa-fw fa-image"></span>
            </button>
          </div>
          <div>            
            <button @click=${this.onCancel} tabindex="4">Cancel</button>
            <button
              type="submit"
              class="primary"
              tabindex="3"
              ?disabled=${!this.draftText}
            >
              Publish
            </button>
          </div>
        </div>
      </form>
    `
  }

  renderPreview () {
    if (!this.draftText) { 
      return html`<div class="preview"><small><span class="fas fa-fw fa-info"></span> You can use Markdown to format your post.</small></div>`
    }
    return html`
      <div class="preview markdown">
        ${unsafeHTML(beaker.markdown.toHTML(this.draftText))}
      </div>
    `
  }

  updated () {
    try {
      let textarea = this.shadowRoot.querySelector('textarea')
      textarea.focus()
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 5 + 'px'
    } catch {}
  }

  // events
  // =

  onKeyupTextarea (e) {
    this.draftText = e.currentTarget.value
  }

  onClickAddImage (e) {
    e.preventDefault()
    this.currentView = 'edit'
    this.shadowRoot.querySelector('.image-select').click()
  }

  onChangeImage (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var url = URL.createObjectURL(file)
    this.blobs.push({file, url})

    var newlines = '\n\n'
    if (!this.draftText || this.draftText.endsWith('\n\n')) {
      newlines = ''
    } else if (this.draftText.endsWith('\n')) {
      newlines = '\n'
    }
    this.draftText += `${newlines}![${file.name.replace(/]/g, '')}](${url})\n`
    
    this.requestUpdate().then(() => {
      this.shadowRoot.querySelector('textarea').value = this.draftText
    })
  }

  onCancel (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('cancel'))
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    if (!this.draftText) {
      return
    }
    if (!this.driveUrl) {
      throw new Error('.driveUrl is missing')
    }

    var drive = beaker.hyperdrive.drive(this.driveUrl)
    var postName = ''+Date.now()
    var postPath = `/microblog/${postName}.md`
    var postUrl = joinPath(this.driveUrl, postPath)
    var postBody = this.draftText

    // write all images to the drive and replace their URLs in the post
    var i = 1
    var blobsToWrite = this.blobs.filter(b => this.draftText.includes(b.url))
    for (let blob of blobsToWrite) {
      let ext = blob.file.name.split('.').pop()
      let path = `/microblog/${postName}-${i++}.${ext}`

      let buf = await blob.file.arrayBuffer()
      await drive.writeFile(path, buf)

      let url = joinPath(this.driveUrl, path)
      while (postBody.includes(blob.url)) {
        postBody = postBody.replace(blob.url, url)
      }
    }

    // write the post
    await drive.writeFile(postPath, postBody, {
      metadata: {type: 'beaker/microblogpost'}
    })

    this.draftText = ''
    this.currentView = 'edit'
    this.dispatchEvent(new CustomEvent('publish', {detail: {url: postUrl}}))
  }
}

customElements.define('post-composer', PostComposer)

// exported api
// =

export class AddPostPopup extends BasePopup {
  constructor (opts) {
    super()
    this.driveUrl = opts.driveUrl
  }

  static get properties () {
    return {
    }
  }

  static get styles () {
    return [popupsCSS, css`
    .popup-inner {
      width: 640px;
      border-radius: 8px;
    }
    .popup-inner .body {
      padding: 14px 12px 10px;
    }
    main {
      display: grid;
      grid-template-columns: 30px 1fr;
      grid-gap: 10px;
    }
    img {
      margin-top: 36px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      object-fit: cover;
    }
    post-composer {
      display: block;
      position: relative;
    }
    post-composer:before {
      content: '';
      display: block;
      position: absolute;
      top: 47px;
      left: -4px;
      width: 8px;
      height: 8px;
      z-index: 1;
      background: var(--bg-color--default);
      border-top: 1px solid var(--border-color--light);
      border-left: 1px solid var(--border-color--light);
      transform: rotate(-45deg);
    }
    `]
  }

  get shouldShowHead () {
    return false
  }

  get shouldCloseOnOuterClick () {
    return false
  }

  // management
  //

  static async create (opts) {
    return BasePopup.create(AddPostPopup, opts)
  }

  static destroy () {
    return BasePopup.destroy('add-post-popup')
  }

  // rendering
  // =

  renderTitle () {
    return `New post`
  }

  renderBody () {
    return html`
      <main>
        <img src=${joinPath(this.driveUrl, 'thumb')}>
        <post-composer
          drive-url=${this.driveUrl}
          @publish=${this.onPublish}
          @cancel=${this.onCancel}
        ></post-composer>
      </main>
    `
  }

  // events
  // =

  async onPublish (e) {
    this.dispatchEvent(new CustomEvent('resolve'))
  }

  async onCancel (e) {
    this.dispatchEvent(new CustomEvent('reject'))
  }
}

customElements.define('add-post-popup', AddPostPopup)