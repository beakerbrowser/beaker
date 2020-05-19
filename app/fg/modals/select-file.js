/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { joinPath } from '../../lib/strings'
import { createStat } from '../../bg/web-apis/fg/stat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'

const SHORTCUTS = [
  {url: 'virtual:my-device', title: 'My Device', icon: 'fas fa-laptop'},
  {url: 'virtual:my-drives', title: 'My Drives', icon: 'far fa-hdd'},
  {url: 'virtual:hosting', title: 'Hosting', icon: 'fas fa-share-alt'},
  {url: 'virtual:contacts', title: 'Contacts', icon: 'fas fa-users'},
]

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
        padding: 6px;
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

      .layout {
        display: grid;
        grid-gap: 10px;
        grid-template-columns: 180px 1fr;
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

      .shortcuts-list {
        background: #f5f5fa;
        box-sizing: border-box;
        padding: 5px 0;
        height: 379px;
        overflow-y: auto;
      }

      .shortcuts-list .shortcut {
        padding: 8px 10px;
      }

      .shortcuts-list .shortcut.selected {
        background: #0031;
        font-weight: 500;
      }

      .shortcuts-list .shortcut .fa-fw {
        margin-right: 5px;
      }

      .path {
        display: flex;
        align-items: center;
        padding: 0 0 4px;
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
        border-radius: 4px;
        height: 378px;
        box-sizing: border-box;
        overflow-y: scroll;
        border: 1px solid #ccc;
        user-select: none;
        cursor: default;
        padding: 4px 0;
        margin-bottom: 10px;
      }

      .path + .files-list {
        height: 358px;
      }

      .files-list.grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, 120px);
        grid-template-rows: repeat(auto-fill, 74px);
        gap: 15px;
        padding: 12px;
      }

      .files-list .item {
        display: flex;
        width: 100%;
        align-items: center;
        padding: 6px 10px;
      }

      .files-list.grid .item {
        flex-direction: column;
        box-sizing: border-box;
      }

      .files-list .item.disabled {
        font-style: italic;
        color: #aaa;
      }

      .files-list .item .fa-fw,
      .files-list .item .favicon {
        margin-right: 5px;
      }

      .files-list.grid .item .fa-fw {
        font-size: 28px;
        margin: 5px 0 10px;
      }

      .files-list.grid .item .favicon {
        width: 32px;
        height: 32px;
        object-fit: cover;
        margin: 5px 0 10px;
      }

      .files-list .item .fa-folder {
        color: #9ec2e0;
      }

      .files-list .item .fa-file {
        -webkit-text-stroke: 1px #9a9aab;
        color: #fff;
      }

      .files-list .item .name {
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

  get isVirtualListing () {
    return this.drive && this.drive.startsWith('virtual:')
  }

  get virtualTitle () {
    var s = SHORTCUTS.find(s => s.url === this.drive)
    return s ? s.title : ''
  }

  constructor () {
    super()

    // state
    this.drives = []
    this.contacts = []
    this.path = '/'
    this.files = []
    this.selectedPaths = []
    this.driveInfo = null

    // params
    this.saveMode = false
    this.drive = null
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
    this.drive = params.drive || 'virtual:my-device'
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
          this.title = 'Select drives'
        }
      }
    }

    this.driveInfo = !this.isVirtualListing ? await bg.hyperdrive.getInfo(this.drive) : undefined
    await this.readdir()
    this.updateComplete.then(_ => {
      this.adjustHeight()
      if (this.saveMode) {
        this.filenameInput.value = this.defaultFilename
        this.focusInput()
        this.requestUpdate()
      }
    })

    this.drives = await bg.drives.list()
    this.drives.push({url: 'hyper://system/', info: {title: 'System Drive', writable: true}})
    this.drives.sort((a, b) => (a.info.title || '').toLowerCase().localeCompare(b.info.title || ''))
    this.contacts = await bg.contacts.list()
    this.contacts.push(await bg.hyperdrive.getInfo((await bg.beakerBrowser.getProfile()).key))
    this.contacts.sort((a, b) => (a.title || '').toLowerCase().localeCompare(b.title || ''))
    if (this.isVirtualListing) {
      this.readvirtual()
    }
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight|0
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

  async readvirtual () {
    const vfile = (url, icon, name) => ({
      isVirtual: true,
      path: url,
      icon: url.startsWith('hyper:')
        ? url === 'hyper://system/'
          ? html`<img class="favicon" srcset="beaker://assets/img/drive-types/files.png 1x, beaker://assets/img/drive-types/files-64.png 2x">`
          : html`<img class="favicon" src="asset:favicon:${url}">`
        : html`<span class="fa-fw ${icon}"></span>`,
      name,
      stat: {isFile: () => true, isDirectory: () => false},
    })
    switch (this.drive) {
      case 'virtual:my-device':
        this.files = [
          vfile('virtual:my-drives', 'far fa-hdd', 'My Drives'),
          vfile('virtual:hosting', 'fas fa-share-alt', 'Hosting'),
          vfile('virtual:contacts', 'fas fa-users', 'Contacts')
        ]
        break
      case 'virtual:my-drives':
        this.files = this.drives.filter(d => d.info.writable).map(drive => vfile(drive.url, undefined, drive.info.title))
        break
      case 'virtual:hosting':
        this.files = this.drives.filter(d => !d.info.writable).map(drive => vfile(drive.url, undefined, drive.info.title))
        break
      case 'virtual:contacts':
        this.files = this.contacts.map(contact => vfile(contact.url, undefined, contact.title || 'Anonymous'))
        break
    }
  }

  async readdir () {
    if (this.isVirtualListing) {
      return this.readvirtual()
    }

    var files = await bg.hyperdrive.readdir(joinPath(this.drive, this.path), {includeStats: true})
    files.forEach(file => {
      file.stat = createStat(file.stat)
      file.path = joinPath(this.path, file.name)
    })
    files.sort(sortFiles)
    this.files = files
  }

  getFile (path) {
    return this.files.find(f => f.path === path)
  }

  canSelectFile (file) {
    if (this.isVirtualListing) {
      return true // can always select items in virtual lists
    }
    if (!this.driveInfo) {
      return false // probably still loading
    }
    if (defined(this.filters.networked) && this.filters.networked !== this.driveInfo.networked) {
      return false
    }
    if (defined(this.filters.writable) && this.filters.writable !== this.driveInfo.writable) {
      return false
    }
    if (this.saveMode && !this.driveInfo.writable) {
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
      if (!this.driveInfo || !this.driveInfo.writable) return false
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

            <div class="layout">
              <div class="column-shortcuts">
                <div class="shortcuts-list">
                  ${SHORTCUTS.map(shortcut => this.renderShortcut(shortcut))}
                </div>
              </div>
              <div class="column-files">
                <div class="path">
                  ${this.renderPath()}
                </div>
                ${this.renderFilesList()}
              </div>
            </div>

            <div class="form-actions">
              <div class="left"></div>
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

  renderShortcut (shortcut) {
    const cls = classMap({
      shortcut: true,
      selected: this.drive === shortcut.url
    })
    return html`
      <div
        class="${cls}"
        @click=${this.onSelectShortcut}
        data-url=${shortcut.url}
      >
        <div class="info">
          <span class="fa-fw ${shortcut.icon}"></span>
          <span class="name" title="${shortcut.title}">${shortcut.title}</span>
        </div>
      </div>
    `
  }

  renderPath () {
    var pathParts = this.path.split('/').filter(Boolean)
    var pathAcc = []
    var topTitle = this.driveInfo ? (this.driveInfo.title || 'Untitled') : this.virtualTitle
    return [html`
      <div @click=${e => this.onClickPath(e, '/')}>${topTitle}</div>
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
      <div class="files-list ${this.isVirtualListing ? 'grid' : ''}">
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
        ${file.icon ? file.icon : html`
          <span class="fa-fw ${file.stat.isFile() ? 'fas fa-file' : 'fas fa-folder'}"></span>
        `}
        <span class="name" title="${file.name}">${file.name}</span>
      </div>
    `
  }

  // event handlers
  // =

  async onSelectShortcut (e) {
    e.preventDefault()
    e.stopPropagation()
    this.drive = e.currentTarget.dataset.url
    this.driveInfo = undefined
    this.goto('/')
  }

  onClickPath (e, path) {
    e.preventDefault()
    this.goto(path)
  }

  onSelectFile (e) {
    var path = e.currentTarget.dataset.path
    if (this.allowMultiple && (e.ctrlKey || e.metaKey) && !this.isVirtualListing) {
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

    if (this.isVirtualListing) {
      this.drive = this.selectedPaths[0]
      if (this.drive.startsWith('hyper://')) {
        this.driveInfo = await bg.hyperdrive.getInfo(this.drive)
      }
      return this.goto('/')
    }

    const makeSelectionObj = path => ({path, origin: this.drive, url: joinPath(this.drive, path)})
    if (this.saveMode) {
      let path = joinPath(this.path, this.filenameInput.value)
      if (this.getFile(path)) {
        if (!confirm('Overwrite this file?')) {
          return
        }
      }
      this.cbs.resolve(makeSelectionObj(path))
    } else {
      if (this.select.includes('folder') && this.selectedPaths.length === 0) {
        // use current location
        this.selectedPaths = [this.path]
      }
      this.cbs.resolve(this.selectedPaths.map(makeSelectionObj))
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