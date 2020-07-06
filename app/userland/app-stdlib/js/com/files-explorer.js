import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import { format as formatBytes } from '../../vendor/bytes/index.js'
import * as contextMenu from './context-menu.js'
import * as toast from './toast.js'
import { joinPath } from '../strings.js'
import { emit } from '../dom.js'
import { writeToClipboard } from '../clipboard.js'
import sidebarFilesViewCSS from '../../css/com/files-explorer.css.js'

class FilesExplorer extends LitElement {
  static get properties () {
    return {
      url: {type: String, reflect: true},
      isRoot: {type: Boolean, attribute: 'is-root'},
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
    return urlp.origin + '/'
  }

  get viewedDatVersion () {
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
    this.isRoot = false
    this.isLoading = true
    this.readOnly = true
    this.folderPath = ''
    this.currentFolder = null
    this.items = []
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
          folderPath = (folderPath.split('/').slice(0, -1).filter(Boolean).join('/')) || '/'
        }
      }
      this.folderPath = folderPath

      items = await drive.readdir(folderPath, {includeStats: true})
      items.sort((a, b) => {
        if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
        if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

      this.currentFolder = await drive.stat(folderPath)
      this.currentFolder.path = folderPath
      this.currentFolder.name = folderPath.split('/').pop() || '/'
    }

    this.items = items
    this.isLoading = false
  }

  // rendering
  // =

  render () {
    if (this.isLoading) {
      return html`
        <div class="toolbar">
          <div>Loading...</div>
        </div>
      `
    }
    if (!this.isDrive) {
      return html`
        <link rel="stylesheet" href="beaker://assets/font-awesome.css">
        <div class="toolbar">
          <div><span class="fas fa-fw fa-info-circle"></span> This site doesn't support file listings</div>
        </div>
      `
    }
    const icon = item => {
      if (item.stat.mount) return html`<span class="fas fa-fw fa-external-link-square-alt"></span>`
      if (item.stat.isDirectory()) return html`<span class="fa-fw fas fa-folder"></span>`
      return html`<span class="fa-fw far fa-file"></span>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="toolbar">
        ${this.readOnly ? html`
          <div><span class="fas fa-fw fa-info-circle"></span> This site is read-only</div>
        ` : html`
          <button class="transparent" @click=${this.onClickNewFolder}>New folder</button>
          <button class="transparent" @click=${this.onClickNewFile}>New file</button>
          <button class="transparent" @click=${this.onClickAdditionalActions}><span class="fas fa-fw fa-ellipsis-h"></span></button>
        `}
        ${this.isRoot ? html`
          <span style="margin-right: 40px; margin-left: auto">
            <span class="far fa-fw fa-hdd" style="margin: 0 5px"></span>
            This is your private filesystem
          </span>
        ` : ''}
      </div>
      <div class="path">
        <a @contextmenu=${this.onContextmenuCurrentFolder}>
          <span class="fa-fw ${this.currentFolder.mount ? 'fas fa-external-link-square-alt' : 'far fa-folder'}"></span>
          ${this.currentFolder.name} ${this.currentFolder.mount ? html`(<code>${this.currentFolder.mount.key.slice(0, 4)}..${this.currentFolder.mount.key.slice(-2)}</code>)` : ''}
        </a>
      </div>
      <div class="listing" @contextmenu=${this.onContextmenuListing}>
        ${this.folderPath !== '/' ? html`
          <div class="item" @click=${this.onClickUpdog}>
            <span class="icon"><span class="fa-fw fas fa-level-up-alt"></span></span>
            <span class="name">..</span>
          </div>
        ` : ''}
        ${repeat(this.items, item => html`
          <div class="item" @click=${e => this.onClickItem(e, item)} @contextmenu=${e => this.onContextmenuItem(e, item)}>
            <span class="icon">${icon(item)}</span>
            <span class="name">
              ${item.name}
            </span>
            <span class="size">
              ${item.stat.size ? formatBytes(item.stat.size) : ''}
            </span>
          </div>
        `)}
      </div>
    `
  }

  // events
  // =

  onContextmenuListing (e) {
    e.preventDefault()
    e.stopPropagation()

    contextMenu.create({
      x: e.clientX,
      y: e.clientY,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items: [
        {
          icon: 'far fa-fw fa-folder',
          label: 'New folder',
          click: () => this.onClickNewFolder()
        },
        {
          icon: 'far fa-fw fa-file',
          label: 'New file',
          click: () => this.onClickNewFile()
        },
        {
          icon: 'fas fa-fw fa-upload',
          label: 'Import files',
          click: () => this.onClickImportFiles()
        },
        {
          icon: 'fas fa-fw fa-external-link-square-alt',
          label: 'Mount',
          click: () => this.onClickMount()
        }
      ]
    })
  }

  onContextmenuItem (e, item) {
    e.preventDefault()
    e.stopPropagation()

    var url = joinPath(this.origin, this.folderPath || '', item.name || '')
    var items = []
    items.push({
      icon: 'fas fa-fw fa-external-link-alt',
      label: `Open in new tab`,
      click: () => {
        beaker.browser.openUrl(url, {setActive: true})
      }
    })
    if (item.stat.isFile()) {
      items.push({
        icon: 'fas fa-fw fa-edit',
        label: `Edit file`,
        click: () => {
          beaker.browser.openUrl(`beaker://editor/?url=${url}`, {setActive: true})
        }
      })
    }
    items.push({
      icon: 'fas fa-fw fa-link',
      label: `Copy URL`,
      click () {
        writeToClipboard(url)
        toast.create('Copied to your clipboard')
      }
    })
    items.push({
      icon: 'fa fa-fw fa-i-cursor',
      label: 'Rename',
      click: async () => {
        var newname = prompt(`Enter the new name for this ${item.stat.isDirectory() ? 'folder' : 'file'}`, item.name)
        if (!newname) return
        var oldpath = joinPath(this.folderPath, item.name)
        var newpath = joinPath(this.folderPath, newname)
        await this.drive.rename(oldpath, newpath)
        if (oldpath === this.pathname) {
          beaker.browser.gotoUrl(joinPath(this.origin, newpath))
        } else {
          this.load()
        }
      }
    })
    if (item.stat.mount) {
      items = items.concat([
        '-',
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: `Open mount in new tab`,
          click: () => {
            beaker.browser.openUrl(`hyper://${item.stat.mount.key}/`, {setActive: true})
          }
        },
        {
          icon: 'fas fa-fw fa-link',
          label: `Copy Mount URL`,
          click () {
            writeToClipboard(`hyper://${item.stat.mount.key}/`)
            toast.create('Copied to your clipboard')
          }
        },
        {
          icon: 'fas fa-fw fa-trash',
          label: `Unmount`,
          click: async () => {
            if (confirm(`Are you sure you want to unmount ${item.name}?`)) {
              let path = joinPath(this.folderPath, item.name)
              await this.drive.unmount(path)
              this.load()
            }
          }
        }
      ])
    } else {
      items.push({
        icon: 'fa fa-fw fa-trash',
        label: 'Delete',
        click: async () => {
          if (confirm(`Are you sure you want to delete ${item.name}?`)) {
            let path = joinPath(this.folderPath, item.name)
            if (item.stat.isDirectory()) {
              await this.drive.rmdir(path, {recursive: true})
            } else {
              await this.drive.unlink(path)
            }
            this.load()
          }
        }
      })
    }

    contextMenu.create({
      x: e.clientX,
      y: e.clientY,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items
    })
  }

