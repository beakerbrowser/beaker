/* globals customElements */
import { LitElement, html } from '../vendor/lit-element/lit-element'
import prettyHash from 'pretty-hash'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'

const STATES = {
  READY: 0,
  DOWNLOADING: 1,
  FORKING: 2
}

class ForkArchiveModal extends LitElement {
  static get properties () {
    return {
      state: {type: Number},
      title: {type: String},
      description: {type: String}
    }
  }

  constructor () {
    super()

    // internal state
    this.archiveInfo = null
    this.state = STATES.READY

    // params
    this.cbs = null
    this.url = ''
    this.title = ''
    this.description = ''
    this.type = null
    this.links = null
    this.networked = true

    // export interface
    window.forkArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.forkArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
  }

  async init (params, cbs) {
    // store params
    this.cbs = cbs
    this.url = params.url
    this.title = params.title || ''
    this.description = params.description || ''
    this.type = params.type
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    await this.requestUpdate()

    // fetch archive info
    this.url = await bg.datArchive.resolveName(params.url)
    this.archiveInfo = await bg.datArchive.getInfo(this.url)
    if (!this.title) this.title = this.archiveInfo.title
    if (!this.description) this.description = this.archiveInfo.description
    await this.requestUpdate()

    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    if (!this.archiveInfo) {
      return this.renderLoading()
    }

    var progressEl
    var actionBtn
    switch (this.state) {
      case STATES.READY:
        progressEl = html`<div class="fork-dat-progress">Ready to copy.</div>`
        actionBtn = html`<button type="submit" class="btn success" tabindex="5">Create copy</button>`
        break
      case STATES.DOWNLOADING:
        progressEl = html`<div class="fork-dat-progress">Downloading remaining files...</div>`
        actionBtn = html`<button type="submit" class="btn" disabled tabindex="5"><span class="spinner"></span></button>`
        break
      case STATES.FORKING:
        progressEl = html`<div class="fork-dat-progress">Forking...</div>`
        actionBtn = html`<button type="submit" class="btn" disabled tabindex="5"><span class="spinner"></span></button>`
        break
    }

    return html`
      <div class="wrapper">
        <h1 class="title">Make a copy of ${this.archiveInfo.title ? `"${this.archiveInfo.title}"` : prettyHash(this.archiveInfo.key)}</h1>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input name="title" tabindex="2" value="${this.title}" placeholder="Title" @change=${this.onChangeTitle} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description}</textarea>

          ${progressEl}

          <div class="form-actions">
            <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
            ${actionBtn}
          </div>
        </form>
      </div>
    `
  }

  renderLoading () {
    return html`
      <div class="wrapper">
        <h1 class="title">Make a copy</h1>
        <p class="help-text">Loading...</p>
        <form>
          <label for="title">Title</label>
          <input name="title" tabindex="2" placeholder="Title" disabled />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" disabled></textarea>

          <div class="form-actions">
            <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
            <button type="submit" class="btn" tabindex="5" disabled>Create copy</button>
          </div>
        </form>
      </div>
    `
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.description = e.target.value
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    e.preventDefault()

    this.state = STATES.DOWNLOADING
    await bg.datArchive.download(this.url)

    this.state = STATES.FORKING
    try {
      var url = await bg.datArchive.forkArchive(this.url, {
        title: this.title,
        description: this.description,
        type: this.type,
        networked: this.networked,
        links: this.links,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}
ForkArchiveModal.styles = [commonCSS, inputsCSS, buttonsCSS, spinnerCSS]

customElements.define('fork-archive-modal', ForkArchiveModal)