/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'
import spinnerCSS from './spinner.css'

class SelectDriveModal extends LitElement {
  static get properties () {
    return {
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
        overflow: visible;
        height: 35px;
        margin-bottom: 4px;
      }

      .drive-picker .filter-container i {
        position: absolute;
        left: 15px;
        top: 13px;
        color: #b8b8b8;
        z-index: 3;
      }

      .drive-picker .type-container {
        margin-bottom: 10px;
        background: #eee;
        padding: 10px;
      }

      .drive-picker .filter {
        position: absolute;
        left: 0;
        top: 0;
        border: 0;
        margin: 0;
        height: 35px;
        padding: 0 35px;
        border: 1px solid #dde;
        border-radius: 0;
      }

      .drive-picker .filter:focus {
        background: #fff;
        border: 1.5px solid rgba(40, 100, 220, 0.8);
        box-shadow: none;
      }

      .drives-list {
        height: 350px;
        overflow-y: auto;
        border: 1px solid #dde;
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
        display: flex;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #dde;
      }

      .drives-list .drive:last-child {
        border-bottom: 0;
      }

      .drive .thumb {
        display: block;
        width: 32px;
        height: 32px;
        margin-right: 16px;
      }

      .drives-list .drive .info {
        flex: 1;
      }
      
      .drives-list .drive .title {
        font-size: 15px;
        font-weight: 500;
      }
      
      .drives-list .drive .description {
        letter-spacing: -0.2px;
      }

      .drives-list .drive.selected {
        background: #2864dc;
        color: #fff;
      }

      .drives-list .drive.selected .thumb {
        border-radius: 4px;
        box-shadow: 0 1px 2px #0003;
      }

      .drives-list .drive.selected .info .hash,
      .drives-list .drive.selected .info .readonly {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 100;
      }
    `]
  }

  constructor () {
    super()

    // state
    this.currentTitleFilter = ''
    this.selectedDriveUrl = ''
    this.drives = undefined

    // params
    this.customTitle = ''
    this.buttonLabel = 'Select'
    this.type = null
    this.writable = undefined
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.customTitle = params.title || ''
    this.buttonLabel = params.buttonLabel || 'Select'
    this.type = params.type
    this.writable = params.writable
    await this.requestUpdate()
    this.adjustHeight()

    this.drives = await bg.drives.list({includeSystem: true})

    // move forks onto their parents
    this.drives = this.drives.filter(drive => {
      if (drive.forkOf) {
        let parent = this.drives.find(d => d.key === drive.forkOf.key)
        if (parent) {
          parent.forks = parent.forks || []
          parent.forks.push(drive)
          return false
        }
      }
      return true
    })
    this.drives.sort((a, b) => (a.info.type || '').localeCompare(b.info.type || '') || (a.info.title).localeCompare(b.info.title))

    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
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
        <form @submit=${this.onSubmit}>
          <h1 class="title">${this.customTitle || 'Select a drive'}</h1>

          <div class="view drive-picker">
            ${this.renderFilters()}
            <div class="filter-container">
              <i class="fa fa-search"></i>
              <input @keyup=${this.onChangeTitleFilter} id="filter" class="filter" type="text" placeholder="Search or enter the URL of a drive">
            </div>
            ${isDriveUrl(this.currentTitleFilter) ? html`
            ` : html`
              ${this.renderDrivesList()}
            `}
          </div>

          <div class="form-actions">
            <div class="left">
              <button type="button" @click=${this.onClickCreate} data-content="newdrive" class="btn">
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
        </form>
      </div>
    `
  }

  renderFilters () {
    if (!this.type && typeof this.writable === 'undefined') return ''
    return html`
      <div class="type-container">
        <strong>
          ${typeof this.writable !== 'undefined' ? html`
            ${this.writable ? 'Editable' : 'Read-only'}
          ` : ''}
          ${this.type ? Array.isArray(this.type) ? this.type.join(', ') : this.type : ''}
          only
        </strong>
      </div>`
  }

  renderDrivesList () {
    if (!this.drives) {
      return html`<ul class="drives-list"><li class="loading"><span class="spinner"></span> Loading...</li></ul>`
    }

    var filtered = this.drives
    if (this.type) filtered = filtered.filter(drive => drive.info.type === this.type)
    if (typeof this.writable === 'boolean') {
      filtered = filtered.filter(drive => drive.info.writable === this.writable)
    }
    if (this.currentTitleFilter) {
      filtered = filtered.filter(a => a.info.title && a.info.title.toLowerCase().includes(this.currentTitleFilter))
    }

    if (!filtered.length) {
      return html`<div class="drives-list"><div class="empty">No drives found</div></div>`
    }

    return html`<div class="drives-list">${filtered.map(a => this.renderDrive(a))}</div>`
  }

  renderDrive (drive) {
    var isSelected = this.selectedDriveUrl === drive.url
    return html`
      <div
        class="drive ${isSelected ? 'selected' : ''}"
        @click=${this.onChangeSelecteddrive}
        @dblclick=${this.onDblClickdrive}
        data-url=${drive.url}
      >
        <img
          class="thumb"
          srcset="
            beaker://assets/img/drive-types/files.png 1x,
            beaker://assets/img/drive-types/files-64.png 2x
          "
        >
        <div class="info">
          <div class="title">
            ${drive.info.title || html`<em>Untitled</em>`}
          </div>
          <div class="details">
            <div class="description">${drive.info.description.slice(0, 60)}</div>
          </div>
        </div>
      </div>
    `
  }

  // event handlers
  // =

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

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  onClickCreate (e) {
    this.cbs.resolve({gotoCreate: true})
  }

  onSubmit (e) {
    if (e) e.preventDefault()
    this.cbs.resolve({url: this.selectedDriveUrl ? this.selectedDriveUrl : (new URL(this.currentTitleFilter)).origin})
  }
}

customElements.define('select-drive-modal', SelectDriveModal)

function isDriveUrl (v = '') {
  try {
    var urlp = new URL(v)
    return urlp.protocol === 'hyper:'
  } catch (e) {
    return false
  }
}

function toOrigin (v = '') {
  try {
    var urlp = new URL(v)
    return urlp.protocol + '//' + urlp.hostname
  } catch (e) {
    return ''
  }
}