  onClickAdditionalActions (e) {
    e.preventDefault()
    e.stopPropagation()

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left - 3,
      y: rect.bottom + 1,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      withTriangle: true,
      items: [
        {
          icon: 'fas fa-fw fa-external-link-square-alt',
          label: 'Mount',
          click: () => this.onClickMount()
        },
        {
          icon: 'fas fa-fw fa-upload',
          label: 'Import files',
          click: () => this.onClickImportFiles()
        },
        {
          icon: 'fas fa-fw fa-download',
          label: 'Export files',
          click: () => this.onClickExportFiles()
        }
      ]
    })
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

  onContextmenuCurrentFolder (e) {
    e.preventDefault()
    e.stopPropagation()

    var url = joinPath(this.origin, this.currentFolder.path)
    var items = []
    items.push({
      icon: 'fas fa-fw fa-arrow-right',
      label: `Go to this folder`,
      click: () => {
        beaker.browser.gotoUrl(url)
      }
    })
    items.push({
      icon: 'fas fa-fw fa-external-link-alt',
      label: `Open in new tab`,
      click: () => {
        beaker.browser.openUrl(url, {setActive: true})
      }
    })
    items.push({
      icon: 'fas fa-fw fa-link',
      label: `Copy URL`,
      click () {
        writeToClipboard(url)
        toast.create('Copied to your clipboard')
      }
    })
    if (this.currentFolder.mount) {
      items = items.concat([
        '-',
        {
          icon: 'fas fa-fw fa-external-link-alt',
          label: `Open mount in new tab`,
          click: () => {
            beaker.browser.openUrl(`hyper://${this.currentFolder.mount.key}/`, {setActive: true})
          }
        },
        {
          icon: 'fas fa-fw fa-link',
          label: `Copy Mount URL`,
          click () {
            writeToClipboard(`hyper://${this.currentFolder.mount.key}/`)
            toast.create('Copied to your clipboard')
          }
        }
      ])
    }

    contextMenu.create({
      x: e.clientX,
      y: e.clientY,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items
    })
  }

  async onClickNewFolder (e) {
    if (this.readOnly) return
    var name = prompt('Enter the new folder name')
    if (name) {
      let path = joinPath(this.folderPath, name)
      await this.drive.mkdir(path)
      this.load()
    }
  }

  async onClickNewFile (e) {
    if (this.readOnly) return
    var name = prompt('Enter the new file name')
    if (name) {
      let path = joinPath(this.folderPath, name)
      await this.drive.writeFile(path, '')
      this.load()
    }
  }

  async onClickImportFiles (e) {
    if (this.readOnly) return

    let browserInfo = await beaker.browser.getInfo()
    var osCanImportFoldersAndFiles = browserInfo.platform === 'darwin'

    var files = await beaker.browser.showOpenDialog({
      title: 'Import files',
      buttonLabel: 'Import',
      properties: ['openFile', osCanImportFoldersAndFiles ? 'openDirectory' : false, 'multiSelections', 'createDirectory'].filter(Boolean)
    })
    if (files) {
      for (let src of files) {
        await beaker.hyperdrive.importFromFilesystem({
          src,
          dst: joinPath(this.origin, this.folderPath),
          ignore: ['index.json'],
          inplaceImport: false
        })
      }
      this.load()
    }
  }

  async onClickExportFiles (e) {
    beaker.browser.downloadURL(`${this.origin}?download_as=zip`)
  }

  async onClickMount (e) {
    if (this.readOnly) return

    var url = await beaker.shell.selectDriveDialog()
    if (!url) return
    var name = await prompt('Enter the mount name')
    if (!name) return
    await this.drive.mount(name, url)
    this.load()
  }
}

customElements.define('files-explorer', FilesExplorer)
