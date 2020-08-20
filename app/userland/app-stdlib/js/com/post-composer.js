/* globals beaker */
import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { Quill } from '../../vendor/quill/quill.js'
import { deltaToMarkdown, quillFormatsHackfix } from '../quill.js'
import { joinPath } from '../strings.js'
import css from '../../css/com/post-composer.css.js'

Quill.import('formats/link').PROTOCOL_WHITELIST.push('hyper')
quillFormatsHackfix(Quill, ['bold', 'italic', 'strike', 'link', 'code', 'list', 'image', 'blockquote'])

class PostComposer extends LitElement {
  static get properties () {
    return {
      isEmpty: {type: Boolean},
      driveUrl: {type: String, attribute: 'drive-url'},
      subject: {type: String},
      parent: {type: String}
    }
  }

  constructor () {
    super()
    this.isEmpty = true
    this.driveUrl = undefined
    this.subject = undefined
    this.parent = undefined
  }

  static get styles () {
    return css
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <link rel="stylesheet" href="beaker://app-stdlib/vendor/quill/quill.snow.css">
      <link rel="stylesheet" href="beaker://app-stdlib/vendor/quill/editor-style-fixes.css">
      <form @submit=${this.onSubmit}>
        <div class="quill-container">
          <div id="quill-editor"></div>
        </div>

        <div class="actions">
          <div class="ctrls">
          </div>
          <div>            
            <button @click=${this.onCancel} tabindex="4">Cancel</button>
            <button type="submit" class="primary" tabindex="3" ?disabled=${this.isEmpty}>
              Publish
            </button>
          </div>
        </div>
      </form>
    `
  }

  renderPreview () {
    var draftText = deltaToMarkdown(this.quill.getContents().ops)
    if (!draftText) { 
      return html`<div class="preview"></div>`
    }
    return html`
      <div class="preview markdown">
        ${unsafeHTML(beaker.markdown.toHTML(draftText))}
      </div>
    `
  }

  firstUpdated () {
    var bodyInput = this.shadowRoot.querySelector('#quill-editor')
    this.quill = new Quill(bodyInput, {
      placeholder: 'What\'s new?',
      bounds: bodyInput.parentElement,
      modules: {
        toolbar: [
          ['bold', 'italic', 'strike', 'code'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['blockquote'],
          ['link', 'image'],
          ['clean']              
        ]
      },
      theme: 'snow'
    })
    this.quill.focus()
    this.quill.setSelection(this.quill.getLength())
    this.quill.on('text-change', () => {
      this.isEmpty = this.quill.getLength() <= 1
    })
  }

  // events
  // =

  onCancel (e) {
    e.preventDefault()
    e.stopPropagation()
    this.dispatchEvent(new CustomEvent('cancel'))
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var draftText = deltaToMarkdown(this.quill.getContents().ops)
    if (!draftText) {
      return
    }

    if (!this.driveUrl) {
      throw new Error('.driveUrl is missing')
    }

    var drive = beaker.hyperdrive.drive(this.driveUrl)
    var filepath
    if (this.subject || this.parent) {
      filepath = `/comments/${''+Date.now()}.md`
      let subject = this.subject
      let parent = this.parent
      if (subject === parent) parent = undefined // not needed
      await drive.writeFile(filepath, draftText, {
        metadata: {
          type: 'beaker/comment',
          'beaker/subject': subject,
          'beaker/parent': parent
        }
      })
    } else {
      filepath = `/microblog/${''+Date.now()}.md`
      await drive.writeFile(filepath, draftText, {
        metadata: {
          type: 'beaker/microblogpost'
        }
      })
    }
    var url = joinPath(this.driveUrl, filepath)

    this.dispatchEvent(new CustomEvent('publish', {detail: {url}}))
  }
}

customElements.define('beaker-post-composer', PostComposer)