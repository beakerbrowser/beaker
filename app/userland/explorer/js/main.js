import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { joinPath, pluralize } from 'beaker://app-stdlib/js/strings.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import { friends } from 'beaker://app-stdlib/js/uwg.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as shareMenu from './com/share-menu.js'
import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'
import { toSimpleItemGroups, getSubicon } from './lib/files.js'
import { constructItems as constructContextMenuItems } from './lib/context-menu.js'
import { getDriveTitle, getGlobalSavedConfig, setGlobalSavedConfig, getSavedConfig, setSavedConfig, getVFCfg } from './lib/config.js'
import { validateViewfile } from './lib/viewfile.js'
import mainCSS from '../css/main.css.js'
import './view/file.js'
import './view/folder.js'
import './view/query.js'
import './com/path-ancestry.js'
import './com/sidebar/drive-info.js'
import './com/sidebar/viewfile-info.js'
import './com/sidebar/selection-info.js'
import './com/sidebar/contextual-help.js'

export class ExplorerApp extends LitElement {
  static get propertes () {
    return {
      selection: {type: Array},
      renderMode: {type: String},
      hideNavLeft: {type: Boolean},
      hideNavRight: {type: Boolean}
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
    this.pathAncestry = []
    this.items = []
    this.selection = []
    this.viewfileObj = undefined
    this.renderMode = undefined
    this.inlineMode = false
    this.driveTitle = undefined
    this.mountTitle = undefined
    this.hideNavLeft = true
    this.hideNavRight = false
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

  get locationAsItem () {
    return {
      name: this.filename,
      stat: this.pathInfo,
      path: window.location.pathname,
      url: window.location.toString(),
      drive: this.currentDriveInfo
    }
  }

  get currentShareUrl () {
    return this.selection[0] ? this.selection[0].shareUrl : this.realUrl
  }

  get isViewingQuery () {
    return location.pathname.endsWith('.view')
  }

  async load () {
    if (!this.user) {
      this.user = (await navigator.session.get()).profile
    }

    // read drive information
    var drive = new DatArchive(location)
    this.driveInfo = await drive.getInfo()

    // read location content
    try {
      this.pathInfo = await drive.stat(location.pathname)
      await this.readPathAncestry()
      if (this.pathInfo.isDirectory()) {
        await this.readDirectory(drive)
        if (this.items) {
          this.items.sort((a, b) => a.name.localeCompare(b.name))
        }
      } else if (location.pathname.endsWith('.view')) {
        await this.readViewfile(drive)
      }
    } catch (e) {
      console.log(e)
      this.isNotFound = true
    }

    // view config
    if (this.pathInfo.isDirectory()) {
      this.renderMode = getSavedConfig('render-mode', 'list')
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
    } else if (location.pathname.endsWith('.view')) {
      this.renderMode = getSavedConfig('render-mode', getVFCfg(this.viewfileObj, 'renderMode', ['grid', 'list']) || 'list')
      this.inlineMode = Boolean(getSavedConfig('inline-mode', getVFCfg(this.viewfileObj, 'inline', [true, false]) || false))
    } else {
      this.renderMode = getSavedConfig('render-mode', 'default')
    }
    this.hideNavLeft = Boolean(getGlobalSavedConfig('hide-nav-left', true))
    this.hideNavRight = Boolean(getGlobalSavedConfig('hide-nav-right', false))

    if (location.hash === '#edit') {
      navigator.updateSidebar('beaker://editor', {setTarget: window.location.toString()})
      history.replaceState(undefined, document.title, window.location.toString().split('#')[0])
    }

    this.driveTitle = getDriveTitle(this.driveInfo)
    this.mountTitle = this.mountInfo ? getDriveTitle(this.mountInfo) : undefined
    document.title = this.filename ? `${this.driveTitle} / ${this.filename}` : this.driveTitle

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
    if (this.currentDriveInfo.url === navigator.filesystem.url) driveKind = 'root'
    if (this.currentDriveInfo.type === 'unwalled.garden/person') driveKind = 'person'

    var items = await drive.readdir(location.pathname, {stat: true})

    for (let item of items) {
      item.drive = this.currentDriveInfo
      item.path = joinPath(location.pathname, item.name)
      item.url = joinPath(location.origin, item.path)
      item.realPath = this.getRealPathname(item.path)
      item.realUrl = joinPath(item.drive.url, item.realPath)
      if (item.stat.mount) {
        item.mount = await (new DatArchive(item.stat.mount.key)).getInfo()   
      }
      item.shareUrl = this.getShareUrl(item)
      this.setItemIcons(driveKind, item)
    }

    this.items = items
  }

  async readViewfile (drive) {
    var viewFile = await drive.readFile(location.pathname, 'utf8')
    this.viewfileObj = JSON.parse(viewFile)
    validateViewfile(this.viewfileObj)

    var items = await navigator.filesystem.query(this.viewfileObj.query)

    // massage the items to fit same form as `readDirectory()`
    items.forEach(item => {
      item.name = item.path.split('/').pop()
      item.realPath = (new URL(item.url)).pathname
      item.realUrl = item.url
      item.url = joinPath(location.origin, item.path)
      item.shareUrl = this.getShareUrl(item)
      this.setItemIcons('', item)
    })

    // apply merge
    if (getVFCfg(this.viewfileObj, 'merge', ['mtime', undefined])) {
      let map = {}
      for (let item of items) {
        if (item.name in map) {
          map[item.name] =  (map[item.name].stat.mtime > item.stat.mtime) ? map[item.name] : item
        } else {
          map[item.name] = item
        }
      }
      items = Object.values(map)
    }

    this.items = items
  }

  getShareUrl (item) {
    if (item.stat.mount) {
      return `dat://${item.stat.mount.key}`
    } else if (item.name.endsWith('.goto') && item.stat.metadata.href) {
      return item.stat.metadata.href
    } else {
      return item.realUrl
    }
  }

  setItemIcons (driveKind, item) {
    item.icon = item.stat.isDirectory() ? 'folder' : 'file'
    if (item.stat.isFile() && item.name.endsWith('.view')) {
      item.icon = 'layer-group'
    } else if (item.stat.isFile() && item.name.endsWith('.goto')) {
      item.icon = 'external-link-alt'
    } else {
      item.subicon = getSubicon(driveKind, item)
    }
  }

  async readPathAncestry () {
    var ancestry = []
    var drive = new DatArchive(location)
    var pathParts = location.pathname.split('/').filter(Boolean)
    while (pathParts.length) {
      let name = pathParts[pathParts.length - 1]
      let path = '/' + pathParts.join('/')
      let stat = await drive.stat(pathParts.join('/')).catch(e => null)
      let mount = stat.mount ? await (new DatArchive(stat.mount.key)).getInfo() : undefined
      ancestry.unshift({name, path, stat, mount})
      if (!this.mountInfo && mount) {
        // record the mount info for the "closest" mount
        this.mountInfo = mount
        this.mountInfo.mountPath = pathParts.join('/')
      }
      pathParts.pop()
    }
    this.pathAncestry = ancestry
  }

  get renderModes () {
    if (this.pathInfo.isDirectory()) {
      return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
    } else {
      if (location.pathname.endsWith('.md') || location.pathname.endsWith('.goto')) {
        return [['default', 'file', 'File'], ['raw', 'code', 'Raw File']]
      }
      if (location.pathname.endsWith('.view')) {
        return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
      }
      return [['default', 'File']]
    }
  }

  get itemGroups () {
    return toSimpleItemGroups(this.items)
  }

  // rendering
  // =

  render () {
    if (!this.driveInfo) return html``

    // TODO: reimplement files exporting -prf
    // var selectionIsFolder = this.selection[0] ? this.selection[0].stat.isDirectory() : this.pathInfo.isDirectory()
    // var selectionUrl = this.getRealUrl(this.selection[0] ? joinPath(this.realPathname, this.selection[0].name) : this.realPathname)
    // var selectionType = (selectionIsFolder ? 'folder' : 'file')
    // var selectionName = selectionUrl.split('/').pop() || selectionType
    // if (this.selection[0] && this.selection[0].stat.mount) selectionUrl = `dat://${this.selection[0].stat.mount.key}`
    // var downloadUrl = `${selectionUrl}${selectionIsFolder ? '?download_as=zip' : ''}`

    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div
        class=${classMap({
          layout: true,
          ['render-mode-' + this.renderMode]: true,
          'hide-nav-left': this.hideNavLeft,
          'hide-nav-right': this.hideNavRight,
        })}
        @contextmenu=${this.onContextmenuLayout}
        @goto=${this.onGoto}
        @change-selection=${this.onChangeSelection}
        @show-context-menu=${this.onShowMenu}
        @new-drive=${this.onNewDrive}
        @new-folder=${this.onNewFolder}
        @new-file=${this.onNewFile}
        @new-mount=${this.onNewMount}
        @clone-drive=${this.onCloneDrive}
        @drive-properties=${this.onDriveProperties}
        @import=${this.onImport}
        @export=${this.onExport}
        @rename=${this.onRename}
        @delete=${this.onDelete}
        @toggle-editor=${this.onToggleEditor}
      >
        <div class="nav-toggle right" @click=${e => this.toggleNav('right')}><span class="fas fa-caret-${this.hideNavRight ? 'left' : 'right'}"></span></div>
        ${this.pathInfo ? html`
          <main>
            ${this.renderHeader()}
            ${this.renderView()}
          </main>
          ${this.renderRightNav()}
        ` : undefined}
      </div>
      <input type="file" id="files-picker" multiple @change=${this.onChangeImportFiles} />
    `
  }

  renderHeader () {
    const renderModes = this.renderModes
    const isViewfile = this.pathInfo.isFile() && location.pathname.endsWith('.view')
    const isFolderLike = this.pathInfo.isDirectory() || isViewfile
    return html`
      <div class="header">
        <path-ancestry
          drive-title=${this.driveTitle}
          .driveInfo=${this.driveInfo}
          .pathAncestry=${this.pathAncestry}
        ></path-ancestry>
        ${this.pathInfo && this.pathInfo.isFile() ? html`
          <span class="date">${timeDifference(this.pathInfo.mtime, true, 'ago')}</span>
        ` : ''}
        <span class="spacer"></span>
        ${renderModes.length > 1 ? html`
          <span class="btn-group">
            ${renderModes.map(([id, icon, label]) => html`
              <button
                class=${id == this.renderMode ? 'pressed' : ''}
                @click=${e => this.onChangeRenderMode(e, id)}
                title="Change the view to: ${label}"
              ><span class="fas fa-${icon}"></span></button>
            `)}
          </span>
        ` : ''}
        ${isFolderLike ? html`
          <button title="Toggle inline rendering of the files" class=${this.inlineMode ? 'pressed' : ''} @click=${this.onToggleInlineMode}>
            <span class="fas fa-eye"></span>
          </button>
        ` : ''}
        <button class="primary labeled-btn" @click=${this.onClickActions}>
          Actions${this.selection.length ? ` (${this.selection.length} ${pluralize(this.selection.length, 'item')})` : ''}
          <span class="fas fa-fw fa-caret-down"></span>
        </button>
      </div>
    `
  }

  renderView () {
    const isViewfile = this.pathInfo.isFile() && location.pathname.endsWith('.view')
    if (isViewfile) {
      return html`
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
      `
    }
    if (this.pathInfo.isDirectory()) {
      return html`
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
      `
    }
    return html`
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
    `
  }

  renderRightNav () {
    if (this.hideNavRight) return ''

    const isViewfile = this.pathInfo.isFile() && location.pathname.endsWith('.view')
    return html`
      <nav class="right">
        <drive-info
          user-url=${this.user.url}
          .driveInfo=${this.currentDriveInfo}
        ></drive-info>
        ${this.selection.length > 0 ? html`
          <selection-info
            user-url=${this.user.url}
            .driveInfo=${this.driveInfo}
            .pathInfo=${this.pathInfo}
            .mountInfo=${this.mountInfo}
            .selection=${this.selection}
            ?no-preview=${this.inlineMode}
          ></selection-info>
        ` : isViewfile ? html`
          <viewfile-info
            .currentDriveInfo=${this.currentDriveInfo}
            .pathInfo=${this.pathInfo}
            .viewfileObj=${this.viewfileObj}
          ></viewfile-info>
        ` : html``}
        <contextual-help
          user-url=${this.user.url}
          real-pathname=${this.realPathname}
          .driveInfo=${this.driveInfo}
          .pathInfo=${this.pathInfo}
          .mountInfo=${this.mountInfo}
          .selection=${this.selection}
        ></contextual-help>
      </nav>
    `
  }

  // events
  // =

  onContextmenuLayout (e) {
    if (e.target.tagName === 'INPUT') return
    e.preventDefault()
    e.stopPropagation()
    this.onShowMenu({detail: {x: e.clientX, y: e.clientY}})
  }

  onGoto (e) {
    var {item} = e.detail
    this.goto(item)
  }

  canShare (item) {
    if (item.mount) {
      return true
    } else if (item.drive.url !== navigator.filesystem.url) {
      return true
    }
    return false
  }

  goto (item, newWindow = false) {
    var url
    if (item.name.endsWith('.goto') && item.stat.metadata.href) {
      url = item.stat.metadata.href
    } else {
      url = joinPath(window.location.origin, item.path)
    }
    if (newWindow) window.open(url)
    else window.location = url
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

  toggleNav (side) {
    if (side === 'left') {
      this.hideNavLeft = !this.hideNavLeft
      setGlobalSavedConfig('hide-nav-left', this.hideNavLeft ? '1' : '')
    } else {
      this.hideNavRight = !this.hideNavRight
      setGlobalSavedConfig('hide-nav-right', this.hideNavRight ? '1' : '')
    }
    this.requestUpdate()
  }

  onClickActions (e) {
    e.preventDefault()
    e.stopPropagation()
    let rect = e.currentTarget.getClientRects()[0]
    this.onShowMenu({detail: {x: rect.right, y: rect.bottom, right: true}})
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
      window.location = joinPath(window.location.toString(), filename + '#edit')
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

  async onNewMount (e) {
    if (!this.currentDriveInfo.writable) return
    var drive = new DatArchive(this.currentDriveInfo.url)
    var targetUrl = await navigator.selectDriveDialog({title: 'Select a drive'})
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
    const del = async (path, stat) => {
      if (stat.mount && stat.mount.key) {
        await drive.unmount(path)
      } else if (stat.isDirectory()) {
        await drive.rmdir(path, {recursive: true})
      } else {
        await drive.unlink(path)
      }
    }

    try {
      if (this.selection.length) {
        if (!confirm(`Delete ${this.selection.length} ${pluralize(this.selection.length, 'item')}?`)) {
          return
        }

        toast.create(`Deleting ${pluralize(this.selection.length, 'item')}...`)
        for (let sel of this.selection) {
          await del(sel.realPath, sel.stat)
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

  onToggleEditor (e) {
    navigator.updateSidebar('beaker://editor', {setTarget: window.location.toString()})
  }

  onShowMenu (e) {
    contextMenu.create({
      x: e.detail.x,
      y: e.detail.y,
      right: e.detail.right || (e.detail.x > document.body.scrollWidth - 300),
      top: (e.detail.y > document.body.scrollHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: constructContextMenuItems(this)
    })
  }

  onClickShare (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]
    shareMenu.create({
      x: rect.left - 10,
      y: rect.bottom + 4,
      url: this.currentShareUrl,
      targetLabel: (this.selection[0] ? this.selection[0].stat : this.pathInfo).isDirectory() ? 'folder' : 'file'
    })
  }

  async onToggleFriends () {
    var isInFriends = (await navigator.filesystem.query({
      path: '/profile/friends/*',
      mount: this.driveInfo.url
    })).length > 0
    if (isInFriends) {
      await friends.remove(this.driveInfo.url)
    } else {
      await friends.add(this.driveInfo.url, this.driveInfo.title)
    }
    location.reload()
  }
}

customElements.define('explorer-app', ExplorerApp)
