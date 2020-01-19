/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'
import { shortenHash, getHostname } from '../../lib/strings'

const VIEWS = {
  SELECT: 0,
  CREATE: 1
}

class SelectDriveModal extends LitElement {
  static get properties () {
    return {
      currentView: {type: Number},
      currentTitleFilter: {type: String},
      title: {type: String},
      description: {type: String},
      selectedDriveUrl: {type: String}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, css`
      .wrapper,
      form {
        padding: 0;
        margin: 0;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .form-actions {
        display: flex;
        padding: 0px 15px 10px;
        text-align: left;
      }

      .form-actions .left {
        flex: 1;
      }

      .form-actions .btn.cancel {
        margin-right: 5px;
      }

      h1.title {
        padding: 14px 20px;
        margin: 0;
        border-color: #bbb;
      }

      .view {
        overflow: hidden;
        padding: 10px 15px;
      }

      .drive-picker .filter-container {
        position: relative;
        margin: 0 0 10px;
        overflow: visible;
        height: 40px;
      }

      .drive-picker .filter-container i {
        position: absolute;
        left: 15px;
        top: 13px;
        color: #b8b8b8;
        z-index: 3;
      }

      .drive-picker .type-container {
        margin-top: 10px;
        background: #eee;
        padding: 10px;
        border-radius: 4px;
      }

      .drive-picker .filter {
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

      .drive-picker .filter:focus {
        background: #fff;
        border: 1.5px solid rgba(40, 100, 220, 0.8);
        box-shadow: none;
      }

      .drives-list {
        height: 350px;
        overflow-y: auto;
        border: 1px solid #ddd;
      }

      .drives-list .loading {
        display: flex;
        padding: 10px;
        align-items: center;
        color: gray;
      }

      .drives-list .loading .spinner {
        margin-right: 5px;
      }

      .drives-list .empty {
        padding: 5px 10px;
        color: gray;
      }

      .drives-list .drive {
        padding: 4px 10px;
      }

      .drives-list .drive:nth-child(even) {
        background: #f7f7f7;
      }

      .drives-list .drive .info {
        display: flex;
        width: 100%;
        align-items: center;
      }

      .drives-list .drive .info .favicon {
        width: 16px;
        height: 16px;
        margin-right: 5px;
      }

      .drives-list .drive .info .title {
        flex: 1;
      }

      .drives-list .drive .info .readonly {
        font-size: 9.5px;
        padding: 0 5px;
        margin-right: 5px;
        border: 1px solid #d9d9d9;
        border-radius: 2px;
        text-transform: uppercase;
        color: #707070;
        white-space: nowrap;
      }

      .drives-list .drive .info .hash {
        color: rgba(0, 0, 0, 0.55);
        margin-left: auto;
        width: 100px;
      }

      .drives-list .drive:hover {
        background: #f0f0f0;
      }

      .drives-list .drive.selected {
        background: #2864dc;
        color: #fff;
      }

      .drives-list .drive.selected .info .hash,
      .drives-list .drive.selected .info .readonly {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 100;
      }

      .create-drive {
        height: 250px;
      }

      .create-drive textarea {
        height: 97px;
      }
    `]
  }

