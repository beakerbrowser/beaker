import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import { joinPath, pluralize, changeURLScheme } from 'beaker://app-stdlib/js/strings.js'
import { timeDifference } from 'beaker://app-stdlib/js/time.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as shareMenu from './com/share-menu.js'
import { getAvailableName } from 'beaker://app-stdlib/js/fs.js'
import { toSimpleItemGroups, getSubicon } from './lib/files.js'
import { constructItems as constructContextMenuItems } from './lib/context-menu.js'
import * as settingsMenu from './com/settings-menu.js'
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

const LOADING_STATES = {
  INITIAL: 0,
  CONTENT: 1,
  LOADED: 2
}

export class ExplorerApp extends LitElement {
  static get properties () {
    return {
      selection: {type: Array},
      renderMode: {type: String},
      inlineMode: {type: Boolean},
      sortMode: {type: String},
      hideNavLeft: {type: Boolean},
      hideNavRight: {type: Boolean}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()

    // location information
    this.user = undefined
    this.driveInfo = undefined
    this.pathInfo = undefined
    this.mountInfo = undefined
    this.pathAncestry = []
    this.items = []
    this.viewfileObj = undefined
    this.driveTitle = undefined
    this.mountTitle = undefined
    
    // UI state
    this.loadingState = LOADING_STATES.INITIAL
    this.errorState = undefined
    this.selection = []
    this.renderMode = undefined
    this.inlineMode = false
    this.sortMode = undefined
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
      drive: this.currentDriveInfo,
      realUrl: this.realUrl
    }
  }

  get currentShareUrl () {
    return this.selection[0] ? this.selection[0].shareUrl : this.realUrl
  }

  get isViewingQuery () {
    return location.pathname.endsWith('.view')
  }

  updated () {
    if (this.loadingState === LOADING_STATES.INITIAL) {
      setTimeout(() => {
        try {
          // fade in the loading view so that it only renders if loading is taking time
          this.shadowRoot.querySelector('.loading-view').classList.add('visible')
        } catch (e) {}
      }, 1)
    }
  }

  async attempt (task, fn) {
    console.debug(task) // leave this in for live debugging
    try {
      return await fn()
    } catch (e) {
      this.errorState = {task, error: e}
      this.requestUpdate()
      if (e.name === 'TimeoutError') {
        return this.attempt(task, fn)
      } else {
        throw e
      }
    }
  }

  async load () {
    if (!this.user) {
      this.user = (await navigator.session.get()).profile
    }

    // read location information
    var drive = new DatArchive(location)
    try {
      this.driveInfo = await this.attempt(`Reading drive information (${location.origin})`, () => drive.getInfo())
      this.driveTitle = getDriveTitle(this.driveInfo)
      this.mountTitle = this.mountInfo ? getDriveTitle(this.mountInfo) : undefined
      document.title = this.filename ? `${this.driveTitle} / ${this.filename}` : this.driveTitle

      this.pathInfo = await this.attempt(`Reading path information (${location.pathname})`, () => drive.stat(location.pathname))
      await this.readPathAncestry()
    } catch (e) {
      if (e.name === 'NotFoundError') {
        this.pathInfo = {isFile: ()=>false, isDirectory: ()=>false}
        this.loadingState = LOADING_STATES.LOADED
        this.requestUpdate()
        return
      }
    }

    // view config
    if (this.pathInfo.isDirectory()) {
      this.renderMode = getSavedConfig('render-mode', 'list')
      this.inlineMode = Boolean(getSavedConfig('inline-mode', false))
      this.sortMode = getSavedConfig('sort-mode', 'name')
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
      this.sortMode = getSavedConfig('sort-mode', 'name') // TODO
    } else {
      this.renderMode = getSavedConfig('render-mode', 'default')
    }
    this.hideNavLeft = Boolean(getGlobalSavedConfig('hide-nav-left', true))
    this.hideNavRight = Boolean(getGlobalSavedConfig('hide-nav-right', false))

    // update loading state
    this.loadingState = LOADING_STATES.CONTENT
    this.requestUpdate()
    // return

    // read location content
    try {
      if (this.pathInfo.isDirectory()) {
        await this.readDirectory(drive)
      } else if (location.pathname.endsWith('.view')) {
        await this.readViewfile(drive)
      }
    } catch (e) {
      console.log(e)
    }

    if (location.hash === '#edit') {
      navigator.executeSidebarCommand('show-panel', 'editor-app')
      navigator.executeSidebarCommand('set-context', 'editor-app', window.location.toString())
      history.replaceState(undefined, document.title, window.location.toString().split('#')[0])
    }

    console.log({
      driveInfo: this.driveInfo,
      mountInfo: this.mountInfo,
      pathInfo: this.pathInfo,
      items: this.items,
      itemGroups: this.itemGroups
    })

    this.loadingState = LOADING_STATES.LOADED
    this.requestUpdate()
  }

