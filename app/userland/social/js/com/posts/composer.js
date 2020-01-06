import {LitElement, html} from '../../../vendor/lit-element/lit-element.js'
import composerCSS from '../../../css/com/posts/composer.css.js'
import { toNiceTopic, ucfirst } from '../../lib/strings.js'
import * as uwg from '../../lib/uwg.js'
import * as toast from '../toast.js'

const TOPIC_LIMIT = 30

export class PostComposer extends LitElement {
  static get properties () {
    return {
      type: {type: String},
      validation: {type: Object},
      topics: {type: Array},
      file: {type: Object}
    }
  }

  constructor () {
    super()
    let qp = new URLSearchParams(location.search)
    this.type = qp.get('type') || 'link'
    this.validation = {}
    this.topics = []
    this.file = undefined

    if (location.search && location.search.includes('compose')) {
      // TODO
      // let params = new URLSearchParams(location.search)
      // this.draftText = params.get('body')
      // this.requestUpdate().then(_ => {
      //   this.shadowRoot.querySelector('textarea').focus()
      // })
    }
  }

  async load () {
    this.topics = await uwg.topics.list()
  }

  setType (type) {
    this.type = type
    this.queueValidation()

    let url = new URL(window.location)
    let qp = new URLSearchParams(location.search)
    qp.set('type', type)
    url.search = qp.toString()
    history.replaceState({}, null, url.toString())
  }

  setTopic (topic) {
    this.shadowRoot.querySelector('input#topic').value = topic
    this.runValidation()
  }

  getInputClass (id) {
    if (this.validation[id] && !this.validation[id].unset) {
      return this.validation[id].success ? 'success' : 'error'
    }
    return ''
  }

  queueValidation () {
    clearTimeout(this.qvto)
    this.qvto = setTimeout(this.runValidation.bind(this), 500)
  }

  runValidation () {
    var validation = {}

    // validate standard inputs
    var inputEls = Array.from(this.shadowRoot.querySelectorAll('input, textarea'))
    for (let el of inputEls) {
      if (el.getAttribute('type') === 'file') continue

      let {id, value} = el
      if (value) {
        if (id === 'url') {
          if (!isValidUrl(value)) {
            validation[id] = {success: false, error: 'Please input a valid URL'}
            continue
          }
        }
        validation[id] = {success: true}
      } else {
        validation[id] = {unset: true}
      }
    }

    // validate file input
    if (this.type === 'file') {
      if (!this.file) {
        validation.file = {unset: true}
      } else {
        validation.file = {success: true}
      }
    }

    this.validation = validation
  }

  canSubmit () {
    var inputs = Object.values(this.validation)
    return inputs.length > 0 && inputs.reduce((acc, input) => acc && input.success && !input.unset, true)
  }

  // rendering
  // =

  render () {
    const typeSelector = (id, label) => html`
      <a class=${id === this.type ? 'selected' : ''} @click=${e => this.setType(id)}>${label}</a>
    `
    const input = (id, placeholder) => html`
      <input id=${id} name=${id} class=${this.getInputClass(id)} placeholder=${placeholder} @keyup=${this.queueValidation}>
      ${this.renderValidationError(id)}
    `
    const textarea = (id, placeholder) => html`
      <textarea id=${id} name=${id} class=${this.getInputClass(id)} placeholder=${placeholder} @keyup=${this.queueValidation}></textarea>
      ${this.renderValidationError(id)}
    `
    return html`
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="type-selector">
        ${typeSelector('link', html`<span class="fas fa-fw fa-link"></span> Link`)}
        ${typeSelector('text', html`<span class="far fa-fw fa-comment-alt"></span> Text Post`)}
        ${typeSelector('file', html`<span class="far fa-fw fa-file"></span> File`)}
      </div>
      <form @submit=${this.onSubmitPost}>
        <div class="form-group">
          <div>
            ${input('topic', 'Topic')}
            ${this.topics.slice(0, TOPIC_LIMIT).map(topic => html`
              <a class="topic" @click=${e => this.setTopic(toNiceTopic(topic))}>${toNiceTopic(topic)}</a>
            `)}
          </div>
        </div>
        <div class="form-group">${input('title', 'Title')}</div>
        ${this.type === 'link' ? html`<div class="form-group">${input('url', 'URL')}</div>` : ''}
        ${this.type === 'text' ? html`<div class="form-group">${textarea('content', 'Post body (markdown is supported)')}</div>` : ''}
        ${this.type === 'file' ? this.renderFileInput() : ''}
        <div class="actions">
          <button type="submit" class="btn primary" ?disabled=${!this.canSubmit()}>
            ${this.type === 'link' ? html`<span class="fas fa-fw fa-link"></span> Post Link` : ''}
            ${this.type === 'text' ? html`<span class="far fa-fw fa-comment-alt"></span> Post Text` : ''}
            ${this.type === 'file' ? html`<span class="far fa-fw fa-file"></span> Post File` : ''}
          </button>
        </div>
      </form>
    `
  }

