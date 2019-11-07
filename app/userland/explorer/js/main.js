import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'
import mainCSS from '../css/main.css.js'
import './view/file.js'
import './view/folder.js'
import './view/query.js'
import './com/drive-info.js'
import './com/mount-info.js'
import './com/location-info.js'
import './com/selection-info.js'

const ICONS = {
  rootRoot: {
    data: 'fas fa-database',
    settings: 'fas fa-cog',
    library: 'fas fa-university',
    users: 'fas fa-users'
  },
  personRoot: {
    data: 'fas fa-database',
    friends: 'fas fa-user-friends'
  },
  uwg: {
    annotations: 'fas fa-tag',
    bookmarks: 'fas fa-star',
    comments: 'fas fa-comment'
  }
}

export class ExplorerApp extends LitElement {
  static get propertes () {
    return {
      selection: {type: Array},
      renderMode: {type: String}
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
    this.isNotFound = false
    this.items = []
    this.selection = []
    this.viewfileObj = undefined
    this.renderMode = undefined
    this.inlineMode = false
    this.driveTitle = undefined
    this.mountTitle = undefined
    this.load()
  }

  getRealPathname (pathname) {
    var slicePoint = this.mountInfo ? (this.mountInfo.mountPath.length + 1) : 0
    return pathname.slice(slicePoint) || '/'
  }

  getRealUrl (pathname) {
    return joinPath(this.currentDriveInfo.url, this.getRealPathname(pathname))
  }

  get filename () {
    return location.pathname.split('/').pop()
  }

  get realUrl () {
    return this.getRealUrl(location.pathname)
  }

  get realPathname () {
    return this.getRealPathname(location.pathname)
  }

  get currentDriveInfo () {
    return this.mountInfo || this.driveInfo
  }

  get currentDriveTitle () {
    return this.mountTitle || this.driveTitle
  }

  get isViewingQuery () {
    return location.pathname.endsWith('.view')
  }

  async load () {
    if (!this.user) {
      this.user = await navigator.session.get()
    }

    // read drive information
    var drive = new DatArchive(location)
    this.driveInfo = await drive.getInfo()
    this.driveInfo.ident = await navigator.filesystem.identifyDrive(drive.url)
    this.driveInfo.ident.friendsQuery = (await navigator.filesystem.query({mount: drive.url, path: '/public/friends/*'}))[0]
    this.driveInfo.ident.libraryQuery = (await navigator.filesystem.query({mount: drive.url, path: '/library/*'}))[0]

    // read location content
    try {
      this.pathInfo = await drive.stat(location.pathname)
      await this.readMountInfo()
      if (this.pathInfo.isDirectory()) {
        await this.readDirectory(drive)
      } else if (location.pathname.endsWith('.view')) {
        await this.readViewfile(drive)
      }
    } catch (e) {
      console.log(e)
      this.isNotFound = true
    }

    // apply sorting
    if (this.items) {
      this.items.sort((a, b) => a.name.localeCompare(b.name))
    }

    // view config
    if (this.pathInfo.isDirectory()) {
      this.renderMode = getSavedConfig('render-mode', 'grid')
      this.inlineMode = Boolean(getSavedConfig('inline-mode', false))
      if (!this.watchStream) {
        let currentDrive = new DatArchive(this.currentDriveInfo.url)
        this.watchStream = currentDrive.watch(this.realPathname)
        var hackSetupTime = Date.now()
        this.watchStream.addEventListener('changed', e => {
          // HACK
          // for some reason, the watchstream is firing 'changed' immediately
          // ignore if the event fires within 1s of setup
          // -prf
          if (Date.now() - hackSetupTime <= 1000) return
          this.load()
        })
      }
    } else if (/[?&]edit/.test(location.search)) {
      this.renderMode = 'editor'
    } else if (location.pathname.endsWith('.view')) {
      this.renderMode = getSavedConfig('render-mode', getVFCfg(this.viewfileObj, 'renderMode', ['grid', 'list']) || 'grid')
      this.inlineMode = Boolean(getSavedConfig('inline-mode', getVFCfg(this.viewfileObj, 'inline', [true, false]) || false))
    } else {
      this.renderMode = getSavedConfig('render-mode', 'default')
    }

    this.driveTitle = getDriveTitle(this.driveInfo)
    this.mountTitle = this.mountInfo ? getDriveTitle(this.mountInfo) : undefined
    document.title = this.filename ? `${this.currentDriveTitle} / ${this.filename}` : this.currentDriveTitle

    console.log({
      driveInfo: this.driveInfo,
      mountInfo: this.mountInfo,
      pathInfo: this.pathInfo,
      items: this.items,
      itemGroups: this.itemGroups
    })

    this.requestUpdate()
  }

  async readDirectory (drive) {
    let driveKind = ''
    if (this.currentDriveInfo.ident.isRoot) driveKind = 'root'
    if (this.currentDriveInfo.type === 'unwalled.garden/person') driveKind = 'person'

    this.items = await drive.readdir(location.pathname, {stat: true})

    for (let item of this.items) {
      item.path = this.getRealPathname(joinPath(location.pathname, item.name))
      item.drive = this.currentDriveInfo
      item.url = joinPath(item.drive.url, item.path)
      item.icon = item.stat.isDirectory() ? 'folder' : 'file'
      if (item.stat.mount) {
        item.icon = 'hdd'
        item.mountInfo = await (new DatArchive(item.stat.mount.key)).getInfo()
        switch (item.mountInfo.type) {
          case 'website': item.subicon = 'fas fa-sitemap'; break
          case 'unwalled.garden/person': item.subicon = 'fas fa-user'; break
          default: item.subicon = 'fas fa-folder'; break
        }
      } else if (item.stat.isFile() && item.name.endsWith('.view')) {
        item.icon = 'layer-group'
      } else if (driveKind === 'root' && this.realPathname === '/') {
        item.subicon = ICONS.rootRoot[item.name]
      } else if (driveKind === 'person' && this.realPathname === '/') {
        item.subicon = ICONS.personRoot[item.name]
      } else if ((driveKind === 'root' || driveKind === 'person') && this.realPathname === '/data' && item.stat.isDirectory()) {
        item.subicon = 'fas fa-database'
      } else if ((driveKind === 'root' || driveKind === 'person') && this.realPathname === '/data/unwalled.garden') {
        item.subicon = ICONS.uwg[item.name]
      }
    }
  }

  async readViewfile (drive) {
    var viewFile = await drive.readFile(location.pathname, 'utf8')
    this.viewfileObj = JSON.parse(viewFile)
    validateViewfile(this.viewfileObj)

    this.items = await navigator.filesystem.query(this.viewfileObj.query)

    // massage the items to fit same form as `readDirectory()`
    this.items.forEach(item => {
      item.name = item.path.split('/').pop()
      item.path = (new URL(item.url)).pathname
      item.icon = item.stat.isDirectory() ? 'folder' : 'file'
      if (item.stat.mount) {
        item.icon = 'hdd'
        item.mountInfo = item.mount
      } else if (item.stat.isFile() && item.name.endsWith('.view')) {
        item.icon = 'layer-group'
      }
    })

    // apply merge
    if (getVFCfg(this.viewfileObj, 'merge', ['mtime', undefined])) {
      let map = {}
      for (let item of this.items) {
        if (item.name in map) {
          map[item.name] =  (map[item.name].stat.mtime > item.stat.mtime) ? map[item.name] : item
        } else {
          map[item.name] = item
        }
      }
      this.items = Object.values(map)
    }
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

  get explorerMenu () {
    return [
      {id: 'new-drive', label: html`<span class="far fa-fw fa-hdd"></span> New hyperdrive`},
      {divider: true},
      {heading: 'Locations'},
      {id: 'filesystem', label: html`<span class="fas fa-fw fa-home"></span> <code>/</code>`},
      {id: 'library', label: html`<span class="fas fa-fw fa-university"></span> <code>/library</code>`},
      {id: 'public', label: html`<span class="fas fa-fw fa-user"></span> <code>/public</code>`},
    ]
  }

  get driveMenu () {
    return [
      {id: 'clone-drive', label: html`<span class="far fa-fw fa-clone"></span> Clone this drive`},
      {id: 'export', label: html`<span class="far fa-fw fa-file-archive"></span> Export as .zip`},
      {divider: true},
      {id: 'drive-properties', label: html`<span class="far fa-fw fa-list-alt"></span> Properties`}
    ]
  }

  get folderMenu () {
    const inFolder = this.pathInfo.isDirectory()
    return [
      {id: 'new-folder', label: html`<span class="far fa-fw fa-folder"></span> New folder`, disabled: !inFolder},
      {id: 'new-file', label: html`<span class="far fa-fw fa-file"></span> New file`, disabled: !inFolder},
      {divider: true},
      {id: 'import', label: html`<span class="fas fa-fw fa-file-import"></span> Import files...`, disabled: !inFolder},
      {id: 'add-mount', label: html`<span class="fas fa-fw fa-external-link-square-alt"></span> Mount a drive`, disabled: !inFolder}
    ]
  }

  get editMenu () {
    var items = []
    const inFile = !this.pathInfo.isDirectory()
    const numSelected = this.selection.length
    return items.concat([
      {id: 'rename', label: html`<span class="fas fa-fw fa-i-cursor"></span> Rename`, disabled: !(inFile || numSelected === 1)},
      {id: 'delete', label: html`<span class="fas fa-fw fa-trash"></span> Delete`, disabled: !(inFile || numSelected > 0)},
    ])
  }

  get renderModes () {
    if (this.pathInfo.isDirectory()) {
      return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
    } else {
      if (this.realPathname.endsWith('.md')) {
        return [['default', 'file', 'File'], ['raw', 'code', 'Raw File']]
      }
      if (this.realPathname.endsWith('.view')) {
        return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
      }
      return [['default', 'File']]
    }
  }

  get itemGroups () {
    var groups = {}
    const add = (id, label, item) => {
      if (!groups[id]) groups[id] = {id, label, items: [item]}
      else groups[id].items.push(item)
    }
    for (let i of this.items) {
      if (i.stat.mount && i.stat.mount.key) {
        switch (i.mountInfo.type) {
          case 'unwalled.garden/person': add('people', 'People', i); break
          case 'website': add('websites', 'Websites', i); break
          case 'application': add('applications', 'Applications', i); break
          case 'webterm.sh/cmd-pkg': add('commands', 'Webterm Commands', i); break
          default: add('drives', 'Drives', i)
        }
      } else if (i.stat.isDirectory()) {
        add('folders', 'Folders', i)
      } else if (i.name.endsWith('.view')) {
        add('views', 'Views', i)
      } else {
        add('files', 'Files', i)
      }
    }

    const groupsOrder = ['views', 'people', 'websites', 'applications', 'commands', 'drives', 'folders', 'files']
    var groupsArr = []
    for (let id in groups) {
      groupsArr[groupsOrder.indexOf(id)] = groups[id]
    }
    return groupsArr
  }

  // rendering
  // =

  render () {
    if (!this.driveInfo) return html``

    const renderModes = this.renderModes
    const isViewfile = this.pathInfo.isFile() && location.pathname.endsWith('.view')
    const isFolderLike = this.pathInfo.isDirectory() || isViewfile
    var selectionIsFolder = this.selection[0] ? this.selection[0].stat.isDirectory() : this.pathInfo.isDirectory()
    var selectionUrl = this.getRealUrl(this.selection[0] ? joinPath(this.realPathname, this.selection[0].name) : this.realPathname)
    var selectionName = selectionUrl.split('/').pop() || (this.realPathname === '/' ? 'drive' : selectionIsFolder ? 'folder' : 'file')
    if (this.selection[0] && this.selection[0].stat.mount) selectionUrl = `dat://${this.selection[0].stat.mount.key}`
    var downloadUrl = `${selectionUrl}${selectionIsFolder ? '?download_as=zip' : ''}`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div
        class="layout render-mode-${this.renderMode}"
        @click=${this.onClickLayout}
        @goto=${this.onGoto}
        @change-selection=${this.onChangeSelection}
        @new-drive=${this.onNewDrive}
        @new-folder=${this.onNewFolder}
        @new-file=${this.onNewFile}
        @add-mount=${this.onAddMount}
        @clone-drive=${this.onCloneDrive}
        @drive-properties=${this.onDriveProperties}
        @import=${this.onImport}
        @export=${this.onExport}
        @save=${this.onSave}
        @rename=${this.onRename}
        @delete=${this.onDelete}
      >
        <div class="menubar">
          <hover-menu .options=${this.explorerMenu} icon="fas fa-folder" current="Explorer" @change=${this.onSelectExplorerMenuItem}></hover-menu>
          <hover-menu .options=${this.driveMenu} current="Drive" @change=${this.onSelectMenuItem}></hover-menu>
          <hover-menu .options=${this.folderMenu} current="Folder" @change=${this.onSelectMenuItem}></hover-menu>
          <hover-menu .options=${this.editMenu} current="Edit" @change=${this.onSelectMenuItem}></hover-menu>
          </span>
        </div>
        ${this.pathInfo ? html`
          <nav class="left">
            <drive-info .driveInfo=${this.driveInfo} user-url=${this.user.url}></drive-info>
            ${this.mountInfo ? html`
              <mount-info .mountInfo=${this.mountInfo}></mount-info>
            ` : ''}
          </nav>
          <main>
            ${isViewfile ? html`
              <explorer-view-query
                user-url=${this.user.url}
                real-url=${this.realUrl}
                real-pathname=${this.realPathname}
                current-drive-title=${this.currentDriveTitle}
                render-mode=${this.renderMode}
                ?inline-mode=${this.inlineMode}
                .currentDriveInfo=${this.currentDriveInfo}
                .pathInfo=${this.pathInfo}
                .items=${this.items}
                .itemGroups=${this.itemGroups}
                .selection=${this.selection}
              ></explorer-view-query>
            ` : this.pathInfo.isDirectory() ? html`
              <explorer-view-folder
                user-url=${this.user.url}
                real-url=${this.realUrl}
                real-pathname=${this.realPathname}
                current-drive-title=${this.currentDriveTitle}
                render-mode=${this.renderMode}
                ?inline-mode=${this.inlineMode}
                .currentDriveInfo=${this.currentDriveInfo}
                .items=${this.items}
                .itemGroups=${this.itemGroups}
                .selection=${this.selection}
              ></explorer-view-folder>
            ` : html`
              <explorer-view-file
                user-url=${this.user.url}
                real-url=${this.realUrl}
                real-pathname=${this.realPathname}
                current-drive-title=${this.currentDriveTitle}
                render-mode=${this.renderMode}
                .currentDriveInfo=${this.currentDriveInfo}
                .pathInfo=${this.pathInfo}
                .selection=${this.selection}
              ></explorer-view-file>
            `}
          </main>
          <nav class="right">
            <section class="transparent" style="padding: 2px">
              <span class="btn-group">
                ${renderModes.map(([id, icon, label]) => html`
                  <button
                    class=${id == this.renderMode ? 'pressed' : ''}
                    @click=${e => this.onChangeRenderMode(e, id)}
                    title="Change the view to: ${label}"
                  ><span class="fas fa-${icon}"></span></button>
                `)}
              </span>
              ${isFolderLike ? html`
                <button title="Toggle inline rendering of the files" class=${this.inlineMode ? 'pressed' : ''} @click=${this.onToggleInlineMode}>
                  <span class="fas fa-eye"></span>
                </button>
                ${''/* TODO <span class="btn-group">
                  <button title="Change the current sort order">
                    <span class="fas fa-sort-amount-down"></span><span class="fas fa-caret-down"></span>
                  </button><button title="Change the grouping of files">
                    <span class="fas fa-border-all"></span><span class="fas fa-caret-down"></span>
                  </button>
                </span>*/}
              ` : ''}
            </section>
            ${this.selection.length > 0 ? html`
              <selection-info
                user-url=${this.user.url}
                .driveInfo=${this.driveInfo}
                .pathInfo=${this.pathInfo}
                .mountInfo=${this.mountInfo}
                .selection=${this.selection}
                ?no-preview=${this.inlineMode}
              ></selection-info>
            ` : html`
              <location-info
                real-pathname=${this.realPathname}
                real-url=${this.realUrl}
                render-mode=${this.renderMode}
                .driveInfo=${this.driveInfo}
                .pathInfo=${this.pathInfo}
                .mountInfo=${this.mountInfo}
              ></location-info>
            `}
            ${this.selection.length <= 1 ? html`
              <section class="transparent">
                <p><a href=${selectionUrl} target="_blank"><span class="fa-fw fas fa-external-link-alt"></span> Open ${this.selection.length ? 'selected' : ''} in new tab</a></p>
                <p><a id="download-link" href=${downloadUrl} download=${selectionName}><span class="fa-fw fas fa-file-export"></span> Export ${selectionName}</a></p>
              </section>
            ` : ''}
          ` : undefined}
          </nav>
        ${this.isNotFound ? html`
          <div style="margin: 0 20px">
            <h1>404</h1>
            <h2>File Not found</h2>
          </div>
        ` : undefined}
      </div>
      <input type="file" id="files-picker" multiple @change=${this.onChangeImportFiles} />
    `
  }

  // events
  // =

  onClickLayout (e) {
    if (findParent(e.target, el => el.tagName === 'NAV')) {
      return
    }
    this.selection = []
    this.requestUpdate()
  }

  onGoto (e) {
    var {item} = e.detail
    if (item.stat.mount) {
      window.location = `dat://${item.stat.mount.key}`
    } else if (this.isViewingQuery) {
      window.location = item.url
    } else {
      window.location = joinPath(window.location.toString(), item.name)
    }
  }

  onChangeSelection (e) {
    this.selection = e.detail.selection
    this.requestUpdate()
  }

  onChangeRenderMode (e, renderMode) {
    this.renderMode = renderMode
    setSavedConfig('render-mode', this.renderMode)
    this.requestUpdate()
  }

  onToggleInlineMode (e) {
    this.inlineMode = !this.inlineMode
    setSavedConfig('inline-mode', this.inlineMode ? '1' : '')
    this.requestUpdate()
  }

  async onSelectExplorerMenuItem (e) {
    switch (e.detail.id) {
      case 'new-drive': this.onNewDrive(); break
      case 'filesystem': window.location = navigator.filesystem.url; break
      case 'library': window.location = navigator.filesystem.url + '/library'; break
      case 'public':
        let st = await navigator.filesystem.stat('/public')
        window.location = `dat://${st.mount.key}`
        break
    }
  }

  onSelectMenuItem (e) {
    emit(e.target, e.detail.id)
  }

  async onNewDrive (e) {
    var drive = await DatArchive.create()
    toast.create('Drive created')
    window.open(drive.url)
  }

  async onNewFile (e) {
    if (!this.currentDriveInfo.writable) return
    var filename = prompt('Enter the name of your new file')
    if (filename) {
      var pathname = joinPath(this.realPathname, filename)
      var drive = new DatArchive(this.currentDriveInfo.url)
      if (await drive.stat(pathname).catch(e => false)) {
        toast.create('A file or folder already exists at that name')
        return
      }
      try {
        await drive.writeFile(pathname, '')
      } catch (e) {
        console.error(e)
        toast.create(`Error: ${e.toString()}`, 'error')
        return
      }
      window.location = window.location.origin + pathname + '?edit'
    }
  }

  async onNewFolder (e) {
    if (!this.currentDriveInfo.writable) return
    var foldername = prompt('Enter the name of your new folder')
    if (foldername) {
      var pathname = joinPath(this.realPathname, foldername)
      var drive = new DatArchive(this.currentDriveInfo.url)
      try {
        await drive.mkdir(pathname)
      } catch (e) {
        console.error(e)
        toast.create(`Error: ${e.toString()}`, 'error')
      }
    }
  }

  async onAddMount (e) {
    if (!this.currentDriveInfo.writable) return
    var drive = new DatArchive(this.currentDriveInfo.url)
    var targetUrl = await navigator.selectDriveDialog()
    var target = new DatArchive(targetUrl)
    var info = await target.getInfo()
    var name = await getAvailableName(this.realPathname, info.title, drive)
    try {
      await drive.mount(joinPath(this.realPathname, name), target.url)
    } catch (e) {
      toast.error(e.toString())
      console.error(e)
    }
    this.load()
  }

  async onCloneDrive (e) {
    var drive = await DatArchive.fork(this.currentDriveInfo.url)
    toast.create('Drive created')
    window.location = drive.url
  }

  async onDriveProperties (e) {
    await navigator.drivePropertiesDialog(this.currentDriveInfo.url)
    this.load()
  }

  onImport (e) {
    if (!this.currentDriveInfo.writable) return
    this.shadowRoot.querySelector('#files-picker').click()
  }

  onExport (e) {
   this.shadowRoot.querySelector('#download-link').click()
  }

  async onChangeImportFiles (e) {
    var files = e.target.files
    toast.create(`Importing ${files.length} files...`)
    var drive = new DatArchive(this.currentDriveInfo.url)
    try {
      for (let i = 0, file; (file = files[i]); i++) {
        let reader = new FileReader()
        let p = new Promise((resolve, reject) => {
          reader.onload = e => resolve(e.target.result)
          reader.onerror = reject
        })
        reader.readAsArrayBuffer(file)

        var buf = await p
        let pathname = joinPath(this.realPathname, file.name)
        await drive.writeFile(pathname, buf)
      }
      toast.create(`Imported ${files.length} files`, 'success')
    } catch (e) {
      toast.create(`Import failed: ${e.toString()}`, 'error')
    }
  }

  async onSave (e) {
    if (!this.currentDriveInfo.writable) return
    var value = this.shadowRoot.querySelector('explorer-view-file').editor.getValue()
    var drive = new DatArchive(this.currentDriveInfo.url)
    try {
      await drive.writeFile(this.realPathname, value, 'utf8')
    } catch (e) {
      console.error(e)
      toast.create(`Save failed: ${e.toString()}`, 'error')
      return
    }
    toast.create('Saved', 'success')
  }

  async onRename (e) {
    if (!this.currentDriveInfo.writable) return
    var oldName = this.selection[0] ? this.selection[0].name : this.filename
    var newName = prompt('Enter the new name for this file or folder', oldName)
    if (newName) {
      var oldPath = this.selection[0] ? joinPath(this.realPathname, oldName) : this.realPathname
      var newPath = oldPath.split('/').slice(0, -1).concat([newName]).join('/')
      var drive = new DatArchive(this.currentDriveInfo.url)
      try {
        await drive.rename(oldPath, newPath)
      } catch (e) {
        console.error(e)
        toast.create(`Rename failed: ${e.toString()}`, 'error')
        return
      }
      if (!this.selection[0]) {
        // redirect to new location
        location.pathname = location.pathname.split('/').slice(0, -1).concat([newName]).join('/')
      }
    }
  }

  async onDelete (e) {
    if (!this.currentDriveInfo.writable) return

    var drive = new DatArchive(this.currentDriveInfo.url)
    const del = async (pathname, stat) => {
      if (stat.mount && stat.mount.key) {
        await drive.unmount(pathname)
      } else if (stat.isDirectory()) {
        await drive.rmdir(pathname, {recursive: true})
      } else {
        await drive.unlink(pathname)
      }
    }

    try {
      if (this.selection.length) {
        if (!confirm(`Delete ${this.selection.length} ${pluralize(this.selection.length, 'item')}?`)) {
          return
        }

        toast.create(`Deleting ${pluralize(this.selection.length, 'item')}...`)
        for (let sel of this.selection) {
          await del(joinPath(this.realPathname, sel.name), sel.stat)
        }
        toast.create(`Deleted ${pluralize(this.selection.length, 'item')}`, 'success')
      } else {
        if (!confirm(`Are you sure you want to delete this ${this.pathInfo.isDirectory() ? 'folder' : 'file'}?`)) {
          return
        }

        toast.create(`Deleting 1 item...`)
        await del(this.realPathname, this.pathInfo)
        toast.create(`Deleted 1 item`, 'success')

        location.pathname = location.pathname.split('/').slice(0, -1).join('/')
      }
    } catch (e) {
      console.error(e)
      toast.create(`Deletion failed: ${e.toString()}`, 'error')
    }
  }
}

customElements.define('explorer-app', ExplorerApp)

// internal methods
// =

function getDriveTitle (info) {
  if (info.title) return info.title
  else if (info.ident.isRoot) return 'Filesystem'
  else return 'Untitled'
}

function getSavedConfig (name, fallback = undefined) {
  return localStorage.getItem(`setting:${name}:${location.pathname}`) || fallback
}

function setSavedConfig (name, value) {
  localStorage.setItem(`setting:${name}:${location.pathname}`, value)
}

function oneof (v, values) {
  if (values.includes(v)) return v
}

function getVFCfg (obj, key, values) {
  const ns = 'unwalled.garden/explorer-view'
  if (obj[ns] && typeof obj[ns] === 'object') {
    return oneof(obj[ns][key], values)
  }
}

function validateViewfile (view) {
  if (typeof view.viewfile !== 'number' || view.viewfile < 1) {
    throw new Error('Unrecognized version ("viewfile" attribute): ' + view.viewfile)
  }
  if (!view.query || typeof view.query !== 'object') {
    throw new Error('No "query" is specified in the viewfile')
  }
  if (!view.query.path) {
    throw new Error('No "query.path" is specified in the viewfile')
  }
  if (Array.isArray(view.query.path)) {
    if (!view.query.path.every(p => typeof p === 'string')) {
      throw new Error('The "query.path" includes invalid (non-string) values')
    }
  } else if (typeof view.query.path !== 'string') {
    throw new Error('The "query.path" is invalid (it must be a string or array of strings)')
  }
}