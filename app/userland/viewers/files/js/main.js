import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import mainCSS from '../css/main.css.js'
import './com/file-grid.js'
import './com/file-display.js'
import './com/folder-info.js'
import './com/file-info.js'

export class FilesViewer extends LitElement {
  static get propertes () {
    return {
      selection: {type: Array}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
    this.items = []
    this.selection = []
    this.load()
  }

  get filename () {
    return location.pathname.split('/').pop()
  }

  async load () {
    if (!this.user) {
      this.user = await uwg.profiles.me()
    }
    var archive = new DatArchive(location)
    this.driveInfo = await archive.getInfo()
    this.driveInfo.ident = await navigator.filesystem.identifyDrive(archive.url)
    this.pathInfo = await archive.stat(location.pathname)
    await this.readMountInfo()
    if (this.pathInfo.isDirectory()) {
      this.items = await archive.readdir(location.pathname, {stat: true})
    }
    console.log({
      driveInfo: this.driveInfo,
      mountInfo: this.mountInfo,
      pathInfo: this.pathInfo
    })
    this.requestUpdate()
  }

  async readMountInfo () {
    var archive = new DatArchive(location)
    var pathParts = location.pathname.split('/').filter(Boolean)
    while (pathParts.length > 0) {
      let st = await archive.stat(pathParts.join('/'))
      if (st.mount) {
        let mount = new DatArchive(st.mount.key)
        this.mountInfo = await mount.getInfo()
        this.mountInfo.mountPath = pathParts.join('/')
        this.mountInfo.ident = await navigator.filesystem.identifyDrive(mount.url)
        return
      }
      pathParts.pop()
    }
  }

  // rendering
  // =

  render () {
    if (!this.driveInfo || !this.pathInfo) return html``

    var title = this.filename
    if (!title) title = this.driveInfo.title
    if (!title && this.driveInfo.ident.isRoot) title = 'My Hyperdrive'
    if (!title) title = 'Untitled'
    document.title = title

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.pathInfo.isDirectory() ? html`
        <file-grid
          .items=${this.items}
          .selection=${this.selection}
          @change-selection=${this.onChangeSelection}
        ></file-grid>
      ` : html`
        <file-display
          pathname=${window.location.pathname}
          .info=${this.pathInfo}
        ></file-display>
      `}
      ${this.selection.length > 0 ? html`
        <file-info
          .driveInfo=${this.driveInfo}
          .pathInfo=${this.pathInfo}
          .mountInfo=${this.mountInfo}
          .selection=${this.selection}
        ></file-info>
      ` : html`
        <folder-info
          title=${title}
          .driveInfo=${this.driveInfo}
          .pathInfo=${this.pathInfo}
          .mountInfo=${this.mountInfo}
        ></folder-info>
      `}
    `
  }

  renderSaveBtn () {
    const isSaved = !!this.libraryEntry
    return html`
      <button class="big ${isSaved ? 'primary' : ''}" @click=${this.onToggleSaved}>
        ${isSaved ? html`
          <span class="fas fa-fw fa-save"></span> Saved
        ` : html`
          <span class="fas fa-fw fa-save"></span> Save
        `}
      </button>
    `
  }

  // events
  // =

  async onToggleSaved (e) {
    if (this.libraryEntry) {
      await uwg.library.configure(this.driveInfo.url, {isSaved: false})
    } else {
      await uwg.library.configure(this.driveInfo.url, {isSaved: true})
    }
    this.load()
  }

  onChangeSelection (e) {
    this.selection = e.detail.selection
    this.requestUpdate()
  }
}

customElements.define('files-viewer', FilesViewer)