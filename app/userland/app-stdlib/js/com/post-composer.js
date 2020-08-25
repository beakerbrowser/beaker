/* globals beaker */
import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { Quill } from '../../vendor/quill/quill.js'
import '../../vendor/quill-mention/quill.mention.js'
import { deltaToMarkdown, quillFormatsHackfix } from '../quill.js'
import { joinPath, toNiceUrl } from '../strings.js'
import { debouncer } from '../functions.js'
import * as contextMenu from './context-menu.js'
import css from '../../css/com/post-composer.css.js'

Quill.import('formats/link').PROTOCOL_WHITELIST.push('hyper')
quillFormatsHackfix(Quill, ['bold', 'italic', 'strike', 'link', 'code', 'list', 'image', 'blockquote'])

class PostComposer extends LitElement {
  static get properties () {
    return {
      placeholder: {type: String},
      isEmpty: {type: Boolean},
      subject: {type: String},
      parent: {type: String},
      _visibility: {type: String}
    }
  }

  constructor () {
    super()
    this.placeholder = 'What\'s new?'
    this.isEmpty = true
    this._visibility = 'public'
    this.subject = undefined
    this.parent = undefined
    beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json').then(async (addr) => {
      this.profile = await beaker.hyperdrive.getInfo(addr?.profiles?.[0]?.key)
    })
    this.searchQueryId = 0
    this.searchDebouncer = debouncer(100)
  }

  static get styles () {
    return css
  }

  get mustBePrivate () {
    if (this.subject && this.subject.startsWith('hyper://private')) return true
    if (this.parent && this.parent.startsWith('hyper://private')) return true
    return false
  }

  get visibility () {
    if (this.mustBePrivate) {
      return 'private'
    }
    return this._visibility
  }

  set visibility (v) {
    this._visibility = v
  }

  // rendering
  // =

  render () {
    const mustBePrivate = this.mustBePrivate
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <link rel="stylesheet" href="beaker://app-stdlib/vendor/quill/quill.snow.css">
      <link rel="stylesheet" href="beaker://app-stdlib/vendor/quill/editor-style-fixes.css">
      <link rel="stylesheet" href="beaker://app-stdlib/vendor/quill-mention/quill.mention.css">
      <form @submit=${this.onSubmit}>
        <div class="quill-container">
          <div id="quill-editor"></div>
        </div>

        <div class="actions">
          <div class="ctrls">
          </div>
          <div>      
            <a
              class="visibility ${mustBePrivate ? 'disabled' : ''} tooltip-top"
              data-tooltip=${mustBePrivate ? 'Must be private as you are commenting on private content' : 'Choose who can see this content'}
              @click=${this.onClickVisibility}
            >
              ${this.visibility === 'private' ? html`
                <span class="fas fa-fw fa-lock"></span> Only Me
              ` : html`
                <span class="fas fa-fw fa-globe-africa"></span> Everybody
              `}
              ${mustBePrivate ? '' : html`<span class="fas fa-fw fa-caret-down"></span>`}
            </a>      
            <button @click=${this.onCancel} tabindex="4">Cancel</button>
            <button type="submit" class="primary" tabindex="3" ?disabled=${this.isEmpty}>
              ${this.visibility === 'private' ? 'Save privately' : 'Publish publicly'}
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
      placeholder: this.placeholder,
      bounds: bodyInput.parentElement,
      modules: {
        toolbar: [
          ['bold', 'italic', 'strike', 'code'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['blockquote'],
          ['link', 'image'],
          ['clean']              
        ],
        mention: {
          allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
          mentionDenotationChars: ["@"],
          source: this.autocompleteOptions.bind(this)
        }
      },
      theme: 'snow'
    })
    this.quill.focus()
    this.quill.setSelection(this.quill.getLength())
    this.quill.on('text-change', () => {
      this.isEmpty = this.quill.getLength() <= 1
    })
  }

  async autocompleteOptions (searchTerm, renderList, mentionChar) {
    if (!searchTerm) return renderList([], searchTerm)
    var searchId = ++this.searchQueryId
    var queryResults = await this.searchDebouncer(() => beaker.database.searchRecords(searchTerm, {
      filter: {index: ['beaker/index/subscriptions'], site: this.profile.url},
      limit: 10,
      sort: 'rank',
      reverse: true
    }))
    if (!queryResults || searchId !== this.searchQueryId) return
    var suggestions = queryResults.map(s => {
      return {id: s.metadata.href, value: s.metadata.title || toNiceUrl(s.metadata.href)}
    })
    {
      let title = this.profile?.title.toLowerCase() || ''
      if (title.includes(searchTerm.toLowerCase())) {
        suggestions.unshift({id: this.profile.url, value: this.profile.title})
      }
    }
    renderList(suggestions, searchTerm)
  }
  
  // events
  // =

  onClickVisibility (e) {
    if (this.mustBePrivate) return
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const items = [
      {icon: 'fas fa-lock', label: 'Only Me (Private)', click: () => { this.visibility = 'private' } },
      {icon: 'fas fa-globe-africa', label: 'Everybody (Public)', click: () => { this.visibility = 'public' } }
    ]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      noBorders: true,
      roomy: true,
      rounded: true,
      style: `padding: 6px 0`,
      items,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css'
    })
  }

  onCancel (e) {
    e.preventDefault()
    e.stopPropagation()
    this.quill.setText('')
    this.dispatchEvent(new CustomEvent('cancel'))
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    var draftText = deltaToMarkdown(this.quill.getContents().ops)
    if (!draftText) {
      return
    }

    if (!this.profile) {
      throw new Error('.profile is missing')
    }

    var driveUrl = this.visibility === 'private' ? 'hyper://private' : this.profile.url
    var drive = beaker.hyperdrive.drive(driveUrl)
    var filepath
    if (this.subject || this.parent) {
      filepath = `/comments/${''+Date.now()}.md`
      let subject = this.subject
      let parent = this.parent
      if (subject === parent) parent = undefined // not needed
      await drive.writeFile(filepath, draftText, {
        metadata: {
          'beaker/subject': subject,
          'beaker/parent': parent
        }
      })
    } else {
      filepath = `/microblog/${''+Date.now()}.md`
      await drive.writeFile(filepath, draftText)
    }
    var url = joinPath(driveUrl, filepath)

    this.dispatchEvent(new CustomEvent('publish', {detail: {url}}))
  }
}

customElements.define('beaker-post-composer', PostComposer)