  renderFileInput () {
    var selection = undefined
    if (this.file) {
      selection = html`<div class="selection">${this.file.name}</div>`
    }
    var success = this.validation && this.validation.file && this.validation.file.success
    return html`
      <div class="form-group">
        <input type="file" id="native-file-input" @change=${this.onChooseFileNative}>
        <div class="file-input ${success ? 'success' : ''}">
          ${selection}
          <div>
            Select a ${this.file ? 'different' : ''} file from
            <a href="#" @click=${this.onClickSelectHyperdriveFile}>your hyperdrive</a>
            or
            <a href="#" @click=${this.onClickSelectOSFile}>your OS filesystem</a>
          </div>
        </div>
      </div>
    `
  }

  renderValidationError (id) {
    if (this.validation[id] && this.validation[id].error) {
      return html`<div class="error">${this.validation[id].error}</div>`
    }
  }

  // events
  // =

  async onClickSelectHyperdriveFile (e) {
    e.preventDefault()
    e.stopPropagation()

    var paths = await navigator.selectFileDialog({
      select: ['file'],
      allowMultiple: false,
      disallowCreate: true
    })
    var base64buf = await navigator.filesystem.readFile(paths[0], 'base64')
    this.file = {source: 'hyperdrive', name: paths[0].split('/').pop(), base64buf}
    this.runValidation()
  }

  onClickSelectOSFile (e) {
    e.preventDefault()
    e.stopPropagation()
    this.shadowRoot.querySelector('#native-file-input').click()
  }

  onChooseFileNative (e) {
    var file = e.currentTarget.files[0]
    if (!file) return
    var fr = new FileReader()
    fr.onload = () => {
      var base64buf = fr.result.split(',').pop()
      this.file = {source: 'os', name: file.name, base64buf}
      this.runValidation()
    }
    fr.readAsDataURL(file)
  }

  async onSubmitPost (e) {
    e.preventDefault()
    e.stopPropagation()

    this.runValidation()
    if (!this.canSubmit()) return

    const getValue = id => this.shadowRoot.querySelector(`#${id}`).value

    var path
    try {
      if (this.type === 'link') {
        path = await uwg.posts.addLink({
          topic: getValue('topic'),
          title: getValue('title'),
          href: getValue('url')
        })
      } else if (this.type === 'text') {
        path = await uwg.posts.addTextPost({
          topic: getValue('topic'),
          title: getValue('title'),
          content: getValue('content')
        })
      } else if (this.type === 'file') {
        let ext = this.file.name.split('.').pop().toLowerCase()
        if (this.file.name.indexOf('.') === -1) ext = 'txt'
        path = await uwg.posts.addFile({
          topic: getValue('topic'),
          title: getValue('title'),
          ext,
          base64buf: this.file.base64buf
        })
      }
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.error(e)
      return
    }

    toast.create(`${ucfirst(this.type)} posted`)
    var user = await navigator.filesystem.stat('/profile')
    // TODO should use user id instead of mount key
    window.location = `/${user.mount.key}${path.slice('/profile'.length)}`
  }
}
PostComposer.styles = composerCSS

customElements.define('beaker-post-composer', PostComposer)

function isValidUrl (v) {
  try {
    let url = new URL(v)
    return true
  } catch (e) {
    return false
  }
}