  async readPathAncestry () {
    var ancestry = []
    var drive = new DatArchive(location)
    var pathParts = location.pathname.split('/').filter(Boolean)
    while (pathParts.length) {
      let name = pathParts[pathParts.length - 1]
      let path = '/' + pathParts.join('/')
      let stat = undefined
      let mount = undefined
      if (path === location.pathname) {
        stat = this.pathInfo
      } else {
        stat = await this.attempt(
          `Reading path information (${path})`,
          () => drive.stat(path).catch(e => undefined)
        )
      }
      if (stat.mount) {
        mount = await this.attempt(
          `Reading drive information (${stat.mount.key}) for parent mount at ${path}`,
          () => (new DatArchive(stat.mount.key)).getInfo()
        )
      }
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

  async readDirectory (drive) {
    let driveKind = ''
    if (this.currentDriveInfo.url === navigator.filesystem.url) driveKind = 'root'
    if (this.currentDriveInfo.type === 'unwalled.garden/person') driveKind = 'person'

    var items = await this.attempt(
      `Reading directory (${location.pathname})`,
      () => drive.readdir(location.pathname, {includeStats: true})
    )

    for (let item of items) {
      item.drive = this.currentDriveInfo
      item.path = joinPath(location.pathname, item.name)
      item.url = joinPath(location.origin, item.path)
      item.realPath = this.getRealPathname(item.path)
      item.realUrl = joinPath(item.drive.url, item.realPath)
      if (item.stat.mount) {
        item.mount = await this.attempt(
          `Reading drive information (${item.stat.mount.key}) for mounted drive at ${item.path}`,
          () => (new DatArchive(item.stat.mount.key)).getInfo()
        )
      }
      item.shareUrl = this.getShareUrl(item)
      this.setItemIcons(driveKind, item)
    }
    
    this.sortItems(items)
    this.items = items
  }

  async readViewfile (drive) {
    var viewFile = await drive.readFile(location.pathname, 'utf8')
    this.viewfileObj = JSON.parse(viewFile)
    validateViewfile(this.viewfileObj)

    var items = await this.attempt(
      `Running .view query (${location.pathname})`,
      () => navigator.filesystem.query(this.viewfileObj.query)
    )

    // massage the items to fit same form as `readDirectory()`
    // TODO- cache the drive getInfo reads
    await this.attempt(
      `Reading .view file information (${location.pathname})`,
      () => Promise.all(items.map(async (item) => {
      item.name = item.path.split('/').pop()
      item.realPath = (new URL(item.url)).pathname
      item.realUrl = item.url
      item.url = joinPath(location.origin, item.path)
      item.shareUrl = this.getShareUrl(item)
      item.drive = await (new DatArchive(item.drive)).getInfo()
      item.mount = item.mount ? await (new DatArchive(item.mount)).getInfo() : undefined
      this.setItemIcons('', item)
    })))

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
      return `drive://${item.stat.mount.key}`
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

  sortItems (items) {
    if (this.sortMode === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name))
    } else if (this.sortMode === 'name-reversed') {
      items.sort((a, b) => b.name.localeCompare(a.name))
    } else if (this.sortMode === 'newest') {
      items.sort((a, b) => b.stat.ctime - a.stat.ctime)
    } else if (this.sortMode === 'oldest') {
      items.sort((a, b) => a.stat.ctime - b.stat.ctime)
    } else if (this.sortMode === 'recently-changed') {
      items.sort((a, b) => b.stat.mtime - a.stat.mtime)
    }
  }

  get renderModes () {
    if (this.pathInfo.isDirectory()) {
      return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
    } else {
      if (location.pathname.endsWith('.md') || location.pathname.endsWith('.goto')) {
        return [['default', 'file', 'Rendered'], ['raw', 'code', 'Source']]
      }
      if (location.pathname.endsWith('.view')) {
        return [['grid', 'th-large', 'Files Grid'], ['list', 'th-list', 'Files List']]
      }
      return [['default', 'file', 'File']]
    }
  }

  get itemGroups () {
    return toSimpleItemGroups(this.items)
  }

  // rendering
  // =

  render () {
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
        ${this.loadingState === LOADING_STATES.INITIAL
          ? this.renderInitialLoading()
          : html`
            <main>
              ${this.renderHeader()}
              ${this.loadingState === LOADING_STATES.CONTENT ? html`
                <div class="loading-notice">Loading...</div>
              ` : ''}
              ${this.renderErrorState()}
              ${this.renderView()}
            </main>
            ${this.renderRightNav()}
          `}
      </div>
    `
  }

  renderInitialLoading () {
    var errorView = this.renderErrorState()
    if (errorView) return errorView
    return html`
      <div class="loading-view">
        <div>
          <span class="spinner"></span> Searching the network...
        </div>
        ${this.errorState && this.errorState.error.name === 'TimeoutError' ? html`
          <div style="margin-top: 10px; margin-left: 27px; font-size: 12px; opacity: 0.75;">
            We're having some trouble ${this.errorState.task.toLowerCase()}.<br>
            It may not be available on the network.
          </div>
        ` : ''}
      </div>
    `
  }

  renderHeader () {
    return html`
      <div class="header">
        <path-ancestry
          drive-title=${this.driveTitle}
          .driveInfo=${this.driveInfo}
          .pathAncestry=${this.pathAncestry}
        ></path-ancestry>
        ${this.pathInfo.isFile() ? html`
          <span class="date">${timeDifference(this.pathInfo.mtime, true, 'ago')}</span>
        ` : ''}
        <span class="spacer"></span>
        <button class="transparent" @click=${this.onClickSettings}>
          <span class="fas fa-cog"></span> Settings
        </button>
        <button class="primary labeled-btn" @click=${this.onClickActions}>
          Actions${this.selection.length ? ` (${this.selection.length} ${pluralize(this.selection.length, 'item')})` : ''}
          <span class="fas fa-fw fa-caret-down"></span>
        </button>
      </div>
    `
  }

  renderView () {
    if (this.items.length === 0 && (this.loadingState === LOADING_STATES.CONTENT || this.errorState)) {
      // if there are no items, the views will say "this folder is empty"
      // that's inaccurate if we're in a loading or error state, so don't do that
      return ''
    }
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
          real-url=${this.realUrl}
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

  renderErrorState () {
    if (!this.errorState || this.errorState.error.name === 'TimeoutError') return undefined
    if (this.errorState.error.name === 'NotFoundError') {
      return html`
        <div class="error-view">
          <div class="error-title"><span class="fas fa-fw fa-exclamation-triangle"></span> File or folder not found</div>
          <div class="error-task">Check the location and try again:</div>
          <pre>${location.pathname}</pre>
        </div>
      `

    }
    return html`
      <div class="error-view">
        <div class="error-title"><span class="fas fa-fw fa-exclamation-triangle"></span> Something has gone wrong</div>
        <div class="error-task">While ${this.errorState.task.toLowerCase()}</div>
        <details>
          <summary>${this.errorState.error.toString().split(':').slice(1).join(':').trim()}</summary>
          <pre>${this.errorState.error.stack}</pre>
        </details>
      </div>
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

  goto (item, newWindow = false, useWebScheme = false) {
    var url
    if (typeof item === 'string') {
      url = item
    } else if (item.name.endsWith('.goto') && item.stat.metadata.href) {
      url = item.stat.metadata.href
    } else {
      url = joinPath(window.location.origin, item.path)
    }
    if (useWebScheme) {
      url = changeURLScheme(url, 'web')
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

  onChangeSortMode (e) {
    this.sortMode = e.target.value
    this.sortItems(this.items)
    setSavedConfig('sort-mode', this.sortMode)
    this.requestUpdate()
  }

  onApplyViewSettingsGlobally (e) {
    setGlobalSavedConfig('render-mode', this.renderMode)
    setGlobalSavedConfig('inline-mode', this.inlineMode ? '1' : '')
    setGlobalSavedConfig('sort-mode', this.sortMode)
    toast.create('Default view settings updated')
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

  async onClickSettings (e) {
    e.preventDefault()
    e.stopPropagation()
    let el = e.currentTarget
    let rect = el.getClientRects()[0]
    el.classList.add('active')
    await settingsMenu.create(this, {x: (rect.left + rect.right) / 2, y: rect.bottom})
    el.classList.remove('active')
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

  async onImport (e) {
    if (!this.currentDriveInfo.writable) return
    toast.create('Importing...')
    try {
      await navigator.importFilesDialog(window.location.toString())
      toast.create('Import complete', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onExport (e) {
    var urls = (this.selection.length ? this.selection : this.items).map(item => item.url)
    toast.create('Exporting...')
    try {
      await navigator.exportFilesDialog(urls)
      toast.create('Export complete', 'success')
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
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
    navigator.executeSidebarCommand('show-panel', 'editor-app')
    navigator.executeSidebarCommand('set-context', 'editor-app', window.location.toString())
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

  async doCompare (base) {
    var target = await navigator.selectFileDialog({
      title: 'Select a folder to compare against',
      select: ['folder']
    })
    window.open(`beaker://compare/?base=${base}&target=${target[0].url}`)
  }
}

customElements.define('explorer-app', ExplorerApp)
