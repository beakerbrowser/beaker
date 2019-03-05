/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import {shortenHash} from '../lib/strings'

const VIEWS = {
  SELECT: 0,
  CREATE: 1
}

class SelectArchiveModal extends LitElement {
  static get properties () {
    return {
      currentView: {type: Number},
      currentTitleFilter: {type: String},
      title: {type: String},
      description: {type: String},
      selectedArchiveKey: {type: String}
    }
  }

  constructor () {
    super()

    // state
    this.currentView = VIEWS.SELECT
    this.currentTitleFilter = ''
    this.title = ''
    this.description = ''
    this.selectedArchiveKey = ''
    this.archives = []

    // params
    this.customTitle = ''
    this.buttonLabel = 'Select'
    this.type = null
    this.cbs = null

    // export interface
    window.selectArchiveClickSubmit = () => this.shadowRoot.querySelector('button[type="submit"]').click()
    window.selectArchiveClickCancel = () => this.shadowRoot.querySelector('.cancel').click()
    window.window.selectArchiveClickNewArchive = () => {
      this.shadowRoot.querySelector('.btn[data-content="newArchive"]').click()
      return this.requestUpdate()
    }
    window.selectArchiveClickItem = (key) => {
      this.shadowRoot.querySelector(`li[data-key="${key}"]`).click()
      this.selectedArchiveKey = key
      return this.requestUpdate()
    }
    window.selectArchiveClickAnyItem = () => {
      this.shadowRoot.querySelector(`li[data-key]`).click()
      this.selectedArchiveKey = this.archives[0].key
      return this.requestUpdate()
    }
    window.window.selectArchiveSetValueTitle = (v) => {
      this.shadowRoot.querySelector('input[name="title"]').value = v
      this.title = v
    }
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.customTitle = params.title || ''
    this.buttonLabel = params.buttonLabel || 'Select'
    this.type = params.filters && params.filters.type
    await this.requestUpdate()

    this.archives = await bg.archives.list({
      isSaved: true,
      isOwner: (params.filters && params.filters.isOwner),
      type: this.type
    })
    this.type = params.filters && params.filters.type
    this.archives.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        ${this.currentView === VIEWS.SELECT
          ? this.renderSelect()
          : this.renderCreate()}
      </div>
    `
  }

  renderSelect () {
    return html`
      <form @submit=${this.onSubmit}>
        <h1 class="title">${this.customTitle || 'Select an archive'}</h1>

        <div class="view archive-picker">
          <div class="filter-container">
            <i class="fa fa-search"></i>
            <input autofocus @keyup=${this.onChangeTitleFilter} id="filter" class="filter" type="text" placeholder="Search">
          </div>
          ${this.renderArchivesList()}
          ${this.renderTypeFilter()}
        </div>

        <div class="form-actions">
          <div class="left">
            <button type="button" @click=${this.onClickGotoCreateView} data-content="newArchive" class="btn">
              Create new archive
            </button>
          </div>
          <div class="right">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button ?disabled=${!this.selectedArchiveKey} type="submit" class="btn primary" tabindex="5">
              ${this.buttonLabel}
            </button>
          </div>
        </div>
      </form>`
  }

  renderCreate () {
    return html`
      <form @submit=${this.onSubmit}>
        <h1 class="title">${this.customTitle || 'Select an archive'}</h1>
        <div class="view create-archive">
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} />

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>
        </div>

        <div class="form-actions">
          <div class="left">
            <button type="button" @click=${this.onClickGotoSelectView} data-content="archivePicker" class="btn">
              <i class="fa fa-caret-left"></i> Back
            </button>
          </div>
          <div class="right">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button type="submit" class="btn primary" tabindex="5">
              Create
            </button>
          </div>
        </div>
      </form>`
  }

  renderTypeFilter () {
    if (!this.type) return ''
    var types = Array.isArray(this.type) ? this.type : [this.type]
    return html`
      <div class="type-container">
        <strong>Type:</strong> ${types.join(', ')}
      </div>`
  }

  renderArchivesList () {
    var filtered = this.archives
    if (this.currentTitleFilter) {
      filtered = filtered.filter(a => a.title && a.title.toLowerCase().includes(this.currentTitleFilter))
    }

    if (!filtered.length) {
      return html`<ul class="archives-list"><li class="empty">No archives found</li></ul>`
    }

    return html`<ul class="archives-list">${filtered.map(a => this.renderArchive(a))}</ul>`
  }

  renderArchive (archive) {
    var isSelected = this.selectedArchiveKey === archive.key
    return html`
      <li
        class="archive ${isSelected ? 'selected' : ''}"
        @click=${this.onChangeSelectedArchive}
        @dblclick=${this.onDblClickArchive}
        data-key=${archive.key}
      >
        <div class="info">
          <img class="favicon" src="beaker-favicon:${archive.url}" />

