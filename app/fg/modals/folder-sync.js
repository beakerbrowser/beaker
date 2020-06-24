/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'
import tooltipCSS from './tooltip.css'
import { globToRegex } from '../../lib/strings'
import _debounce from 'lodash.debounce'

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

    .refresh {
      position: absolute;
      right: 53px;
      top: 18px;      
      font-size: 10px;
      cursor: pointer;
    }

    .close {
      position: absolute;
      right: 30px;
      top: 17px;
      font-size: 13px;
      cursor: pointer;
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
      padding: 6px 8px;
      color: #555;
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

    summary label {
      float: right;
      font-size: 12px;
      display: flex;
      align-items: center;
      font-weight: normal;
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

    .form-actions button .spinner {
      width: 6px;
      height: 6px;
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
    this.ignoreRegexes = []
    this.changes = undefined
    this.showSkippedFiles = false
    this.closeAfterSync = false
  }

  async init (params, cbs) {
    this.cbs = cbs
    this.url = params.url
    this.closeAfterSync = params.closeAfterSync
    await this.requestUpdate()
    this.load()
  }

  async load () {
    var settings = await bg.folderSync.get(this.url)
    if (settings) {
      this.folderSyncPath = settings.localPath
      this.ignoredFiles = settings.ignoredFiles
      this.ignoreRegexes = this.ignoredFiles.map(globToRegex)
      this.isAutoSyncing = settings.isAutoSyncing
    } else {
      this.folderSyncPath = undefined
      this.changes = []
    }
    this.requestUpdate()

    if (settings) {
      this.changes = await bg.folderSync.compare(this.url)
      this.changes.sort(sortAlphaAndFolders)
      this.changes.forEach(c => {
        if (c.type === 'dir') {
          this.setDirCollapsed(c, true)
        }
      })
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

  splitChangePath (change) {
    // NOTE
    // sometimes a file will get "orphaned"
    // this is where the parent dirs are all merged but the file itself isnt
    // when this happens, we need to find the parent. If it's not rendered, 
    // then show the full path
    // -prf
    var pathParts = change.path.split('/')
    var filename = pathParts.pop()
    var parentPath = pathParts.join('/')
    var parentChange = this.changes.find(c => c.path === parentPath)
    if (parentChange) {
      if (this.showSkippedFiles || !this.isIgnored(parentPath)) {
        return {pathParts: pathParts.filter(Boolean), filename} // not orphaned
      }
    }
    return {pathParts: [], filename: change.path}
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
    for (let re of this.ignoreRegexes) {
      if (re.test(path)) return true
    }
    return false
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
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <h1 class="title">
          Sync with local folder
          <a class="refresh" @click=${this.onClickRefresh} title="Refresh">
            <span class="fas fa-sync"></span>
          </a>
          <a class="close" @click=${this.onClickClose} title="Close">
            <span class="fas fa-times"></span>
          </a>
        </h1>
        <main>
          <div class="folder-path">
            <input value=${this.folderSyncPath || ''} readonly placeholder="No local folder chosen">
            <button title="Change" @click=${this.onChangeFolder}><span class="far fa-fw fa-folder-open"></span></button>
            <button title="Remove" @click=${this.onRemoveFolder}><span class="fas fa-fw fa-ban"></span></button>
          </div>
          ${this.renderSyncUI()}
          ${this.folderSyncPath ? html`
            <details @toggle=${this.adjustHeight}>
              <summary>
                Skip items matching these rules
                <label>
                  <input type="checkbox" ?checked=${this.showSkippedFiles} @click=${this.onToggleShowSkippedFiles}>
                  Show skipped files
                </label>
              </summary>
              <textarea
                class="ignores"
                @input=${_debounce(this.onChangeIgnores, 1e3)}
                ?disabled=${this.isAutoSyncing}
              >${this.ignoredFiles.join('\n')}</textarea>
            </details>
          ` : ''}
        </main>
        <div class="form-actions">
          <button type="button" @click=${this.onClickClose} class="cancel" tabindex="6">Close</button>
          <span>
            ${this.isAutoSyncing ? html`
              <button tabindex="5" @click=${this.onClickStopAutosync}>
                Stop Autosync
              </button>
              <button type="submit" class="primary" tabindex="4" disabled>
                <span class="spinner"></span> Syncing
              </button>
            ` : html`
              <button tabindex="5" @click=${this.onClickStartAutosync}>
                Start Autosync
              </button>
              <button type="submit" class="primary" tabindex="4" @click=${this.onClickSync}>
                Sync
              </button>
            `}
          </span>
        </div>
      </div>
    `
  }

  renderSyncUI () {
    if (!this.folderSyncPath) return ''
    if (!this.changes) {
      return html`<div class="empty"><span class="spinner"></span></div>`
    }
    let hasChanges = true
    if (this.showSkippedFiles && this.changes.length === 0) {
      hasChanges = false
    } else if (!this.showSkippedFiles && !this.changes.find(change => !this.isIgnored(change.path))) {
      hasChanges = false
    }
    if (!hasChanges) {
      return html`<div class="changes"><div class="empty">All files are synced</div></div>`
    }
    return html`
      <div class="changes">
        ${repeat(this.changes.filter(c => !c.hidden), change => {
          let isIgnored = this.isIgnored(change.path)
          if (isIgnored && !this.showSkippedFiles) return ''
          let {pathParts, filename} = this.splitChangePath(change)
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
              ${change.change !== 'add' ? html`
                <a class="revert tooltip-left" data-tooltip="Restore to local folder" @click=${e => this.onClickRestoreFile(change)}>
                  <span class="fas fa-fw fa-undo"></span>
                </a>
              ` : ''}
            </div>
          `
        })}
      </div>
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

  async onClickRestoreFile (change) {
    await bg.folderSync.restoreFile(this.url, change.path)
    this.changes.splice(this.changes.indexOf(change), 1)
    this.requestUpdate()
  }

  async onChangeIgnores (e) {
    this.ignoredFiles = this.shadowRoot.querySelector('.ignores').value.split('\n').map(str => str.trim()).filter(Boolean)
    this.ignoreRegexes = this.ignoredFiles.map(globToRegex)
    await bg.folderSync.updateIgnoredFiles(this.url, this.ignoredFiles)
    this.requestUpdate()
  }

  onToggleShowSkippedFiles (e) {
    e.stopPropagation()
    this.showSkippedFiles = !this.showSkippedFiles
    this.requestUpdate()
  }

  onClickRefresh () {
    this.changes = undefined
    this.requestUpdate()
    this.load()
  }

  async onClickSync () {
    this.shadowRoot.querySelector('button[type="submit"]').innerHTML = `<div class="spinner"></div> Syncing`
    await bg.folderSync.sync(this.url)
    this.shadowRoot.querySelector('button[type="submit"]').innerHTML = `Sync`
    if (this.closeAfterSync) return this.cbs.resolve()
    this.changes = []
    this.requestUpdate()
    this.load()
  }

  async onClickStartAutosync () {
    await bg.folderSync.sync(this.url)
    await bg.folderSync.enableAutoSync(this.url)
    if (this.closeAfterSync) return this.cbs.resolve()
    this.load()
  }

  async onClickStopAutosync () {
    await bg.folderSync.disableAutoSync(this.url)
    this.isAutoSyncing = false
    this.requestUpdate()
  }

  onClickClose () {
    this.cbs.resolve()
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
