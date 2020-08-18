/* globals beaker */
import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { joinPath } from '../strings.js'
import css from '../../css/com/post-composer.css.js'

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
    return css
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