          <span class="title" title="${archive.title} ${archive.isOwner ? '' : '(Read-only)'}">
            ${archive.title || 'Untitled'}
          </span>

          ${archive.isOwner ? '' : html`<span class="readonly">read-only</span>`}

          <span class="hash">${shortenHash(archive.url)}</span>
        </div>
      </li>
    `
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.selectedArchiveKey = ''
    this.title = e.target.value
  }

  onChangeDescription (e) {
    this.selectedArchiveKey = ''
    this.description = e.target.value
  }

  onChangeTitleFilter (e) {
    this.currentTitleFilter = e.target.value.toLowerCase()
  }

  onChangeSelectedArchive (e) {
    this.selectedArchiveKey = e.currentTarget.dataset.key
  }

  onDblClickArchive (e) {
    e.preventDefault()
    this.selectedArchiveKey = e.currentTarget.dataset.key
    this.onSubmit()
  }

  async onClickGotoCreateView (e) {
    this.currentView = VIEWS.CREATE
    await this.updateComplete
    this.adjustHeight()
  }

  async onClickGotoSelectView (e) {
    this.currentView = VIEWS.SELECT
    await this.updateComplete
    this.adjustHeight()
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    if (e) e.preventDefault()
    if (this.currentView === VIEWS.CREATE) {
      try {
        var url = await bg.datArchive.createArchive({
          title: this.title,
          description: this.description,
          type: this.type,
          prompt: false
        })
        this.cbs.resolve({url})
      } catch (e) {
        this.cbs.reject(e.message || e.toString())
      }
    } else {
      this.cbs.resolve({url: `dat://${this.selectedArchiveKey}`})
    }
  }
}
SelectArchiveModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.form-actions {
  display: flex;
  text-align: left;
}

.form-actions .left {
  flex: 1;
}

.form-actions .btn.cancel {
  margin-right: 5px;
}

h1.title {
  border: 0;
  margin: 10px 0;
}

.archive-picker {
  overflow: hidden;
  margin-bottom: 15px;
}

.archive-picker .filter-container {
  position: relative;
  margin: 10px 0;
  overflow: visible;
  height: 40px;
}

.archive-picker .filter-container i {
  position: absolute;
  left: 15px;
  top: 13px;
  color: #b8b8b8;
  z-index: 3;
}

.archive-picker .type-container {
  margin-top: 10px;
  background: #eee;
  padding: 10px;
  border-radius: 4px;
}

.archive-picker .filter {
  position: absolute;
  left: 0;
  top: 0;
  border: 0;
  margin: 0;
  height: 35px;
  padding: 0 35px;
  border-radius: 0;
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.archive-picker .filter:focus {
  background: #fff;
  border: 1.5px solid rgba(40, 100, 220, 0.8);
  box-shadow: none;
}

.archives-list {
  height: 350px;
  overflow-y: auto;
  border: 1px solid #ddd;
}

.archives-list .empty {
  padding: 5px 10px;
  color: gray;
}

.archives-list .archive {
  padding: 4px 10px;
}

.archives-list .archive:nth-child(even) {
  background: #f7f7f7;
}

.archives-list .archive .info {
  display: flex;
  width: 100%;
  align-items: center;
}

.archives-list .archive .info .favicon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
}

.archives-list .archive .info .title {
  flex: 1;
}

.archives-list .archive .info .readonly {
  font-size: 9.5px;
  padding: 0 5px;
  margin-right: 5px;
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  text-transform: uppercase;
  color: #707070;
  white-space: nowrap;
}

.archives-list .archive .info .hash {
  color: rgba(0, 0, 0, 0.55);
  margin-left: auto;
  width: 100px;
}

.archives-list .archive:hover {
  background: #f0f0f0;
}

.archives-list .archive.selected {
  background: #2864dc;
  color: #fff;
}

.archives-list .archive.selected .info .hash,
.archives-list .archive.selected .info .readonly {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 100;
}

.create-archive {
  height: 250px;
}

.create-archive textarea {
  height: 97px;
}
`]

customElements.define('select-archive-modal', SelectArchiveModal)