/* globals monaco */

import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { isFilenameBinary } from '../../app-stdlib/js/is-ext-binary.js'
import lock from '../../../lib/lock.js'
import datServeResolvePath from '@beaker/dat-serve-resolve-path'
import { joinPath } from '../../app-stdlib/js/strings.js'
import * as contextMenu from '../../app-stdlib/js/com/context-menu.js'
import { writeToClipboard } from '../../app-stdlib/js/clipboard.js'
import * as toast from '../../app-stdlib/js/com/toast.js'
import './com/files-explorer.js'

class EditorApp extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      isLoading: {type: Boolean},
      isFilesOpen: {type: Boolean},
      readOnly: {type: Boolean},
      dne: {type: Boolean},
      isBinary: {type: Boolean}
    }
  }

  createRenderRoot () {
    return this // no shadow dom
  }

  get isDat () {
    return this.url && this.url.startsWith('dat:')
  }

  get archive () {
    return new DatArchive(this.url)
  }

  get origin () {
    let urlp = new URL(this.url)
    return urlp.origin
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

  get resolvedFilename () {
    return (this.resolvedPath || '').split('/').pop()
  }

  get hasFileExt () {
    var path = this.pathname
    return path.split('/').pop().includes('.')
  }

  get hasChanges () {
    var model = this.editor.getModel(this.url)
    return (
      typeof this.lastSavedVersionId !== 'undefined'
      && !!model
      && this.lastSavedVersionId !== model.getAlternativeVersionId()
    )
  }

  constructor () {
    super()
    this.editorEl = undefined
    this.editor = undefined // monaco instance
    this.url = ''
    this.stat = undefined
    this.currentTabUrl = ''
    this.isLoading = true
    this.isFilesOpen = false
    this.liveReloadMode = false
    this.readOnly = true
    this.lastSavedVersionId = undefined
    this.dne = false
    this.isBinary = false
    this.resolvedPath = ''
  }

  teardown () {
    if (this.editor) {
      this.editor.dispose()
    }
  }

  setFocus () {
    if (this.editor) {
      this.editor.focus()
    }
  }

  ensureEditorEl () {
    if (!this.editorEl) {
      this.editorEl = document.createElement('div')
      this.editorEl.id = 'monaco-editor'
    }
    this.append(this.editorEl)
  }

  async createEditor () {
    this.ensureEditorEl()
    return new Promise((resolve, reject) => {
      window.require.config({ baseUrl: 'beaker://assets/' })
      window.require(['vs/editor/editor.main'], () => {
        // we have load monaco outside of the shadow dom
        monaco.editor.defineTheme('custom-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [{ background: '222233' }],
          colors: {
            'editor.background': '#222233'
          }
        })
        let opts = {
          folding: false,
          renderLineHighlight: 'all',
          lineNumbersMinChars: 4,
          automaticLayout: true,
          fixedOverflowWidgets: true,
          roundedSelection: false,
          minimap: {enabled: false},
          theme: 'custom-dark',
          value: ''
        }
        this.editor = monaco.editor.create(this.editorEl, opts)
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, function () {
          document.querySelector('editor-app').onClickSave()
        })
        resolve()
      })
    })
  }

  async load (url) {
    var release = await lock('editor-load')
    try {
      this.isLoading = true
      if (!this.editor) {
        await this.createEditor()
      }
      if (this.url === url || !url) {
        this.isLoading = false
        return
      }
      if (this.hasChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to change files?')) {
          this.isLoading = false
          return
        }
      }
      this.url = url

      // reset the editor
      for (let model of monaco.editor.getModels()) {
        model.dispose()
      }

      console.log('Loading', url)
      this.editor.setValue('')
      this.readOnly = true
      this.dne = false
      this.isBinary = false
      this.resolvedPath = ''

      var body = ''
      if (url.startsWith('dat:')) {
        body = await this.loadDat(url)
      } else if (url.startsWith('http:') || url.startsWith('https:')) {
        this.isFilesOpen = false
        try {
          body = await beaker.browser.fetchBody(url)
        } catch (e) {
          this.dne = true
          body = ''
        }
      } else {
        this.isFilesOpen = false
        try {
          let res = await fetch(url)
          body = await res.text()
        } catch (e) {
          this.dne = true
          body = ''
        }
      }

      if (!this.dne && !this.isBinary) {
        // create a model
        let urlp2 = new URL(url)
        urlp2.pathname = this.resolvedPath || this.pathname
        let model = monaco.editor.createModel(body, null, url ? monaco.Uri.parse(urlp2.toString()) : undefined)

        // override the model syntax highlighting when the URL doesnt give enough info (no extension)
        if (body && model.getModeId() === 'plaintext') {
          let type = await beaker.browser.getResourceContentType(url)
          if (type) {
            if (type.includes('text/html')) {
              monaco.editor.setModelLanguage(model, 'html')
            } else if (type.includes('text/markdown')) {
              monaco.editor.setModelLanguage(model, 'markdown')
            } else if (type.includes('text/css')) {
              monaco.editor.setModelLanguage(model, 'css')
            } else if (type.includes('text/javascript') || type.includes('application/javascript')) {
              monaco.editor.setModelLanguage(model, 'javascript')
            }
          }
        }

        this.editor.updateOptions({
          // only enable autocomplete for html/css/js
          quickSuggestions: ['html', 'css', 'javascript'].includes(model.getModeId()),
          wordBasedSuggestions: false,
          wordWrap: 'on',
          readOnly: this.readOnly
        })
        model.updateOptions({tabSize: 2})
        this.editor.setModel(model)
        this.lastSavedVersionId = model.getAlternativeVersionId()

        var wasChanged = false
        model.onDidChangeContent(() => {
          var hasChanges = this.lastSavedVersionId !== model.getAlternativeVersionId()
          if (wasChanged !== hasChanges) {
            if (hasChanges) this.querySelector('#save-btn').removeAttribute('disabled')
            else this.querySelector('#save-btn').setAttribute('disabled', 1)
            wasChanged = hasChanges
          }
        })
      }

      this.isLoading = false
      this.requestUpdate()
    } finally {
      release()
    }
  }

  async loadDat (url) {
    var body

    // load archive meta
    let archive = new DatArchive(url)
    let [info, manifest] = await Promise.all([
      archive.getInfo(),
      archive.readFile('/dat.json', 'utf8').catch(e => '')
    ])
    try {
      manifest = JSON.parse(manifest)
    } catch (e) {
      console.debug('Failed to parse manifest', {e, manifest})
      manifest = null
    }
    console.log(info)
    this.readOnly = !info.writable

    // readonly if viewing historic version
    if (info.writable) {
      let v = this.viewedDatVersion
      if (v == +v) { // viewing a numeric version? (in the history)
        this.readOnly = true
      }
    }

    // determine the entry to load
    var entry = await datServeResolvePath(archive, manifest, url, '*/*')
    this.resolvedPath = entry ? entry.path : this.pathname
    this.stat = await archive.stat(this.resolvedPath).catch(e => undefined)

    // figure out if it's binary
    {
      let filename = this.resolvedPath.split('/').pop()
      if (filename.includes('.') && isFilenameBinary(filename)) {
        this.isBinary = true
      }
    }

    // fetch the file
    if (!this.isBinary) {
      try {
        if (!this.resolvedPath) throw new Error('dne')
        body = await archive.readFile(this.resolvedPath, 'utf8')
      } catch (e) {
        this.dne = true
        body = ''
      }
    }

    return body
  }

  loadExplorer () {
    try {
      this.querySelector('files-explorer').load()
    } catch (e) {
      console.warn(e)
    }
  }

  showMenu (x, y, folderPath, item, folderItemUrls) {
    var items = []
    if (item) {
      items.push({
        icon: 'fas fa-fw fa-external-link-alt',
        label: 'Open in new tab',
        click () {
          beaker.browser.openUrl(item.url)
        }
      })
      items.push({
        icon: 'fas fa-fw fa-share-square',
        label: 'Copy share link',
        disabled: !item.shareUrl,
        click () {
          writeToClipboard(item.shareUrl)
          toast.create('Copied to your clipboard')
        }
      })
      items.push({
        icon: 'custom-path-icon',
        label: `Copy ${item.stat.isFile() ? 'file' : 'folder'} path`,
        click () {
          writeToClipboard(item.path)
          toast.create('Copied to your clipboard')
        }
      })
      items.push('-')
      items.push({
        icon: 'fa fa-fw fa-i-cursor',
        label: 'Rename',
        disabled: this.readOnly,
        click: () => this.onClickRename(item.path)
      })
      items.push({
        icon: 'fa fa-fw fa-trash',
        label: 'Delete',
        disabled: this.readOnly,
        click: () => this.onClickDelete(item.path)
      })
      items.push('-')
      items.push({
        icon: 'fas fa-fw fa-file-export',
        label: 'Export file',
        click: () => this.onClickExportFiles([item.url])
      })
    } else {
      items.push({
        icon: 'far fa-fw fa-folder',
        label: 'New folder',
        disabled: this.readOnly,
        click: () => this.onClickNewFolder(folderPath)
      })
      items.push({
        icon: 'far fa-fw fa-file',
        label: 'New file',
        disabled: this.readOnly,
        click: () => this.onClickNewFile(folderPath)
      })
      items.push({
        icon: 'fas fa-fw fa-long-arrow-alt-right custom-link-icon',
        label: 'New link',
        disabled: this.readOnly,
        click: () => this.onClickNewLink(folderPath)
      })
      items.push('-')
      items.push({
        icon: 'fas fa-fw fa-file-import',
        label: 'Import files',
        disabled: this.readOnly,
        click: () => this.onClickImportFiles(folderPath)
      })
      items.push({
        icon: 'fas fa-fw fa-file-export',
        label: 'Export files',
        click: () => this.onClickExportFiles(folderItemUrls)
      })
    }

    contextMenu.create({
      x,
      y,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items
    })
  }

  // rendering
  // =

  render () {
    if (this.isFilesOpen) {
      this.classList.add('files-open')
    } else {
      this.classList.remove('files-open')
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      ${this.renderToolbar()}
      ${this.isFilesOpen ? html`
        <files-explorer
          url=${this.url}
          open-file-path=${this.resolvedPath}
          @open=${this.onOpenFile}
          @show-menu=${this.onShowMenu}
        ></files-explorer>
      ` : ''}
      ${this.isBinary ? html`
        <div class="empty">
          This file is not editable here.
          <div class="binary-render">
            ${(/\.(png|jpe?g|gif)$/.test(this.pathname)) ? html`<img src=${this.url}>` : ''}
            ${(/\.(mp4|webm|mov)$/.test(this.pathname)) ? html`<video controls><source src=${this.url}></video>` : ''}
            ${(/\.(mp3|ogg)$/.test(this.pathname)) ? html`<audio controls><source src=${this.url}></audio>` : ''}
          </div>
        </div>
      ` : this.dne ? html`
        <div class="empty">
          <a @click=${e => { this.isFilesOpen = true }}>Select a file to edit</a>
        </div>
      ` : ''}
    `
  }

  updated () {
    this.ensureEditorEl()
  }

  renderToolbar () {
    return html`
      <div class="toolbar" @contextmenu=${this.onContextmenuToolbar}>
        <button class="transparent" @click=${this.onToggleFilesOpen}>
          ${this.isFilesOpen ? html`
            <span class="far fa-fw fa-folder-open"></span>
          ` : html`
            <span class="far fa-fw fa-folder"></span>
          `}
        </button>
        <span class="divider"></span>
        <button id="save-btn" title="Save" @click=${this.onClickSave} ?disabled=${this.readOnly || this.dne || !this.hasChanges}>
          <span class="fas fa-fw fa-save"></span> Save
        </button>
        <button title="View file" @click=${this.onClickView} ?disabled=${this.dne}>
          <span class="far fa-fw fa-window-maximize"></span> View file
        </button>
        <span class="divider"></span>
        ${this.isLoading ? html`
          <div><span class="fas fa-fw fa-info-circle"></span> Loading...</div>
          <span class="divider"></span>
        ` : this.readOnly ? html`
          <div><span class="fas fa-fw fa-info-circle"></span> This page is read-only</div>
          <span class="divider"></span>
        ` : ''}
        <span class="spacer"></span>
        <button title="Settings" @click=${this.onClickSettings}>
          <span class="fas fa-fw fa-cog"></span> Settings
        </button>
        <button class="primary" title="Actions" @click=${this.onClickActions}>
          Actions <span class="fas fa-caret-down"></span>
        </button>
      </div>
    `
  }

  // events
  // =

  onToggleFilesOpen (e) {
    this.isFilesOpen = !this.isFilesOpen
  }

  onOpenFile (e) {
    this.load(e.detail.url)
  }

  onShowMenu (e) {
    this.showMenu(e.detail.x, e.detail.y, e.detail.folderPath, e.detail.item, e.detail.folderItemUrls)
  }

  onContextmenuToolbar (e) {
    e.preventDefault()
    e.stopPropagation()
  }

  onClickActions (e) {
    e.preventDefault()
    e.stopPropagation()

    let rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items: [
        {
          icon: 'fa fa-fw fa-i-cursor',
          label: 'Rename',
          disabled: this.dne || this.readOnly,
          click: () => this.onClickRename(this.resolvedPath)
        },
        {
          icon: 'fa fa-fw fa-trash',
          label: 'Delete',
          disabled: this.dne || this.readOnly,
          click: () => this.onClickDelete(this.resolvedPath)
        },
        '-',
        {
          icon: 'fas fa-fw fa-file-export',
          label: 'Export file',
          disabled: this.dne,
          click: () => this.onClickExportFiles(this.resolvedPath)
        }
      ]
    })
  }

  onClickSettings (e) {
    e.preventDefault()
    e.stopPropagation()

    let rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      noBorders: true,
      roomy: true,
      items: [
        {
          icon: 'fas fa-fw fa-bolt',
          label: `${this.liveReloadMode ? 'Disable' : 'Enable'} live reload`,
          click: () => {
            this.liveReloadMode = !this.liveReloadMode
          }
        }
      ]
    })
  }

  onClickView () {
    this.currentTabUrl = this.url
    beaker.browser.gotoUrl(this.url)
  }

  async onClickSave () {
    if (this.readOnly) return
    var model = this.editor.getModel(this.url)
    let st = await this.archive.stat(this.resolvedPath).catch(e => undefined)
    let metadata = st && st.metadata ? st.metadata : undefined
    await this.archive.writeFile(this.resolvedPath, model.getValue(), {metadata})
    this.lastSavedVersionId = model.getAlternativeVersionId()
    if (this.liveReloadMode) beaker.browser.gotoUrl(this.url)
  }

  async onClickRename (oldpath) {
    if (this.readOnly) return
    var folderPath = oldpath.split('/').slice(0, -1).join('/')
    var oldname = oldpath.split('/').pop()
    var newname = prompt('Enter the new name of this file', oldname)
    if (!newname) return
    var newpath = joinPath(folderPath, newname)
    await this.archive.rename(oldpath, newpath)

    this.loadExplorer()
    if (this.resolvedPath === oldpath) {
      var urlp = new URL(this.url)
      urlp.pathname = newpath
      this.load(urlp.toString())
      if (this.liveReloadMode) beaker.browser.gotoUrl(urlp.toString())
    }
  }

  async onClickDelete (path) {
    if (this.readOnly) return
    if (confirm('Are you sure you want to delete this file?')) {
      let st = await this.archive.stat(path)
      if (st.mount && st.mount.key) {
        await this.archive.unmount(path)
      } else if (st.isDirectory()) {
        await this.archive.rmdir(path, {recursive: true})
      } else {
        await this.archive.unlink(path)
      }

      this.loadExplorer()
      if (this.resolvedPath === path) {
        this.load(this.url)
        if (this.liveReloadMode) beaker.browser.gotoUrl(this.url)
      }
    }
  }

  async onClickNewFolder (folderPath) {
    if (this.readOnly) return
    var name = prompt('Enter the new folder name')
    if (name) {
      let path = joinPath(folderPath, name)
      await this.archive.mkdir(path)
      this.loadExplorer()
    }
  }

  async onClickNewFile (folderPath) {
    if (this.readOnly) return
    var name = prompt('Enter the new file name')
    if (name) {
      let path = joinPath(folderPath, name)
      await this.archive.writeFile(path, '')
      this.loadExplorer()
    }
  }

  async onClickNewLink (folderPath) {
    if (this.readOnly) return
    var url = await navigator.selectDriveDialog()
    if (!url) return
    var name = await prompt('Enter the new link name')
    if (!name) return
    await this.archive.mount(joinPath(folderPath, name), url)
    this.loadExplorer()
  }

  async onClickImportFiles (folderPath) {
    toast.create('Importing...')
    try {
      await navigator.importFilesDialog(joinPath(this.archive.url, folderPath))
      toast.create('Import complete', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
    this.loadExplorer()
  }

  async onClickExportFiles (urls) {
    toast.create('Exporting...')
    try {
      await navigator.exportFilesDialog(urls)
      toast.create('Export complete', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }
}

customElements.define('editor-app', EditorApp)
