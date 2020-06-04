/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import _get from 'lodash.get'
import * as bg from './bg-process-rpc'
import inputsCSS from './inputs.css'
import buttonsCSS from './buttons2.css'
import spinnerCSS from './spinner.css'

class FolderSyncMenu extends LitElement {
  constructor () {
    super()
    this.reset()
  }

  reset () {
    this.url = undefined
    this.folderSyncPath = undefined
    this.isAutoSyncing = false
    this.ignoredFiles = []
    this.changes = undefined
  }

  async init (params) {
    this.url = params.url
    this.folderSyncPath = params.folderSyncPath
    this.requestUpdate()
    this.load()
  }

  async load () {
    var settings = await bg.folderSync.get(this.url)
    if (settings) {
      this.ignoredFiles = settings.ignoredFiles
      this.isAutoSyncing = settings.isAutoSyncing
    }

    this.changes = await bg.folderSync.compare(this.url)
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    var canSync = false
    if (this.changes) {
      let numChanges = this.changes.filter(c => !this.ignoredFiles.includes(c.path)).length
      canSync = numChanges > 0
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="wrapper">
        <div>Syncing with:</div>
        <div class="folder-path">
          <input value=${this.folderSyncPath || ''} readonly>
          <button title="Change" @click=${this.onChangeFolder}><span class="far fa-fw fa-folder-open"></span></button>
          <button title="Remove" @click=${this.onRemoveFolder}><span class="fas fa-fw fa-times"></span></button>
        </div>
        ${!this.changes ? html`
          <div class="changes"><div class="empty"><span class="spinner"></span></div></div>
        ` : html`
          <div class="changes">
            ${repeat(this.changes, change => {
              var isIgnored = this.ignoredFiles.includes(change.path)
              return html`
                <div class="change ${isIgnored ? 'ignored' : ''}">
                  <input
                    type="checkbox"
                    ?checked=${!isIgnored}
                    @click=${e => this.onToggleIgnore(change.path)}
                  >
                  ${isIgnored ? '' : html`<span class="revision-indicator ${change.change}"></span>`}
                  <span class="path">${change.path}</span>
                </div>
              `
            })}
            ${this.changes.length === 0 ? html`
              <div class="empty">No changes found</div>
            ` : ''}
          </div>
        `}
        <div class="ctrls">
          <button
            class="primary"
            ?disabled=${!canSync}
            @click=${this.onClickSync}
          >Sync</button>
          <label>
            <input type="checkbox" @click=${this.onToggleAutosync} ?checked=${this.isAutoSyncing}> Autosync
          </label>
        </div>
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  async onChangeFolder (e) {
    this.folderSyncPath = await bg.folderSync.configureDialog(this.url)
    this.changes = undefined
    this.requestUpdate()
    this.load()
  }

  async onRemoveFolder (e) {
    await bg.folderSync.remove(this.url)
    bg.views.refreshState('active')
    bg.shellMenus.close()
  }

  async onClickSync () {
    this.changes = undefined
    this.requestUpdate()

    await bg.folderSync.sync(this.url)

    bg.views.reload('active')
    this.load()
  }

  async onToggleIgnore (path) {
    if (this.ignoredFiles.includes(path)) {
      this.ignoredFiles.splice(this.ignoredFiles.indexOf(path), 1)
    } else {
      this.ignoredFiles.push(path)
    }
    await bg.folderSync.updateIgnoredFiles(this.url, this.ignoredFiles)
    this.requestUpdate()
  }

  async onToggleAutosync () {
    if (this.isAutoSyncing) {
      await bg.folderSync.disableAutoSync(this.url)
      this.isAutoSyncing = false
      this.requestUpdate()
    } else {
      await bg.folderSync.enableAutoSync(this.url)
      this.isAutoSyncing = true
      this.onClickSync()
    }
  }
}
FolderSyncMenu.styles = [inputsCSS, buttonsCSS, spinnerCSS, css`
.wrapper {
  color: #333;
  padding: 10px;
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
  max-height: 100px;
  overflow: auto;
  border: 1px solid #ccd;
  border-radius: 4px;
}

.changes .empty {
  padding: 6px 8px;
  color: #778;
}

.change {
  white-space: nowrap;
  padding: 4px;
  border-bottom: 1px solid #eef;
}

.change:last-child {
  border-bottom: 0;
}

.change.ignored {
  background: #fafafd;
  color: #778;
}

.change input {
  margin: 0;
  position: relative;
  top: 2px;
}

.revision-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: -.4px;
  margin-left: 4px;
  margin-right: 2px;
}

.revision-indicator.add { background: #44c35a; }
.revision-indicator.mod { background: #fac800; }
.revision-indicator.del { background: #d93229; }

.ctrls {
  display: flex;
  align-items: center;
}

.ctrls button {
  margin-right: 10px;
}

.ctrls label {
  display: inline-flex;
  align-items: center;
}
`]

customElements.define('folder-sync-menu', FolderSyncMenu)
