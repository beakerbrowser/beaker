/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { join as joinPath } from 'path'
import Stat from '../../bg/web-apis/fg/stat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

class SelectFileModal extends LitElement {
  static get properties () {
    return {
      path: {type: String},
      files: {type: Array},
      selectedPaths: {type: Array}
    }
  }

  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, css`
      .title {
        background: #fff;
        border: 0;
        padding: 10px 10px 0;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
      }

      .wrapper {
        padding: 0 15px 10px;
      }

      form {
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

      .path {
        display: flex;
        align-items: center;
        padding: 4px 0 6px;
      }

      .path .fa-fw {
        margin-right: 4px;
      }

      .path > div {
        cursor: pointer;
        margin-right: 4px;
        max-width: 100px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .path > div:hover {
        text-decoration: underline;
      }

      .view {
        overflow: hidden;
        margin-bottom: 10px;
      }

      .filename {
        display: flex;
        align-items: center;
        margin: 6px 0 10px;
        background: #f3f3fa;
        border-radius: 4px;
        padding-left: 10px;
      }

      .filename label {
        margin-right: 10px;
        font-weight: normal;
      }

      .filename input {
        flex: 1;
        margin: 0;
        font-size: 13px;
      }

      .files-list {
        border-radius: 8px;
        height: 350px;
        overflow-y: scroll;
        border: 1px solid #ccc;
        user-select: none;
        cursor: default;
        padding: 4px 0;
      }

      .files-list .item {
        padding: 6px 10px;
      }

      .files-list .item.disabled {
        font-style: italic;
        color: #aaa;
      }

      .files-list .item .info {
        display: flex;
        width: 100%;
        align-items: center;
      }

      .files-list .item .info .fa-fw {
        margin-right: 5px;
      }

      .files-list .item .info .fa-folder {
        color: #9ec2e0;
      }

      .files-list .item .info .fa-file {
        -webkit-text-stroke: 1px #9a9aab;
        color: #fff;
      }

      .files-list .item .info .name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .files-list .item.selected {
        background: #2864dc;
        color: #fff;
      }

      .files-list .item.selected .fa-fw {
        text-shadow: 0 1px 2px #0006;
      }

      .drive-changer {
        display: flex;
      }

      .drive-changer > * {
        border-radius: 0 !important;
      }
      
      .drive-changer > *:first-child {
        border-top-left-radius: 4px !important;
        border-bottom-left-radius: 4px !important;
      }
      
      .drive-changer > *:last-child {
        border-top-right-radius: 4px !important;
        border-bottom-right-radius: 4px !important;
      }

      .drive-changer input {
        flex: 0 0 300px;
        height: auto;
        margin: 0;
        border-left: 0;
        border-right: 0;
      }
      `]
  }

  constructor () {
    super()

    // state
    this.path = '/'
    this.files = []
    this.selectedPaths = []
    this.archiveInfo = null
    this.isChangeDriveOpen = false

    // params
    this.saveMode = false
    this.archive = null
    this.defaultPath = '/'
    this.defaultFilename = ''
    this.title = ''
    this.buttonLabel = ''
    this.select = ['file', 'folder', 'mount']
    this.filters = {
      extensions: undefined,
      writable: undefined,
      networked: undefined
    }
    this.allowMultiple = false
    this.disallowCreate = false
    this.cbs = null
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.saveMode = params.saveMode
    this.archive = params.archive
    this.path = params.defaultPath || '/'
    this.defaultFilename = params.defaultFilename || ''
    this.title = params.title || ''
    this.buttonLabel = params.buttonLabel || (this.saveMode ? 'Save' : 'Select')
    if (params.select) this.select = params.select
    if (params.filters) {
      if ('extensions' in params.filters) {
        this.filters.extensions = params.filters.extensions
      }
      if ('writable' in params.filters) {
        this.filters.writable = params.filters.writable
      }
      if ('networked' in params.filters) {
        this.filters.networked = params.filters.networked
      }
    }
    this.allowMultiple = !this.saveMode && params.allowMultiple
    this.disallowCreate = params.disallowCreate
    if (!this.title) {
      if (this.saveMode) {
        this.title = 'Save file...'
      } else {
        let canSelect = v => this.select.includes(v)
        let [file, folder, mount] = [canSelect('file'), canSelect('folder'), canSelect('mount')]
        if (file && (folder || mount)) {
          this.title = 'Select files or folders'
        } else if (file && !(folder || mount)) {
          this.title = 'Select files'
        } else if (folder) {
          this.title = 'Select folders'
        } else if (mount) {
          this.title = 'Select dat archives'
        }
      }
    }

    this.archiveInfo = await bg.datArchive.getInfo(this.archive)
    await this.readdir()
    this.updateComplete.then(_ => {
      this.adjustHeight()
      if (this.saveMode) {
        this.filenameInput.value = this.defaultFilename
        this.focusInput()
        this.requestUpdate()
      }
    })
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  focusInput () {
    var el = this.filenameInput
    el.focus()
    el.selectionStart = el.selectionEnd = 0
  }

  async goto (path) {
    this.path = path
    await this.readdir()
    this.selectedPaths = []
    if (this.saveMode) {
      this.filenameInput.value = this.defaultFilename
      this.focusInput()
    }
  }

  async readdir () {
    var files = await bg.datArchive.readdir(this.archive, this.path, {stat: true})
    files.forEach(file => {
      file.stat = new Stat(file.stat)
      file.path = joinPath(this.path, file.name)
    })
    files.sort(sortFiles)
    this.files = files
  }

  getFile (path) {
    return this.files.find(f => f.path === path)
  }

  canSelectFile (file) {
    if (defined(this.filters.networked) && this.filters.networked !== this.archiveInfo.networked) {
      return false
    }
    if (defined(this.filters.writable) && this.filters.writable !== this.archiveInfo.writable) {
      return false
    }
    if (this.saveMode && !this.archiveInfo.writable) {
      return false
    }
    if (file.stat.isFile()) {
      if (!this.select.includes('file')) {
        return false
      }
      if (this.filters.extensions) {
        let hasExt = this.filters.extensions.some(ext => file.name.endsWith(ext))
        if (!hasExt) {
          return false
        }
      }
      return true
    } else {
      return this.select.includes('folder') || this.select.includes('mount')
    }
  }

  get filenameInput () {
    return this.shadowRoot.querySelector('input')
  }

  get hasValidSelection () {
    if (this.saveMode) {
      let inputValue = this.filenameInput && this.filenameInput.value
      if (!inputValue) return false
      let file = this.getFile(joinPath(this.path, inputValue))
      if (file && file.stat.isDirectory()) return false
      return true
    } else {
      if (this.selectedPaths.length === 0) {
        if (this.select.includes('folder')) return true // can select current location
        return false
      }
      if (this.filters.extensions) {
        // if there's an extensions requirement,
        // folders can still be selected but they're not valid targets
        return this.selectedPaths.every(path => this.filters.extensions.some(ext => path.endsWith(ext)))
      }
      return true
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div>
        <div class="title">${this.title}</div>
        <div class="wrapper">
          <form @submit=${this.onSubmit}>
            ${this.saveMode
              ? html`
                <div class="filename">
                  <label>Save as:</label>
                  <input type="text" name="filename" @keyup=${e => this.requestUpdate()}>
                </div>
              `
              : ''}

            <div class="path">
              ${this.renderPath()}
            </div>

            <div class="view">
              ${this.renderFilesList()}
            </div>

            <div class="form-actions">
              <div class="left">
                <div class="drive-changer">
                  <button
                    class="${this.isChangeDriveOpen ? 'pressed' : ''}"
                    @click=${this.onClickChangeDrive}
                  >Change drive</button>
                  ${this.isChangeDriveOpen ? html`
                    <input class="drive-url-input" placeholder="Drive URL">
                    <button @click=${this.onClickChangeDriveGo}>Go</button>
                  ` : ''}
              </div>
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
      </div>
    `
  }

  renderPath () {
    var pathParts = this.path.split('/').filter(Boolean)
    var pathAcc = []
    return [html`
      <div @click=${e => this.onClickPath(e, '/')}>${this.archiveInfo && this.archiveInfo.title || 'Untitled'}</div>
      <span class="fa-fw fas fa-angle-right"></span>
    `].concat(pathParts.map(part => {
      pathAcc.push(part)
      var path = '/' + pathAcc.join('/')
      return html`
        <div  @click=${e => this.onClickPath(e, path)}>${part}</div>
        <span class="fa-fw fas fa-angle-right"></span>
      `
    }))
  }

  renderFilesList () {
    return html`
      <div class="files-list">
        ${this.files.map(file => this.renderFile(file))}
      </div>
    `
  }

  renderFile (file) {
    // TODO mounts
    var isSelected = this.selectedPaths.includes(file.path)
    var disabled = !this.canSelectFile(file)
    const cls = classMap({
      item: true,
      file: file.stat.isFile(),
      folder: file.stat.isDirectory(),
      selected: isSelected,
      disabled
    })
    return html`
      <div
        class="${cls}"
        @click=${disabled ? undefined : this.onSelectFile}
        @dblclick=${disabled && !file.stat.isDirectory() ? undefined : this.onDblClickFile}
        data-path=${file.path}
      >
        <div class="info">
          <span class="fa-fw ${file.stat.isFile() ? 'fas fa-file' : 'fas fa-folder'}"></span>
          <span class="name" title="${file.name}">${file.name}</span>
        </div>
      </div>
    `
  }

  // event handlers
  // =

  onClickChangeDrive (e) {
    e.preventDefault()
    this.isChangeDriveOpen = !this.isChangeDriveOpen
    this.requestUpdate()
  }

  async onClickChangeDriveGo (e) {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.textContent = 'Loading...'

    try {
      var archive = this.shadowRoot.querySelector('.drive-url-input').value
      var archiveInfo = await bg.datArchive.getInfo(archive)
    } catch (e) {
      return this.requestUpdate()
    }

    this.archive = archiveInfo.url
    this.archiveInfo = archiveInfo
    this.isChangeDriveOpen = false
    this.goto('/')
  }

  onClickPath (e, path) {
    e.preventDefault()
    this.goto(path)
  }

  onSelectFile (e) {
    var path = e.currentTarget.dataset.path
    if (this.allowMultiple && (e.ctrlKey || e.metaKey)) {
      this.selectedPaths = this.selectedPaths.concat([path])
    } else {
      this.selectedPaths = [path]
    }
    if (this.saveMode) {
      this.filenameInput.value = path.split('/').pop()
    }
  }

  onDblClickFile (e) {
    e.preventDefault()
    var file = this.getFile(e.currentTarget.dataset.path)
    if (file.stat.isDirectory()) {
      this.goto(file.path)
    } else {
      this.selectedPaths = [file.path]
      this.onSubmit()
    }
  }

  onClickCancel (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onSubmit (e) {
    if (e) e.preventDefault()
    if (this.saveMode) {
      let path = joinPath(this.path, this.filenameInput.value)
      if (this.getFile(path)) {
        if (!confirm('Overwrite this file?')) {
          return
        }
      }
      this.cbs.resolve({path})
    } else {
      if (this.select.includes('folder') && this.selectedPaths.length === 0) {
        // use current location
        this.selectedPaths = [this.path]
      }
      this.cbs.resolve({paths: this.selectedPaths})
    }
  }
}

customElements.define('select-file-modal', SelectFileModal)

function sortFiles (a, b) {
  if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
  if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
  return a.name.localeCompare(b.name)
}

function defined (v) {
  return typeof v !== 'undefined'
}