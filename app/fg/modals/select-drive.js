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
      selection: {type: Array}
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

      .drive-picker .tag-container {
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
        width: 16px;
        height: 16px;
        margin-right: 16px;
      }

      .drives-list .drive .title {
        flex: 1;
        font-size: 13px;
      }

      .drives-list .drive.selected {
        background: #2864dc;
        color: #fff;
      }

      .tag {
        display: inline-block;
        padding: 1px 5px;
        background: #4CAF50;
        color: #fff;
        text-shadow: 0 1px 0px #0004;
        border-radius: 4px;
        font-size: 10px;
        margin-right: 2px;
      }
    `]
  }

  constructor () {
    super()

    // state
    this.currentTitleFilter = ''
    this.selection = []
    this.drives = undefined

    // params
    this.customTitle = ''
    this.buttonLabel = 'Select'
    this.tag = null
    this.writable = undefined
    this.allowMultiple = undefined
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.customTitle = params.title || ''
    this.buttonLabel = params.buttonLabel || 'Select'
    this.tag = params.tag
    this.writable = params.writable
    this.allowMultiple = params.allowMultiple
    await this.requestUpdate()
    this.adjustHeight()

    this.drives = await bg.drives.list({includeSystem: false})
    this.drives.sort((a, b) => (a.info.title).localeCompare(b.info.title))

    if (!!params.template && this.filteredDrives.length === 0) {
      // bounce to create
      return this.cbs.resolve({gotoCreate: true})
    }

    await this.requestUpdate()
    this.adjustHeight()
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  get filteredDrives () {
    var filtered = this.drives
    if (this.tag) filtered = filtered.filter(drive => drive.tags.includes(this.tag))
    if (typeof this.writable === 'boolean') {
      filtered = filtered.filter(drive => drive.info.writable === this.writable)
    }
    if (this.currentTitleFilter) {
      filtered = filtered.filter(a => a.info.title && a.info.title.toLowerCase().includes(this.currentTitleFilter))
    }
    return filtered
  }

  get hasValidSelection () {
    return this.selection.length > 0 || isDriveUrl(this.currentTitleFilter)
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
              <input @keyup=${this.onChangeTitleFilter} id="filter" class="filter" type="text" placeholder="Search or enter the URL of a hyperdrive">
            </div>
            ${isDriveUrl(this.currentTitleFilter) ? html`
            ` : html`
              ${this.renderDrivesList()}
            `}
          </div>

          <div class="form-actions">
            <div class="left">
              ${this.writable !== false && !this.allowMultiple ? html`
                <button type="button" @click=${this.onClickCreate} data-content="newdrive" class="btn">
                  Create new drive
                </button>
              ` : ''}
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
    if (!this.tag && typeof this.writable === 'undefined') return ''
    return html`
      <div class="tag-container">
        <strong>
          Showing drives which are
          ${typeof this.writable !== 'undefined' ? html`
            ${this.writable ? 'editable' : 'read-only'}
          ` : ''}
          ${typeof this.writable !== 'undefined' && this.tag ? ' and ' : ''}
          ${this.tag ? html`tagged "${this.tag}"` : ''}
        </strong>
      </div>`
  }

  renderDrivesList () {
    if (!this.drives) {
      return html`<ul class="drives-list"><li class="loading"><span class="spinner"></span> Loading...</li></ul>`
    }

    var filtered = this.filteredDrives

    if (!filtered.length) {
      return html`<div class="drives-list"><div class="empty">No drives found</div></div>`
    }

    return html`<div class="drives-list">${filtered.map(a => this.renderDrive(a))}</div>`
  }

  renderDrive (drive) {
    var isSelected = this.selection.includes(drive.url)
    return html`
      <div
        class="drive ${isSelected ? 'selected' : ''}"
        @click=${this.onChangeSelecteddrive}
        @dblclick=${this.onDblClickdrive}
        data-url=${drive.url}
      >
        <img class="thumb" src="asset:favicon:${drive.url}">
        <div class="title">
          ${drive.info.title || html`<em>Untitled</em>`}
          ${drive.forkOf?.label ? html`[${drive.forkOf.label}]` : ''}
          ${drive.tags.map(tag => html`<span class="tag">${tag}</span>`)}
        </div>
      </div>
    `
  }

  // event handlers
  // =

  onChangeTitleFilter (e) {
    this.currentTitleFilter = e.target.value.toLowerCase()
  }

  onChangeSelecteddrive (e) {
    var url = e.currentTarget.dataset.url
    if (this.allowMultiple) {
      if (this.selection.includes(url)) {
        this.selection = this.selection.filter(u => u !== url)
      } else {
        this.selection = this.selection.concat([url])
      }
    } else {
      this.selection = [url]
    }
  }

  onDblClickdrive (e) {
    e.preventDefault()
    this.selection = [e.currentTarget.dataset.url]
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
    if (this.selection.length) {
      if (this.allowMultiple) {
        this.cbs.resolve({urls: this.selection})
      } else {
        this.cbs.resolve({url: this.selection[0]})
      }
    } else {
      let url = (new URL(this.currentTitleFilter)).origin
      if (this.allowMultiple) {
        this.cbs.resolve({urls: [url]})
      } else {
        this.cbs.resolve({url})
      }
    }
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
