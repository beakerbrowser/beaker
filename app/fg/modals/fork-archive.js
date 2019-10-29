/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
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
      description: {type: String},
      visibility: {type: String}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }
    
    form {
      padding: 14px 20px;
      margin: 0;
    }

    input {
      font-size: 14px;
      height: 34px;
      padding: 0 10px;
      border-color: #bbb;
    }

    textarea {
      font-size: 14px;
      padding: 7px 10px;
      border-color: #bbb;
    }
    
    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .form-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    `]
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
    this.author = null

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
    this.author = this.author || (await bg.users.getCurrent()).url
    this.links = params.links
    this.networked = ('networked' in params) ? params.networked : true
    await this.requestUpdate()

    // fetch archive info
    this.url = await bg.datArchive.resolveName(params.url)
    this.archiveInfo = await bg.datArchive.getInfo(this.url)
    if (!this.title) this.title = this.archiveInfo.title
    if (!this.description) this.description = this.archiveInfo.description
    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
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
        progressEl = html`<div class="fork-dat-progress">Ready to fork.</div>`
        actionBtn = html`<button type="submit" class="btn primary" tabindex="5">Create fork</button>`
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
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">Make a fork of ${this.archiveInfo.title ? `"${this.archiveInfo.title}"` : prettyHash(this.archiveInfo.key)}</h1>

        <form @submit=${this.onSubmit}>
          <label for="title">Title</label>
          <input name="title" tabindex="2" value="${this.title}" @change=${this.onChangeTitle} />
          
          <details @toggle=${e => this.adjustHeight()}>
            <summary><label for="desc">Description</label></summary>
            <textarea name="desc" tabindex="3" @change=${this.onChangeDescription}>${this.description}</textarea>
          </details>

          <hr>

          <div class="form-actions">
            ${progressEl}
            <div>
              <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
              ${actionBtn}
            </div>
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

          <details @toggle=${e => this.adjustHeight()}>
            <summary><label for="desc">Description</label></summary>
            <textarea name="desc" tabindex="3" placeholder="Description (optional)" disabled></textarea>
          </details>

          <hr>

          <div class="form-actions">
            <div></div>
            <div>
              <button type="button" class="btn cancel" @click=${this.onClickCancel} tabindex="4">Cancel</button>
              <button type="submit" class="btn" tabindex="5" disabled>Create copy</button>
            </div>
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
        author: this.author,
        links: this.links,
        prompt: false
      })
      this.cbs.resolve({url})
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('fork-archive-modal', ForkArchiveModal)