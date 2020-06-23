import { LitElement, html } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { joinPath } from '../../../app-stdlib/js/strings.js'
import { emit } from '../../../app-stdlib/js/dom.js'
import sidebarFilesViewCSS from '../../css/com/files-explorer.css.js'

class FilesExplorer extends LitElement {
  static get properties () {
    return {
      url: {type: String, reflect: true},
      openFilePath: {type: String, attribute: 'open-file-path'},
      isLoading: {type: Boolean},
      readOnly: {type: Boolean},
      items: {type: Array}
    }
  }

  static get styles () {
    return [sidebarFilesViewCSS]
  }

  get isDrive () {
    return this.url && this.url.startsWith('hyper:')
  }

  get drive () {
    return beaker.hyperdrive.drive(this.url)
  }

  get origin () {
    let urlp = new URL(this.url)
    return urlp.origin
  }

  get viewedDriveVersion () {
    let urlp = new URL(this.url)
    let parts = urlp.hostname.split('+')
    if (parts.length === 2) return parts[1]
    return 'latest'
  }

  get pathname () {
    let urlp = new URL(this.url)
    return urlp.pathname
  }

  constructor () {
    super()
    this.url = ''
    this.openFilePath = undefined
    this.isLoading = true
    this.readOnly = true
    this.folderPath = ''
    this.currentFolder = null
    this.items = []
    this.watcher = undefined
    this.load()
  }

  attributeChangedCallback (name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    if (name === 'url') {
      this.load()
    }
  }

  async load () {
    this.isLoading = true

    if (this.watcher && this.watchingDriveUrl !== this.origin) {
      this.watcher.close()
      this.watcher = undefined
    }

    var items = []
    if (this.isDrive) {
      let drive = this.drive

      let info = await drive.getInfo()
      this.readOnly = !info.writable

      let st
      let folderPath = this.pathname
      while (!st && folderPath !== '/') {
        try { st = await drive.stat(folderPath) }
        catch (e) { /* ignore */ }
        if (!st || !st.isDirectory()) {
          folderPath = '/' + (folderPath.split('/').slice(0, -1).filter(Boolean).join('/'))
        }
      }
      this.folderPath = folderPath

      var parentDrive = await this.getParentDriveInfo()
      items = await drive.readdir(folderPath, {includeStats: true})
      items.forEach(item => {
        item.path = joinPath(this.folderPath, item.name)
        item.url = joinPath(drive.url, item.path)
        item.shareUrl = joinPath(parentDrive.info.url, item.path.replace(parentDrive.path, ''))
      })
      items.sort((a, b) => {
        if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
        if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      this.currentFolder = await drive.stat(folderPath)
      this.currentFolder.path = folderPath
      this.currentFolder.name = folderPath.split('/').pop() || '/'

      if (!this.watcher) {
        let isFirstWatchEvent = true
        this.watchingDriveUrl = this.origin
        this.watcher = drive.watch(e => {
          // HACK
          // for some reason, the watchstream is firing 'changed' immediately
          // ignore the first emit
          // -prf
          if (isFirstWatchEvent) {
            isFirstWatchEvent = false
            return
          }
          this.load()
        })
      }
    }

    this.items = items
    this.isLoading = false
  }

  async getParentDriveInfo () {
    var drive = this.drive
    var pathParts = this.folderPath.split('/').filter(Boolean)
    while (pathParts.length) {
      let path = '/' + pathParts.join('/')
      let stat = await drive.stat(path).catch(e => undefined)
      if (stat.mount) {
        return {
          path,
          info: await beaker.hyperdrive.drive(stat.mount.key).getInfo()
        }
      }
      pathParts.pop()
    }
    return {path: '/', info: await drive.getInfo()}
  }

  // rendering
  // =

  render () {
    if (!this.items.length && this.isLoading) {
      return html`
        <div class="toolbar">
          <div>Loading...</div>
        </div>
      `
    }
    if (!this.isDrive) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="empty"><span class="fas fa-fw fa-info-circle"></span> This site doesn't support file listings</div>
      `
    }
    const icon = item => {
      if (item.stat.mount) return html`<span class="fas fa-fw fa-external-link-square-alt"></span>`
      if (item.stat.isDirectory()) return html`<span class="fa-fw fas fa-folder"></span>`
      return html`<span class="fa-fw far fa-file"></span>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="path">
        <a>
          <span class="fa-fw ${this.currentFolder.mount ? 'fas fa-external-link-square-alt' : 'far fa-folder'}"></span>
          ${this.currentFolder.name} ${this.currentFolder.mount ? html`(<code>${this.currentFolder.mount.key.slice(0, 4)}..${this.currentFolder.mount.key.slice(-2)}</code>)` : ''}
        </a>
        ${this.isLoading ? html`<span class="spinner"></span>` : ''}
      </div>
      <div class="listing" @contextmenu=${this.onContextmenuListing}>
        ${this.folderPath !== '/' ? html`
          <div class="item" @click=${this.onClickUpdog}>
            <span class="icon"><span class="fa-fw fas fa-level-up-alt"></span></span>
            <span class="name">..</span>
          </div>
        ` : ''}
        ${repeat(this.items, item => html`
          <div class=${classMap({item: true, selected: item.path === this.openFilePath})}
            @click=${e => this.onClickItem(e, item)}
            @contextmenu=${e => this.onContextmenuItem(e, item)}
          >
            <span class="icon">${icon(item)}</span>
            <span class="name">
              ${item.name}
            </span>
          </div>
        `)}
        ${!this.readOnly ? html`
          <div class=${classMap({item: true, 'new-file': true})} @click=${this.onClickNewFile}>
            <span class="icon"><span class="fas fa-fw fa-plus"></span></span>
            <span class="name">New file</span>
          </div>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  onContextmenuListing (e) {
    e.preventDefault()
    e.stopPropagation()
    var folderItemUrls = this.items.map(item => item.url)
    emit(this, 'show-menu', {detail: {x: e.clientX, y: e.clientY, folderPath: this.folderPath, folderItemUrls}})
  }

  onContextmenuItem (e, item) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'show-menu', {detail: {x: e.clientX, y: e.clientY, folderPath: this.folderPath, item}})
  }

  onClickUpdog (e) {
    var upPath = this.folderPath.split('/').filter(Boolean).slice(0, -1).join('/')
    this.url = joinPath(this.origin, upPath)
  }

  onClickItem (e, item) {
    if (item.stat.isFile()) {
      // open the file
      let url = joinPath(this.origin, this.folderPath, item.name)
      emit(this, 'open', {bubbles: true, composed: true, detail: {url}})
    } else {
      // navigate in-UI to the folder
      this.url = joinPath(this.origin, this.folderPath, item.name)
    }
  }

  onClickNewFile (e, item) {
    e.preventDefault()
    e.stopPropagation()
    emit(this, 'new-file', {detail: {folderPath: this.folderPath}})
  }
}

customElements.define('files-explorer', FilesExplorer)
