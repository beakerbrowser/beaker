/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import tooltipCSS from './tooltip.css'

class FolderSyncModal extends LitElement {
  static get styles () {
    return [commonCSS, inputsCSS, buttonsCSS, spinnerCSS, tooltipCSS, css`
    .wrapper {
      padding: 0;
    }
    
    h1.title {
      padding: 14px 20px;
      margin: 0;
      border-color: #bbb;
    }
    
    main {
      padding: 14px 20px;
    }

    main > :last-child {
      margin-bottom: 0 !important;
    }

    input {
      margin: 0;
      display: initial;
      width: initial;
    }

    hr {
      border: 0;
      border-top: 1px solid #ddd;
      margin: 20px 0;
    }

    .folder-path,
    .changes {
      margin: 2px 0 10px;
    }
    
    input[type="checkbox"] {
      height: auto;
      margin: 0;
      margin-right: 5px;
    }
    
    .folder-path {
      display: flex;
    }
    
    .folder-path input {
      flex: 1;
      background: #f3f3f8;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      box-shadow: none;
      border-color: #f3f3f8;
      padding-left: 10px;
    }
    
    .folder-path button:not(:last-child) {
      border-right: 0;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }
    
    .folder-path button {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }
    
    .changes {
      max-height: 300px;
      overflow-y: scroll;
      border: 1px solid #dde;
      border-radius: 4px;
    }
    
    .changes .empty {
      color: #778;
      padding: 4px 8px;
    }
    
    .change {
      display: flex;
      align-items: center;
      height: 32px;
      border-bottom: 1px solid #dde;
    }

    .change:last-child {
      border-bottom: 0;
    }
    
    .change.ignored {
      background: #fafafd;
      color: #778;
    }
    
    .change.clickable {
      cursor: pointer;
    }

    .change .icon {
      display: inline-block;
      width: 18px;
      text-align: center;
    }

    .change .spacer {
      background: #f3f3f8;
      width: 18px;
      height: 100%;
    }

    .change .path {
      flex: 1;
      padding: 8px;
      white-space: nowrap;
      overflow: hidden;
    }

    .revision-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: -.4px;
      margin-left: 4px;
      margin-right: 4px;
    }

    .revert {
      margin-right: 8px;
      cursor: pointer;
    }
    
    .revision-indicator.add { background: #44c35a; }
    .revision-indicator.mod { background: #fac800; }
    .revision-indicator.del { background: #d93229; }

    .ignores {
      height: 100px;
    }

    summary {
      font-size: 13px;
    }

    textarea {
      padding: 5px;
    }

    textarea,
    details {
      display: block;
      width: 100%;
      margin: 5px 0 15px 0;
    }

    .form-actions {
      display: flex;
      padding: 14px 20px;
      border-top: 1px solid rgb(187, 187, 187);
    }
    
    .form-actions button {
      padding: 6px 12px;
      font-size: 12px;
    }

    .form-actions button:first-child {
      margin-right: auto;
    }

    .form-actions label {
      display: flex;
      align-items: center;
      margin-right: 15px;
    }
    `]
  }

  constructor () {
    super()
    this.cbs = undefined
    this.url = undefined
    this.folderSyncPath = undefined
    this.isAutoSyncing = false
    this.ignoredFiles = []
    this.changes = undefined
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.url = params.url
    await this.requestUpdate()
    this.load()
  }

  async load () {
    var settings = await bg.folderSync.get(this.url)
    if (settings) {
      this.folderSyncPath = settings.localPath
      this.ignoredFiles = settings.ignoredFiles
      this.isAutoSyncing = settings.isAutoSyncing
      this.changes = await bg.folderSync.compare(this.url)
      this.changes.sort(sortAlphaAndFolders)
      this.changes.forEach(c => {
        if (c.type === 'dir') {
          this.setDirCollapsed(c, true)
        }
      })
    } else {
      this.folderSyncPath = undefined
      this.changes = []
    }

    this.requestUpdate()
  }

  iterateChildChanges (path, fn) {
    this.changes.forEach(change => {
      if (isLeftChildOfRight(change.path, path)) {
        fn(change)
      }
    })
  }

  iterateParentChanges (path, fn) {
    this.changes.forEach(change => {
      if (isLeftChildOfRight(path, change.path)) {
        fn(change)
      }
    })
  }

  setDirCollapsed (change, collapsed) {
    change.collapsed = collapsed
    this.iterateChildChanges(change.path, c => {
      if (collapsed === false && !isLeftImmediateChildOfRight(c.path, change.path)) return
      if (collapsed === true && c.type === 'dir') c.collapsed = change.collapsed
      c.hidden = change.collapsed
    })
  }

  isIgnored (path) {
    return this.ignoredFiles.includes(path)
  }

  updated () {
    this.adjustHeight()
  }

  adjustHeight () {
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.modals.resizeSelf({height})
  }

  // rendering
  // =

