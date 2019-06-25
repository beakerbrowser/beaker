/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map'
import { join as joinPath } from 'path'
import Stat from '@beaker/core/web-apis/fg/stat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons.css'

class SelectFileModal extends LitElement {
  static get properties () {
    return {
      path: {type: String},
      files: {type: Array},
      selectedPaths: {type: Array}
    }
  }

  constructor () {
    super()

    // state
    this.path = '/'
    this.files = []
    this.selectedPaths = []
    this.archiveInfo = null

    // params
    this.archive = null
    this.defaultPath = '/'
    this.title = ''
    this.buttonLabel = 'Select'
    this.select = ['file', 'folder', 'archive']
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
    this.archive = params.archive
    this.path = params.defaultPath || '/'
    this.title = params.title || ''
    this.buttonLabel = params.buttonLabel || 'Select'
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
    this.allowMultiple = params.allowMultiple
    this.disallowCreate = params.disallowCreate
    if (!this.title) {
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

    this.archiveInfo = await bg.datArchive.getInfo(this.archive)
    await this.readdir()
    this.updateComplete.then(_ => this.adjustHeight())
  }

  adjustHeight () {
    // adjust height based on rendering
    var height = this.shadowRoot.querySelector('div').clientHeight
    bg.modals.resizeSelf({height})
  }

  async goto (path) {
    this.path = path
    await this.readdir()
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
    if (defined(this.filters.writable) && this.filters.writable !== this.archiveInfo.isOwner) { // TODO change isOwner to writable
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
      return this.select.includes('folder') || this.select.includes('archive')
    }
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <form @submit=${this.onSubmit}>
          <h1 class="title">${this.title}</h1>

          <div class="path">
            ${this.renderPath()}
          </div>

          <div class="view">
            ${this.renderFilesList()}
          </div>

          <div class="form-actions">
            <div class="right">
              <button type="button" @click=${this.onClickCancel} class="btn cancel" tabindex="4">Cancel</button>
              <button ?disabled=${this.selectedPaths.length === 0} type="submit" class="btn primary" tabindex="5">
                ${this.buttonLabel}
              </button>
            </div>
          </div>
        </form>
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
          <span class="fa-fw far fa-${file.stat.isFile() ? 'file' : 'folder'}"></span>
          <span class="name" title="${file.name}">${file.name}</span>
        </div>
      </div>
    `
  }

  // event handlers
  // =

  onClickPath (e, path) {
    e.preventDefault()
    this.goto(path)
  }

  onSelectFile (e) {
    if (this.allowMultiple && (e.ctrlKey || e.metaKey)) {
      this.selectedPaths = this.selectedPaths.concat([e.currentTarget.dataset.path])
    } else {
      this.selectedPaths = [e.currentTarget.dataset.path]
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
    this.cbs.resolve({paths: this.selectedPaths})
  }
}
SelectFileModal.styles = [commonCSS, inputsCSS, buttonsCSS, css`
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

.path {
  display: flex;
  align-items: center;
  border: 1px solid #ddd;
  border-bottom: 0;
  padding: 4px 6px;
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
  margin-bottom: 15px;
}

.files-list {
  height: 350px;
  overflow-y: scroll;
  border: 1px solid #ddd;
  user-select: none;
  cursor: default;
}

.files-list .item {
  padding: 4px 10px;
}

.files-list .item:nth-child(even) {
  background: #f7f7f7;
}

.files-list .item.disabled {
  font-style: italic;
  color: gray;
}

.files-list .item .info {
  display: flex;
  width: 100%;
  align-items: center;
}

.files-list .item .info .fa-fw {
  margin-right: 5px;
}

.files-list .item .info .name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.files-list .item:hover {
  background: #f0f0f0;
}

.files-list .item.selected {
  background: #2864dc;
  color: #fff;
}
`]

customElements.define('select-file-modal', SelectFileModal)

function sortFiles (a, b) {
  if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
  if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
  return a.name.localeCompare(b.name)
}

function defined (v) {
  return typeof v !== 'undefined'
}