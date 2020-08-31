/* globals beaker monaco */
import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { joinPath, toNiceUrl } from '../strings.js'
import { debouncer } from '../functions.js'
import * as contextMenu from './context-menu.js'
import registerSuggestions from 'beaker://editor/js/com/suggestions.js'
import css from '../../css/com/post-composer.css.js'

var _currentComposer = undefined
window.addEventListener('paste', onGlobalPaste)

class PostComposer extends LitElement {
  static get properties () {
    return {
      placeholder: {type: String},
      currentView: {type: String},
      draftText: {type: String, attribute: 'draft-text'},
      subject: {type: String},
      parent: {type: String},
      _visibility: {type: String}
    }
  }

  constructor () {
    super()
    _currentComposer = this
    this.placeholder = 'What\'s new?'
    this.currentView = 'edit'
    this.draftText = ''
    this._visibility = 'public'
    this.subject = undefined
    this.parent = undefined
    this.editor = undefined
    this.blobs = []
    beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json').then(async (addr) => {
      this.profile = await beaker.hyperdrive.getInfo(addr?.profiles?.[0]?.key)
    })
    this.searchQueryId = 0
    this.searchDebouncer = debouncer(100)
  }

  static get styles () {
    return css
  }

  get isEmpty () {
    return !this.draftText
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

  async createEditor () {
    return new Promise((resolve, reject) => {
      window.require.config({ baseUrl: 'beaker://assets/' })
      window.require(['vs/editor/editor.main'], () => {
        registerSuggestions()
        this.editor = monaco.editor.create(this.shadowRoot.querySelector('.editor'), {
          automaticLayout: true,
          contextmenu: false,
          dragAndDrop: true,
          fixedOverflowWidgets: true,
          folding: false,
          lineNumbers: false,
          links: true,
          minimap: {enabled: false},
          model: monaco.editor.createModel(this.draftText, 'markdown'),
          renderLineHighlight: 'none',
          roundedSelection: false,
          wordWrap: 'on'
        })
        resolve()
      })
    })
  }

  insertImage (file) {
    var url = URL.createObjectURL(file)
    this.blobs.push({file, url})

    var newlines = '\n\n'
    if (!this.draftText || this.draftText.endsWith('\n\n')) {
      newlines = ''
    } else if (this.draftText.endsWith('\n')) {
      newlines = '\n'
    }
    this.draftText += `${newlines}![${file.name.replace(/]/g, '')}](${url})\n`
    this.editor.setValue(this.draftText)
    this.editor.setPosition({column: 0, lineNumber: this.editor.getModel().getLineCount()})
  }

  // rendering
  // =

  render () {
    const mustBePrivate = this.mustBePrivate
    const navItem = (id, label) => html`
      <a
        class=${this.currentView === id ? 'current' : ''}
        @click=${e => { this.currentView = id }}
      >${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <link rel="stylesheet" href="beaker://assets/vs/editor/editor.main.css">
      <form @submit=${this.onSubmit}>
        <nav>
          ${navItem('edit', 'Write')}
          ${navItem('preview', 'Preview')}
        </nav>

        <div class="view">
          ${this.isEmpty ? html`<div class="placeholder">${this.placeholder}</div>` : ''}
          <div class="editor ${this.currentView === 'edit' ? '' : 'hidden'}" @contextmenu=${this.onContextmenu}></div>
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
    if (!this.draftText) { 
      return html`<div class="preview"><small><span class="fas fa-fw fa-info"></span> You can use Markdown to format your post.</small></div>`
    }
    return html`
      <div class="preview markdown">
        ${unsafeHTML(beaker.markdown.toHTML(this.draftText))}
      </div>
    `
  }

  async firstUpdated () {
    await this.createEditor()
    this.editor.focus()
    this.editor.onDidChangeModelContent(e => {
      this.draftText = this.editor.getValue()
    })
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

  async onContextmenu (e) {
    var choice = await beaker.browser.showContextMenu([
      {id: 'cut', label: 'Cut'},
      {id: 'copy', label: 'Copy'},
      {id: 'paste', label: 'Paste'},
      {type: 'separator'},
      {id: 'selectAll', label: 'Select All'},
      {type: 'separator'},
      {id: 'undo', label: 'Undo'},
      {id: 'redo', label: 'Redo'},
    ])
    switch (choice) {
      case 'cut':
      case 'copy':
      case 'paste':
        this.editor.focus()
        document.execCommand(choice)
        break
      case 'selectAll':
        this.editor.setSelection(this.editor.getModel().getFullModelRange())
        break
      case 'undo':
      case 'redo':
        this.editor.trigger('contextmenu', choice)
        break
    }
  }

  onClickAddImage (e) {
    e.preventDefault()
    this.currentView = 'edit'
    this.shadowRoot.querySelector('.image-select').click()
  }

  onChangeImage (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    this.insertImage(file)
  }

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
    this.draftText = ''
    this.currentView = 'edit'
    this.dispatchEvent(new CustomEvent('cancel'))
    _currentComposer = undefined
  }

  async onSubmit (e) {
    e.preventDefault()
    e.stopPropagation()

    if (!this.draftText) {
      return
    }

    if (!this.profile) {
      throw new Error('.profile is missing')
    }

    var driveUrl = this.visibility === 'private' ? 'hyper://private' : this.profile.url
    var drive = beaker.hyperdrive.drive(driveUrl)
    var filename = '' + Date.now()
    var folder = ''
    var postBody = this.draftText
    if (this.subject || this.parent) {
      folder = '/comments/'
    } else {
      folder = '/microblog/'
    }

    // write all images to the drive and replace their URLs in the post
    var i = 1
    var blobsToWrite = this.blobs.filter(b => this.draftText.includes(b.url))
    for (let blob of blobsToWrite) {
      let ext = blob.file.name.split('.').pop()
      let path = `${folder}${filename}-${i++}.${ext}`

      let buf = await blob.file.arrayBuffer()
      await drive.writeFile(path, buf)

      let url = joinPath(driveUrl, path)
      while (postBody.includes(blob.url)) {
        postBody = postBody.replace(blob.url, url)
      }
    }

    if (this.subject || this.parent) {
      let subject = this.subject
      let parent = this.parent
      if (subject === parent) parent = undefined // not needed
      await drive.writeFile(`${folder}${filename}.md`, postBody, {
        metadata: {
          'beaker/subject': subject,
          'beaker/parent': parent
        }
      })
    } else {
      await drive.writeFile(`${folder}${filename}.md`, postBody)
    }
    
    this.draftText = ''
    this.currentView = 'edit'
    var url = joinPath(driveUrl, `${folder}${filename}.md`)
    this.dispatchEvent(new CustomEvent('publish', {detail: {url}}))
    _currentComposer = undefined
  }
}

customElements.define('beaker-post-composer', PostComposer)

// handles image-pasting
function onGlobalPaste (e) {
  if (!_currentComposer || !_currentComposer.editor) {
    return
  }
  var editor = _currentComposer.editor
  if (editor.hasTextFocus()) {
    let items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      let matches = items[i].type.match(/^image\/(png|jpg|jpeg|gif)$/i)
      if (matches) {
        _currentComposer.insertImage(items[i].getAsFile())
      }
    }
  }
}