  render () {
    let hasChanges = this.isAutoSyncing || (this.changes && !!this.changes.find(change => !this.isIgnored(change.path)))
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Sync with local folder
        </h1>
        <main>
          <div class="folder-path">
            <input value=${this.folderSyncPath || ''} readonly placeholder="No local folder chosen">
            <button title="Change" @click=${this.onChangeFolder}><span class="far fa-fw fa-folder-open"></span></button>
            <button title="Remove" @click=${this.onRemoveFolder}><span class="fas fa-fw fa-times"></span></button>
          </div>
          ${this.renderSyncUI()}
        </main>
        <div class="form-actions">
          <button type="button" @click=${this.onClickClose} class="cancel" tabindex="6">Close</button>
          <label>
            <input type="checkbox" @click=${this.onToggleAutosync} ?checked=${this.isAutoSyncing}> Autosync
          </label>
          <button type="submit" class="primary" tabindex="4" ?disabled=${!hasChanges} @click=${this.onClickSync}>
            Sync
          </button>
        </div>
      </div>
    `
  }

  renderSyncUI () {
    if (!this.folderSyncPath) return ''
    if (!this.changes) {
      return html`<div class="empty"><span class="spinner"></span></div>`
    }
    if (!this.changes.length) {
      return html`<div class="empty">No changes found</div>`
    }
    return html`
      <div class="changes">
        ${repeat(this.changes.filter(c => !c.hidden), change => {
          let isIgnored = this.isIgnored(change.path)
          let pathParts = change.path.split('/').filter(Boolean)
          let filename = pathParts.pop()
          const icon = () => change.type === 'dir'
            ? html`
              <span class="icon">
                <span class="fas fa-folder${change.collapsed ? '' : '-open'}"></span>
              </span>
            ` : html`
              <span class="icon">
                <span class="far fa-file"></span>
              </span>
            `
          const subdirSpacers = () => pathParts.map(_ => html`<span class="spacer"></span>`)
          const onClick = change.type === 'dir' ? e => { this.setDirCollapsed(change, !change.collapsed); this.requestUpdate() } : undefined
          return html`
            <div class="change ${change.type === 'dir' ? 'clickable' : ''} ${isIgnored ? 'ignored' : ''}">
              ${subdirSpacers()}
              <span class="path" @click=${onClick}>
                ${!isIgnored ? html`<span class="revision-indicator ${change.change}"></span>` : ''}
                ${icon()}
                ${filename}
              </span>
              ${change.change === 'del' ? html`
                <a class="revert tooltip-left" data-tooltip="Restore to local folder">
                  <span class="fas fa-fw fa-undo"></span>
                </a>
              ` : ''}
            </div>
          `
        })}
      </div>
      <details @toggle=${this.adjustHeight}>
        <summary>Skip items matching these rules</summary>
        <textarea class="ignores" @change=${this.onChangeIgnores}>${this.ignoredFiles.join('\n')}</textarea>
      </details>
    `
  }

  // event handlers
  // =

  async onChangeFolder (e) {
    this.folderSyncPath = await bg.folderSync.chooseFolderDialog(this.url)
    this.changes = undefined
    this.requestUpdate()
    this.load()
  }

  async onRemoveFolder (e) {
    await bg.folderSync.remove(this.url)
    this.load()
  }

  async onChangeIgnores (e) {
    this.ignoredFiles = e.currentTarget.value.split('\n').map(str => str.trim()).filter(Boolean)
    await bg.folderSync.updateIgnoredFiles(this.url, this.ignoredFiles)
    this.requestUpdate()
  }

  async onToggleAutosync () {
    this.isAutoSyncing = !this.isAutoSyncing
    this.requestUpdate()
  }

  onClickClose (e) {
    e.preventDefault()
    this.cbs.reject(new Error('Canceled'))
  }

  async onClickSync (e) {
    e.preventDefault()

    this.shadowRoot.querySelector('button[type="submit"]').innerHTML = `<div class="spinner"></div>`
    Array.from(this.shadowRoot.querySelectorAll('button'), b => b.setAttribute('disabled', 'disabled'))

    try {
      await bg.folderSync.sync(this.url)

      if (this.isAutoSyncing) {
        await bg.folderSync.disableAutoSync(this.url)
      } else {
        await bg.folderSync.enableAutoSync(this.url)
      }

      this.cbs.resolve()
    } catch (e) {
      this.cbs.reject(e.message || e.toString())
    }
  }
}

customElements.define('folder-sync-modal', FolderSyncModal)

function sortAlphaAndFolders (a, b) {
  for (let i = 0; i < Math.min(a.path.length, b.path.length); i++) {
    let ac = a.path.charAt(i)
    let bc = b.path.charAt(i)
    if (ac === bc) continue
    if (ac === '/') return -1
    if (bc === '/') return 1
    if (ac < bc) return -1
    return 1
  }
  return a.path.length < b.path.length ? -1 : 1
}

function isLeftChildOfRight (a, b) {
  return (a.startsWith(b) && a.charAt(b.length) === '/')
}

function isLeftImmediateChildOfRight (a, b) {
  return isLeftChildOfRight(a, b) && !a.slice(b.length + 1).includes('/')
}
