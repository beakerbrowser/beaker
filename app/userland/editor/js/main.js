/* globals monaco */

import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from '../../app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { isFilenameBinary } from '../../app-stdlib/js/is-ext-binary.js'
import lock from '../../../lib/lock.js'
import datServeResolvePath from '@beaker/dat-serve-resolve-path'
import { joinPath } from '../../app-stdlib/js/strings.js'
import * as contextMenu from '../../app-stdlib/js/com/context-menu.js'
import { writeToClipboard } from '../../app-stdlib/js/clipboard.js'
import * as toast from '../../app-stdlib/js/com/toast.js'
import './com/files-explorer.js'
import { ResizeImagePopup } from './com/resize-image-popup.js'

class EditorApp extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      isUnloaded: {type: Boolean},
      isLoading: {type: Boolean},
      showLoadingNotice: {type: Boolean},
      isFilesOpen: {type: Boolean},
      readOnly: {type: Boolean},
      dne: {type: Boolean},
      isBinary: {type: Boolean}
    }
  }

  createRenderRoot () {
    return this // no shadow dom
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

  get resolvedFilename () {
    return (this.resolvedPath || '').split('/').pop()
  }

  get resolvedUrl () {
    return this.origin + this.resolvedPath
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
    beaker.panes.setAttachable()
    this.editorEl = undefined
    this.editor = undefined // monaco instance
    this.attachedPane = undefined
    this.url = ''
    this.isUnloaded = true
    this.stat = undefined
    this.isLoading = false
    this.showLoadingNotice = false
    this.isFilesOpen = true
    this.readOnly = true
    this.lastSavedVersionId = undefined
    this.dne = false
    this.isBinary = false
    this.resolvedPath = ''
    this.setFocusOnLoad = false

    beaker.panes.addEventListener('pane-attached', e => {
      this.attachedPane = beaker.panes.getAttachedPane()
      if (this.url !== this.attachedPane.url) {
        this.load(this.attachedPane.url)
      }
    })
    beaker.panes.addEventListener('pane-detached', e => {
      this.attachedPane = undefined
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      if (this.url !== e.detail.url) {
        this.load(e.detail.url)
      }
    })

    ;(async () => {
      this.attachedPane = await beaker.panes.attachToLastActivePane()
      if (this.attachedPane) {
        this.load(this.attachedPane.url)
      } else {
        let ctx = (new URLSearchParams(location.search)).get('url')
        if (ctx) this.load(ctx)
      }
    })()
  }

  teardown () {
    if (this.editor) {
      this.editor.dispose()
    }
  }

  getContext () {
    return this.url
  }

  setFocus () {
    if (this.editor) {
      this.editor.focus()
    } else {
      this.setFocusOnLoad = true
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
        // update monaco to syntax-highlight <script type="module">
        var jsLang = monaco.languages.getLanguages().find(lang => lang.id === 'javascript')
        if (jsLang) {
          jsLang.mimetypes.push('module')
          monaco.languages.register(jsLang)
        }

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
          links: false,
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

  resetEditor () {
    for (let model of monaco.editor.getModels()) {
      model.dispose()
    }

    this.editor.setValue('')
    this.readOnly = true
    this.dne = false
    this.isBinary = false
    this.resolvedPath = ''
    this.showLoadingNotice = true
  }

  async load (url, forceLoad = false) {
    var release = await lock('editor-load')
    try {
      this.isUnloaded = false
      this.isLoading = true
      if (!this.editor) {
        await this.createEditor()
      }
      if (this.editor.hasTextFocus()) {
        this.setFocusOnLoad = true
      }
      if (!forceLoad && (this.url === url || !url)) {
        this.isLoading = false
        setTimeout(() => this.editor.focus(), 1)
        this.setFocusOnLoad = false
        return
      }
      if (this.hasChanges) {
        if (!confirm('You have unsaved changes. Are you sure you want to navigate away?')) {
          this.isLoading = false
          return
        }
      }
      this.url = url
      history.replaceState({}, '', `/?url=${url}`)
      this.attachedPane = beaker.panes.getAttachedPane()
      if (this.attachedPane && this.attachedPane.url !== this.url) {
        beaker.panes.navigate(this.attachedPane.id, this.url)
      }

      this.resetEditor()
      console.log('Loading', url)

      var body = ''
      try {
        if (url.startsWith('hyper:')) {
          body = await this.loadDrive(url)
        } else if (url.startsWith('http:') || url.startsWith('https:')) {
          this.isFilesOpen = false
          body = await beaker.browser.fetchBody(url)
        } else {
          this.isFilesOpen = false
          let res = await fetch(url)
          body = await res.text()
        }
      } catch (e) {
        this.dne = true
        body = ''
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

        model.onDidChangeContent(() => {
          this.setSaveBtnState()
        })
      }

      this.isLoading = false
      this.showLoadingNotice = false
      this.requestUpdate()

      if (this.setFocusOnLoad) {
        setTimeout(() => this.editor.focus(), 1)
        this.setFocusOnLoad = false
      }
    } finally {
      release()
    }
  }

  async loadDrive (url) {
    var body

    // load drive meta
    let drive = beaker.hyperdrive.drive(url)
    let [info, manifest] = await Promise.all([
      drive.getInfo(),
      drive.readFile('/index.json', 'utf8').catch(e => '')
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
    var entry = await datServeResolvePath(drive, manifest, url, '*/*')
    this.resolvedPath = entry ? entry.path : this.pathname
    var stat = await drive.stat(this.resolvedPath)
    if (!stat.isFile()) throw new Error('Not a file')
    this.stat = stat

    // check for mount information
    this.mountInfo = undefined
    {
      let pathParts = this.resolvedPath.split('/').filter(Boolean)
      let realPathParts = [pathParts.pop()]
      while (pathParts.length) {
        let path = '/' + pathParts.join('/')
        let stat = await drive.stat(path).catch(e => undefined)
        if (stat && stat.mount) {
          this.mountInfo = await beaker.hyperdrive.drive(stat.mount.key).getInfo()
          this.mountInfo.resolvedPath = '/' + realPathParts.join('/')
          break
        }
        realPathParts.unshift(pathParts.pop())
      }
    }

    // figure out if it's binary
    {
      let filename = this.resolvedPath.split('/').pop()
      if (filename.includes('.') && isFilenameBinary(filename)) {
        this.isBinary = true
      } else if (filename.endsWith('.goto')) {
        this.isBinary = true
      }
    }

    // fetch the file
    if (!this.isBinary) {
      try {
        if (!this.resolvedPath) throw new Error('dne')
        body = await drive.readFile(this.resolvedPath, 'utf8')
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

  setSaveBtnState () {
    if (this.readOnly || this.dne || !this.hasChanges) {
      this.querySelector('#save-btn').setAttribute('disabled', '')
    } else {
      this.querySelector('#save-btn').removeAttribute('disabled')
    }
  }

  async showMenu (x, y, folderPath, item, folderItemUrls) {
    var items = []
    if (item) {
      items.push({
        label: 'Open in New Tab',
        click () {
          beaker.browser.openUrl(item.url)
        }
      })
      items.push({
        label: 'Copy Link Address',
        disabled: !item.shareUrl,
        click () {
          writeToClipboard(item.shareUrl)
          toast.create('Copied to your clipboard')
        }
      })
      if (item.stat.mount && item.stat.mount.key) {
        items.push({
          label: 'Copy Mount Target',
          click () {
            writeToClipboard(`hyper://${item.stat.mount.key}/`)
            toast.create('Copied to your clipboard')
          }
        })
      }
      items.push({
        label: `Copy ${item.stat.isFile() ? 'file' : 'folder'} path`,
        click () {
          writeToClipboard(item.path)
          toast.create('Copied to your clipboard')
        }
      })
      items.push({type: 'separator'})
      items.push({
        label: 'Open in Pane Right',
        click: () => {
          beaker.browser.newPane(item.shareUrl, {splitDir: 'vert'})
        }
      })
      items.push({
        label: 'Open in Pane Below',
        click: () => {
          beaker.browser.newPane(item.shareUrl, {splitDir: 'horz'})
        }
      })
      items.push({type: 'separator'})
      items.push({
        label: 'Rename',
        disabled: this.readOnly,
        click: () => this.onClickRename(item.path)
      })
      items.push({
        label: 'Delete',
        disabled: this.readOnly,
        click: () => this.onClickDelete(item.path)
      })
      items.push({type: 'separator'})
      items.push({
        label: 'Refresh Files',
        click: () => this.loadExplorer()
      })
      items.push({
        label: 'Export',
        click: () => this.onClickExportFiles([item.url])
      })
    } else {
      items.push({id: 'builtin:back'})
      items.push({id: 'builtin:forward'})
      items.push({id: 'builtin:reload'})
      items.push({type: 'separator'})
      items.push({id: 'builtin:split-pane-vert'})
      items.push({id: 'builtin:split-pane-horz'})
      items.push({id: 'builtin:move-pane'})
      items.push({id: 'builtin:close-pane'})
      items.push({type: 'separator'})
      items.push({
        label: 'New Folder',
        disabled: this.readOnly,
        click: () => this.onClickNewFolder(folderPath)
      })
      items.push({
        label: 'New File',
        disabled: this.readOnly,
        click: () => this.onClickNewFile(folderPath)
      })
      items.push({
        label: 'New Mount',
        disabled: this.readOnly,
        click: () => this.onClickNewMount(folderPath)
      })
      items.push({type: 'separator'})
      items.push({
        label: 'Refresh Files',
        click: () => this.loadExplorer()
      })
      items.push({type: 'separator'})
      items.push({
        label: 'Import File(s)',
        disabled: this.readOnly,
        click: () => this.onClickImportFiles(folderPath)
      })
      items.push({
        label: 'Import Folder(s)',
        disabled: this.readOnly,
        click: () => this.onClickImportFolders(folderPath)
      })
      items.push({
        label: 'Export Files',
        click: () => this.onClickExportFiles(folderItemUrls)
      })
    }
    items.push({type: 'separator'})
    items.push({id: 'builtin:inspect-element'})

    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }

    var choice = await beaker.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
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
      ${!this.isUnloaded && this.isFilesOpen ? html`
        <files-explorer
          url=${this.url}
          open-file-path=${this.resolvedPath}
          @open=${this.onOpenFile}
          @show-menu=${this.onShowMenu}
          @new-file=${this.onFilesExplorerNewFile}
        ></files-explorer>
      ` : ''}
      ${this.isBinary && this.pathname.endsWith('.goto') ? html`
        <div class="empty">
          .goto files store their information in
          <a href="#" @click=${e => {
            e.preventDefault()
            e.stopPropagation()
            this.querySelector('#file-metadata-btn').click()
          }}>file metadata</a>.
        </div>
      ` : this.isBinary ? html`
        <div class="empty">
          ${(/\.(png|jpe?g)$/.test(this.pathname)) ? html`
            <button class="primary btn" @click=${this.onClickResizeImage}>Resize Image</button>
          ` : 'This file is not editable here.'}
          <div class="binary-render">
            ${(/\.(png|jpe?g|gif)$/.test(this.pathname)) ? html`<img src="${this.url}?cache_buster=${Date.now()}">` : ''}
            ${(/\.(mp4|webm|mov)$/.test(this.pathname)) ? html`<video controls><source src="${this.url}?cache_buster=${Date.now()}"></video>` : ''}
            ${(/\.(mp3|ogg)$/.test(this.pathname)) ? html`<audio controls><source src="${this.url}?cache_buster=${Date.now()}"></audio>` : ''}
          </div>
        </div>
      ` : this.dne ? html`
        <div class="empty">
          <a @click=${e => { this.isFilesOpen = true }}>Select a file</a>
          ${!this.readOnly ? html` or <a @click=${e => { this.onClickNewFile(this.resolvedPath) }}>Create a file</a>` : ''}
        </div>
      ` : ''}
      ${this.showLoadingNotice ? html`<div id="loading-notice">Loading...</div>` : ''}
    `
  }

  updated (changedProperties) {
    this.ensureEditorEl()
    if (changedProperties.has('isFilesOpen')) {
      if (this.editor) {
        this.editor.layout()
      }
    }
  }

  renderToolbar () {
    return html`
      <div class="toolbar">
        <button class="transparent" @click=${this.onToggleFilesOpen} ?disabled=${this.isUnloaded}>
          <span class="fas fa-fw fa-ellipsis-h"></span>
        </button>
        <span class="divider"></span>
        <button title="Open..." @click=${this.onClickOpen}>
          <span class="far fa-fw fa-folder-open"></span> Open...
        </button>
        ${!this.readOnly ? html`
          <button id="save-btn" title="Save" @click=${this.onClickSave} ?disabled=${this.dne || !this.hasChanges}>
            <span class="fas fa-fw fa-save"></span> Save
          </button>
        ` : ''}
        <button title="View file" @click=${this.onClickView} ?disabled=${this.dne || this.isUnloaded}>
          <span class="far fa-fw fa-window-maximize"></span> View file
        </button>
        ${this.isLoading ? html`
          <div><span class="fas fa-fw fa-info-circle"></span> Loading...</div>
          <span class="divider"></span>
        ` : this.readOnly && !this.isUnloaded ? html`
          <div><span class="fas fa-fw fa-info-circle"></span> This site is read-only</div>
          <span class="divider"></span>
          ${this.mountInfo && this.mountInfo.writable ? html`
            <span style="margin-left: 8px">You own this file</span>
            <button class="primary" @click=${this.onClickEditReal}>
              Edit it in New Tab
            </button>
          ` : ''}
        ` : ''}
        <span class="spacer"></span>
        <button id="file-metadata-btn" title="File Metadata" ?disabled=${!this.stat} @click=${this.onClickFileMetadata}>
          File Metadata <span class="fas fa-fw fa-caret-down"></span>
        </button>
        ${!this.readOnly ? html`
          <button class="primary" title="Actions" @click=${this.onClickActions}>
            Actions <span class="fas fa-caret-down"></span>
          </button>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  onToggleFilesOpen (e) {
    this.isFilesOpen = !this.isFilesOpen
  }

  onOpenFile (e) {
    if (this.hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to navigate away?')) {
        return
      }
    }
    this.load(e.detail.url)
  }

  onShowMenu (e) {
    this.showMenu(e.detail.x, e.detail.y, e.detail.folderPath, e.detail.item, e.detail.folderItemUrls)
  }

  onFilesExplorerNewFile (e) {
    this.onClickNewFile(e.detail.folderPath)
  }

  async onClickActions (e) {
    let el = e.currentTarget
    if (el.classList.contains('active')) return
    e.preventDefault()
    e.stopPropagation()
    let rect = e.currentTarget.getClientRects()[0]
    el.classList.add('active')
    await contextMenu.create({
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
          label: 'Export',
          disabled: this.dne,
          click: () => this.onClickExportFiles(this.resolvedUrl)
        }
      ]
    })
    el.classList.remove('active')
  }

  onClickEditReal (e) {
    beaker.browser.openUrl(`beaker://editor?url=${this.mountInfo.url + this.mountInfo.resolvedPath}`, {
      setActive: true,
      adjacentActive: true
    })
  }

  async onClickFileMetadata (e) {
    let el = e.currentTarget
    if (el.classList.contains('active')) return
    e.preventDefault()
    e.stopPropagation()
    let rect = e.currentTarget.getClientRects()[0]
    el.classList.add('active')
    await contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      render: () => {
        var entries = Object.entries(this.stat.metadata)
        if (!this.readOnly) entries = entries.concat([['', '']])
        const onClickSaveMetadata = async (e) => {
          var metadataEl = e.currentTarget.parentNode
          var newMetadata = {}
          for (let entryEl of Array.from(metadataEl.querySelectorAll('.entry'))) {
            let k = entryEl.querySelector('[name="key"]').value.trim()
            let v = entryEl.querySelector('[name="value"]').value.trim()
            if (k && v) newMetadata[k] = v
          }
          var deletedKeys = []
          for (let k in this.stat.metadata) {
            if (!(k in newMetadata)) deletedKeys.push(k)
          }
          await this.drive.updateMetadata(this.resolvedPath, newMetadata)
          if (deletedKeys.length) {
            await this.drive.deleteMetadata(this.resolvedPath, deletedKeys)
          }
          this.stat.metadata = newMetadata
          contextMenu.destroy()
        }
        return html`
          <style>
          .dropdown-items {
            padding: 6px;
            border: 0;
          }
          .metadata {
            width: 100%;
            border-bottom: 1px solid #ccd;
          }
          .metadata .entry {
            display: flex;
            border: 1px solid #ccd;
            border-bottom: 0;
          }
          .metadata input {
            box-sizing: border-box;
            border: 0;
            border-radius: 0;
            height: 22px;
            padding: 0 4px;
          }
          .metadata input[name="key"] {
            border-right: 1px solid #ccd;
            flex: 0 0 120px;
          }
          .metadata input[name="value"] {
            flex: 1;
            box-sizing: border-box;
          }
          button {
            display: block;
            width: 100%;
            cursor: pointer;
            border-bottom-left-radius: 3px;
            border-bottom-right-radius: 3px;
            padding: 5px 10px;
            outline: 0px;
            color: rgb(255, 255, 255);
            box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 1px;
            background: rgb(82, 137, 247);
            border: 1px solid rgb(40, 100, 220);
          }
          </style>
          <div class="dropdown-items right">
            <div class="metadata">
              ${repeat(entries, entry => `meta-${entry[0]}`, ([k, v]) => html`
                <div class="entry">
                  <input type="text" name="key" value=${k} ?disabled=${this.readOnly} placeholder="Key">
                  <input type="text" name="value" value=${v} ?disabled=${this.readOnly} placeholder="Value">
                </div>
              `)}
              ${!this.readOnly ? html`
                <button class="primary" @click=${onClickSaveMetadata}><span class="fas fa-fw fa-check"></span> Save</button>
              ` : ''}
            </div>
          </div>
        `
      }
    })
    el.classList.remove('active')
  }

  async onClickResizeImage (e) {
    e.preventDefault()
    var dataUrl = await ResizeImagePopup.create(this.url)
    var base64buf = dataUrl.split(',').pop()
    await this.drive.writeFile(this.resolvedPath, base64buf, 'base64')
  }

  async onClickView () {
    this.attachedPane = beaker.panes.getAttachedPane()
    if (!this.attachedPane) {
      this.attachedPane = await beaker.panes.create(this.url, {attach: true})
    } else {
      beaker.panes.navigate(this.attachedPane.id, this.url)
    }
  }

  async onClickOpen () {
    var url = await beaker.shell.selectDriveDialog()
    if (url) this.load(url)
  }

  async onClickSave () {
    if (this.readOnly) return
    var model = this.editor.getModel(this.url)
    let st = await this.drive.stat(this.resolvedPath).catch(e => undefined)
    let metadata = st && st.metadata ? st.metadata : undefined
    await this.drive.writeFile(this.resolvedPath, model.getValue(), {metadata})
    this.lastSavedVersionId = model.getAlternativeVersionId()
    if (this.attachedPane) {
      beaker.panes.navigate(this.attachedPane.id, this.url)
    }
    this.setSaveBtnState()
    this.setFocus()
  }

  async onClickRename (oldpath) {
    if (this.readOnly) return
    var folderPath = oldpath.split('/').slice(0, -1).join('/')
    var oldname = oldpath.split('/').pop()
    var newname = prompt('Enter the new name of this file', oldname)
    if (!newname) return
    var newpath = joinPath(folderPath, newname)
    await this.drive.rename(oldpath, newpath)

    this.loadExplorer()
    if (this.resolvedPath === oldpath) {
      var urlp = new URL(this.url)
      urlp.pathname = newpath
      this.load(urlp.toString())
    }
  }

  async onClickDelete (path) {
    if (this.readOnly) return
    if (confirm('Are you sure you want to delete this file?')) {
      let st = await this.drive.stat(path)
      if (st.mount && st.mount.key) {
        await this.drive.unmount(path)
      } else if (st.isDirectory()) {
        await this.drive.rmdir(path, {recursive: true})
      } else {
        await this.drive.unlink(path)
      }

      this.loadExplorer()
      if (this.resolvedPath === path) {
        this.load(this.url)
      }
    }
  }

  async onClickNewFolder (folderPath) {
    if (this.readOnly) return
    var name = prompt('Enter the new folder name')
    if (name) {
      let path = joinPath(folderPath, name)
      await this.drive.mkdir(path)
      this.loadExplorer()
    }
  }

  async onClickNewFile (folderPath) {
    if (this.readOnly) return
    var name = prompt('Enter the new file name')
    if (name) {
      let path = joinPath(folderPath, name)
      await this.drive.writeFile(path, '')
      this.loadExplorer()
      this.load(joinPath(this.drive.url, path), true)
    }
  }

  async onClickNewMount (folderPath) {
    if (this.readOnly) return
    var url = await beaker.shell.selectDriveDialog()
    if (!url) return
    var name = await prompt('Enter the new mount name')
    if (!name) return
    await this.drive.mount(joinPath(folderPath, name), url)
    this.loadExplorer()
  }

  async onClickImportFiles (folderPath) {
    toast.create('Importing...')
    try {
      var {numImported} = await beaker.shell.importFilesDialog(joinPath(this.drive.url, folderPath))
      if (numImported > 0) toast.create('Import complete', 'success')
      else toast.destroy()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
    this.loadExplorer()
  }

  async onClickImportFolders (folderPath) {
    toast.create('Importing...')
    try {
      var {numImported} = await beaker.shell.importFoldersDialog(joinPath(this.drive.url, folderPath))
      if (numImported > 0) toast.create('Import complete', 'success')
      else toast.destroy()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
    this.loadExplorer()
  }

  async onClickExportFiles (urls) {
    toast.create('Exporting...')
    try {
      var {numExported} = await beaker.shell.exportFilesDialog(urls)
      if (numExported > 0) toast.create('Export complete', 'success')
      else toast.destroy()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onClickFork (e) {
    var urlp = new URL(this.url)
    var newDrive = await beaker.hyperdrive.forkDrive(this.url)
    var newDriveUrlp = new URL(newDrive.url)
    urlp.hostname = newDriveUrlp.hostname
    
    beaker.browser.gotoUrl(urlp.toString())
    this.load(urlp.toString())
  }
}

customElements.define('editor-app', EditorApp)