  constructor () {
    super()

    // state
    this.currentView = VIEWS.SELECT
    this.currentTitleFilter = ''
    this.title = ''
    this.description = ''
    this.selectedDriveUrl = ''
    this.drives = undefined

    // params
    this.customTitle = ''
    this.buttonLabel = 'Select'
    this.type = null
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.customTitle = params.title || ''
    this.buttonLabel = params.buttonLabel || 'Select'
    this.type = params.type
    await this.requestUpdate()
    this.adjustHeight()

    var entries = await bg.hyperdrive.query(bg.navigatorFs.get().url, {
      path: '/system/drives/*',
      type: 'mount',
      sort: 'name'
    }).catch(err => [])
    this.drives = await Promise.all(entries.map(entry => bg.hyperdrive.getInfo(entry.mount)))
    if (params.type) this.drives = this.drives.filter(drive => drive.type === params.type)
    if (typeof params.writable === 'boolean') {
      this.drives = this.drives.filter(drive => drive.writable === params.writable)
    }
    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  get hasValidSelection () {
    return !!this.selectedDriveUrl || isDriveUrl(this.currentTitleFilter)
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
        <h1 class="title">${this.customTitle || 'Select a drive'}</h1>

        <div class="view drive-picker">
          ${this.renderTypeFilter()}
          <div class="filter-container">
            <i class="fa fa-search"></i>
            <input autofocus @keyup=${this.onChangeTitleFilter} id="filter" class="filter" type="text" placeholder="Search or input the URL of a drive">
          </div>
          ${this.renderDrivesList()}
        </div>

        <div class="form-actions">
          <div class="left">
            <button type="button" @click=${this.onClickGotoCreateView} data-content="newdrive" class="btn">
              Create new drive
            </button>
          </div>
          <div class="right">
            <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
            <button ?disabled=${!this.hasValidSelection} type="submit" class="btn primary" tabindex="5">
              ${this.buttonLabel}
            </button>
          </div>
        </div>
      </form>`
  }

  renderCreate () {
    const typeopt = (id, label) => html`<option value=${id} ?selected=${id === this.type}>${label}</option>`
    return html`
      <form @submit=${this.onSubmit}>
        <h1 class="title">${this.customTitle || 'Select a drive'}</h1>
        <div class="view create-drive">
          <label for="title">Title</label>
          <input autofocus name="title" tabindex="2" value=${this.title || ''} placeholder="Title" @change=${this.onChangeTitle} />

          <label for="type">Type</label>
          <div style="margin: 5px 0 15px">
            <select name="type" @change=${this.onChangeType}>
              <optgroup label="Files">
                ${typeopt('undefined', 'Files drive')}
              </optgroup>
              <optgroup label="Media">
                ${typeopt('website', 'Website')}
              </optgroup>
              <optgroup label="Advanced">
                ${typeopt('application', 'Application')}
                ${typeopt('webterm.sh/cmd-pkg', 'Webterm Command')}
              </optgroup>
            </select>
          </div>

          <label for="desc">Description</label>
          <textarea name="desc" tabindex="3" placeholder="Description (optional)" @change=${this.onChangeDescription}>${this.description || ''}</textarea>
        </div>

        <div class="form-actions">
          <div class="left">
            <button type="button" @click=${this.onClickGotoSelectView} data-content="drivePicker" class="btn">
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

  renderDrivesList () {
    if (!this.drives) {
      return html`<ul class="drives-list"><li class="loading"><span class="spinner"></span> Loading...</li></ul>`
    }

    var filtered = this.drives
    if (this.currentTitleFilter) {
      filtered = filtered.filter(a => a.title && a.title.toLowerCase().includes(this.currentTitleFilter))
    }

    if (!filtered.length) {
      if (isDriveUrl(this.currentTitleFilter)) {
        return html`<ul class="drives-list"><li class="empty">This URL is a valid drive (${getHostname(this.currentTitleFilter)})</li></ul>`
      }
      return html`<ul class="drives-list"><li class="empty">No drives found</li></ul>`
    }

    return html`<ul class="drives-list">${filtered.map(a => this.renderDrive(a))}</ul>`
  }

  renderDrive (drive) {
    var isSelected = this.selectedDriveUrl === drive.url
    return html`
      <li
        class="drive ${isSelected ? 'selected' : ''}"
        @click=${this.onChangeSelecteddrive}
        @dblclick=${this.onDblClickdrive}
        data-url=${drive.url}
      >
        <div class="info">
          <img class="favicon" src="beaker-favicon:${drive.url}" />

          <span class="title" title="${drive.title} ${drive.writable ? '' : '(Read-only)'}">
            ${drive.title || 'Untitled'}
          </span>

          ${drive.writable ? '' : html`<span class="readonly">read-only</span>`}

          <span class="hash">${shortenHash(drive.url)}</span>
        </div>
      </li>
    `
  }

  // event handlers
  // =

  onChangeTitle (e) {
    this.selectedDriveUrl = ''
    this.title = e.target.value
  }

  onChangeType (e) {
    this.selectedDriveUrl = ''
    this.type = e.target.value
  }

  onChangeDescription (e) {
    this.selectedDriveUrl = ''
    this.description = e.target.value
  }

  onChangeTitleFilter (e) {
    this.currentTitleFilter = e.target.value.toLowerCase()
    if (this.selectedDriveUrl && isDriveUrl(this.currentTitleFilter)) {
      this.selectedDriveUrl = undefined
    }
  }

  onChangeSelecteddrive (e) {
    this.selectedDriveUrl = e.currentTarget.dataset.url
  }

  onDblClickdrive (e) {
    e.preventDefault()
    this.selectedDriveUrl = e.currentTarget.dataset.url
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
        var url = await bg.hyperdrive.createDrive({
          title: this.title,
          description: this.description,
          type: this.type !== 'undefined' ? this.type : undefined,
          prompt: false
        })
        this.cbs.resolve({url})
      } catch (e) {
        this.cbs.reject(e.message || e.toString())
      }
    } else {
      this.cbs.resolve({url: this.selectedDriveUrl ? this.selectedDriveUrl : (new URL(this.currentTitleFilter)).origin})
    }
  }
}

customElements.define('select-drive-modal', SelectDriveModal)

function isDriveUrl (v = '') {
  try {
    var urlp = new URL(v)
    return urlp.protocol === 'drive:'
  } catch (e) {
    return false
  }
}
