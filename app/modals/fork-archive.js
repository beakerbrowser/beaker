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

const VISIBILITY_OPTIONS = [
  {icon: html`<span class="fa-fw fas fa-bullhorn"></span>`, label: 'Public', value: 'public', desc: 'Anybody can access the site'},
  {icon: html`<span class="fa-fw fas fa-lock"></span>`, label: 'Private', value: 'private', desc: 'Only you can access the site'},
  {icon: html`<span class="fa-fw fas fa-eye"></span>`, label: 'Secret', value: 'unlisted', desc: 'Only people who know the URL can access the site'},
]

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

    .visibility {
      border: 1px solid #ddd;
      margin-bottom: 10px;
      margin-top: 5px;
    }

    .visibility .option {
      display: flex;
      padding: 10px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      color: rgba(0,0,0,.5);
    }

    .visibility .option:last-child {
      border: 0;
    }

    .visibility .option:hover {
      color: rgba(0,0,0,.65);
      background: #fafafa;
    }

    .visibility .option.selected {
      color: rgba(0,0,0,.75);
      outline: 1px solid gray;
    }

    .visibility .option > span {
      margin: 2px 10px 0 4px;
    }

    .visibility .option-label {
      font-weight: 500;
      margin-bottom: 2px;
    }

    .visibility .option-desc {
      font-weight: 400;
    }

    .visibility .option .fa-check-circle {
      visibility: hidden;
      margin: 2px 2px 0 auto;
      color: #333;
      font-size: 14px;
      align-self: center;
    }

    .visibility .option.selected .fa-check-circle {
      visibility: visible;
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
    this.visibility = 'public'

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
    this.visibility = params.visibility || 'public'
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

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" @change=${this.onChangeDescription}>${this.description}</textarea>

          <label>Visibility</label>
          <div class="visibility">
            ${VISIBILITY_OPTIONS.map(opt => html`
              <div
                class=${classMap({option: true, selected: opt.value === this.visibility})}
                @click=${e => this.onChangeVisibility(e, opt.value)}
              >
                <span>${opt.icon}</span>
                <div>
                  <div class="option-label">${opt.label}</div>
                  <div class="option-desc">${opt.desc}</div>
                </div>
                <span class="fas fa-fw fa-check-circle"></span>
              </div>
            `)}
          </div>

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

  onChangeVisibility (e, value) {
    this.visibility = value
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
        visibility: this.visibility,
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