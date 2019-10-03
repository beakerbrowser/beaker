import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import { writeToClipboard } from '../../../app-stdlib/js/clipboard.js'
import sidebarLocalFolderCSS from '../../css/com/local-folder.css.js'

class SidebarLocalFolder extends LitElement {
  static get properties () {
    return {
      origin: {type: String},
      info: {type: Object}
    }
  }

  static get styles () {
    return [sidebarLocalFolderCSS]
  }

  constructor () {
    super()
    this.info = null
  }
  // rendering
  // =

  render () {
    if (!this.info) {
      return html``
    }

    if (this.info.localSyncPathIsMissing) {
      return this.renderLocalFolderMissing()
    }
  
    if (this.info.userSettings.localSyncPath) {
      return this.renderLocalFolderSet()
    }
  
    return html`
      <link rel="stylesheet" href="/vendor/beaker-app-stdlib/css/fontawesome.css">
      <div class="field-group">
        <div class="field-group-title">Local folder</div>
        <p>
          <button @click=${this.onClickChange}>
            <span class="far fa-fw fa-folder-open"></span>
            Set local folder
          </button>
        </p>
        <p class="help">
          <span class="fa fa-fw fa-info"></span>
          Set a local folder to access this site's files from outside of the browser.
          This lets you use an external editor to work on your site.
        </p>
      </div>
    `
  }

  renderLocalFolderMissing () {
    return html`
      <link rel="stylesheet" href="/vendor/beaker-app-stdlib/css/fontawesome.css">
      <div class="field-group">
        <div class="field-group-title">Local folder</div>
        <p class="error">
          <span class="fas fa-fw fa-exclamation-triangle"></span>
          <span>This site's local folder was deleted or moved. (${this.info.missingLocalSyncPath})</span>
        </p>
        <p>
          <button class="primary" @click=${this.onClickChange}>
            <span class="far fa-fw fa-folder-open"></span>
            Choose new folder
          </button>
          <button class="transparent" @click=${this.onClickRemove}>
            <span class="fas fa-fw fa-times"></span>
            Remove
          </button>
        </p>
      </div>
    `
  }

  renderLocalFolderSet () {
    const path = this.info.userSettings.localSyncPath
    return html`
      <link rel="stylesheet" href="/vendor/beaker-app-stdlib/css/fontawesome.css">
      <div class="field-group">
        <div class="field-group-title">Local folder</div>
        <p class="copy-path">
          <input type="text" disabled value="${path}"/>
  
          <span class="btn-group">
            <button class="btn white" @click=${this.onClickCopy}>
              Copy
            </button>
  
            <button class="btn white" @click=${this.onClickOpen}>
              Open
            </button>
          </span>
        </p>
        <p>
          <button class="btn transparent" @click=${this.onClickChange}>
            <span class="far fa-fw fa-folder-open"></span>
            Change local folder
          </button>
          <button class="btn transparent" @click=${this.onClickRemove}>
            <span class="fas fa-times"></span> Remove
          </button>
        </p>
      </div>
    `
  }

  // events
  // =

  async onClickChange () {
    if (!this.info.isOwner) return
    
    // open the create folder-picker popup
    let res = await beaker.browser.showOpenDialog({
      title: 'Set local folder',
      defaultPath: this.info.userSettings.localSyncPath,
      buttonLabel: 'Choose folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (!res || !res[0]) return
    let localSyncPath = res[0]
  
    try {
      // always enable preview-mode
      await beaker.archives.setUserSettings(this.origin, {previewMode: true})
  
      // set folder
      await beaker.archives.setLocalSyncPath(this.origin, localSyncPath)
  
      // open folder and reload
      beaker.browser.openFolder(localSyncPath)
      emit(this, 'request-load', {bubbles: true, composed: true})
    } catch (e) {
      toast.create(e.toString(), 'error', 5e3)
      console.error(e)
    }
  }
  
  async onClickRemove (e) {
    if (!this.info.isOwner) return
  
    try {
      await beaker.archives.setLocalSyncPath(this.origin, null)
      emit(this, 'request-load', {bubbles: true, composed: true})
    } catch (e) {
      toast.create(e.toString(), 'error', 5e3)
      console.error(e)
    }
  }

  onClickCopy () {
    writeToClipboard(this.info.userSettings.localSyncPath)
    toast.create('Path copied to clipboard')
  }

  onClickOpen () {
    beaker.browser.openFolder(this.info.userSettings.localSyncPath)
  }
}

customElements.define('sidebar-local-folder', SidebarLocalFolder)
