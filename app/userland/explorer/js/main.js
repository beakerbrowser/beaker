import { LitElement, html } from '../vendor/lit-element/lit-element.js'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat.js'
import { joinPath, pluralize, changeURLScheme } from './lib/strings.js'
import { timeDifference } from './lib/time.js'
import * as toast from './com/toast.js'
import * as contextMenu from './com/context-menu.js'
import * as shareMenu from './com/share-menu.js'
import { getAvailableName } from './lib/fs.js'
import { toSimpleItemGroups, getSubicon } from './lib/files.js'
import * as loc from './lib/location.js'
import { constructItems as constructContextMenuItems } from './lib/context-menu.js'
import * as settingsMenu from './com/settings-menu.js'
import { getDriveTitle, getGlobalSavedConfig, setGlobalSavedConfig, getVFCfg } from './lib/config.js'
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
      drives: {type: Array},
      profiles: {type: Array}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    beaker.panes.setAttachable()

    // location information
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
    this.attachedPane = undefined
    this.selection = []
    this.renderMode = undefined
    this.inlineMode = false
    this.sortMode = undefined

    // helper state
    this.drives = undefined
    this.profiles = undefined

    beaker.panes.addEventListener('pane-attached', e => {
      this.attachedPane = beaker.panes.getAttachedPane()
      if (loc.getUrl() !== this.attachedPane.url) {
        loc.setUrl(this.attachedPane.url)
      }
    })
    beaker.panes.addEventListener('pane-detached', e => {
      this.attachedPane = undefined
    })
    beaker.panes.addEventListener('pane-navigated', e => {
      if (loc.getUrl() !== e.detail.url) {
        loc.setUrl(e.detail.url)
      }
    })

    ;(async () => {
      this.attachedPane = beaker.panes.getAttachedPane()
      if (this.attachedPane) {
        // already attached, drive them
        if (loc.getUrl() && loc.getUrl() !== this.attachedPane.url) {
          beaker.panes.navigate(this.attachedPane.id, loc.getUrl())
        }
      } else {
        // try to attach and then follow their url
        this.attachedPane = await beaker.panes.attachToLastActivePane()
        if (this.attachedPane && loc.getUrl() !== this.attachedPane.url) {
          loc.setUrl(this.attachedPane.url)
          return
        }
      }

      this.load()
    })()
  }

  getRealPathname (pathname) {
    var slicePoint = this.mountInfo ? (this.mountInfo.mountPath.length + 1) : 0
    return pathname.slice(slicePoint) || '/'
  }

  getRealUrl (pathname) {
    return joinPath(this.currentDriveInfo.url, this.getRealPathname(pathname))
  }

  get filename () {
    return loc.getPath().split('/').pop()
  }

  get realUrl () {
    return this.getRealUrl(loc.getPath())
  }

  get realPathname () {
    return this.getRealPathname(loc.getPath())
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
      path: loc.getPath(),
      url: loc.getUrl(),
      drive: this.currentDriveInfo,
      realUrl: this.realUrl
    }
  }

  get currentShareUrl () {
    return this.selection[0] ? this.selection[0].shareUrl : this.realUrl
  }

  get isViewingQuery () {
    return loc.getPath().endsWith('.view')
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
    if (this.attachedPane) {
      if (!loc.getUrl() || !loc.getUrl().startsWith('hyper://')) {
        this.errorState = {task: 'Attempting to load', error: new Error('Failed to load this address: not a hyperdrive')}
        return
      }
    } else if (!loc.getUrl()) {
      return loc.setUrl('hyper://system/')
    }

    // read helper state
    beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json').then(addressBook => {
      return Promise.all(addressBook.profiles.map(p => beaker.hyperdrive.getInfo(p.key)))
    }).then(profiles => {
      profiles.sort((a, b) => (a.title||'').localeCompare(b.title||''))
      this.profiles = profiles
      return beaker.drives.list()
    }).then(drives => {
      drives = drives.filter(d => !this.profiles.find(p => p.url === d.url))
      drives.sort((a, b) => (a.info.title||'').localeCompare(b.info.title||''))
      this.drives = drives
    })

    // read location information
    var drive = beaker.hyperdrive.drive(loc.getOrigin())
    try {
      this.driveInfo = await this.attempt(`Reading drive information (${loc.getOrigin()})`, () => drive.getInfo())
      this.driveTitle = getDriveTitle(this.driveInfo)
      this.mountTitle = this.mountInfo ? getDriveTitle(this.mountInfo) : undefined
      document.title = this.filename ? `${this.driveTitle} / ${this.filename}` : this.driveTitle

      this.pathInfo = await this.attempt(`Reading path information (${loc.getPath()})`, () => drive.stat(loc.getPath()))
      await this.readPathAncestry()
    } catch (e) {
      if (e.message.includes('NotFoundError')) {
        this.pathInfo = {isFile: ()=>false, isDirectory: ()=>false}
        this.loadingState = LOADING_STATES.LOADED
        this.requestUpdate()
        return
      }
    }

    // view config
    if (this.pathInfo.isDirectory()) {
      this.renderMode = getGlobalSavedConfig('render-mode', 'grid')
      this.inlineMode = Boolean(getGlobalSavedConfig('inline-mode', false))
      this.sortMode = getGlobalSavedConfig('sort-mode', 'name')
      if (!this.watchStream) {
        let currentDrive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
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
    } else if (loc.getPath().endsWith('.view')) {
      this.renderMode = getGlobalSavedConfig('render-mode', getVFCfg(this.viewfileObj, 'renderMode', ['grid', 'list']) || 'grid')
      this.inlineMode = Boolean(getGlobalSavedConfig('inline-mode', getVFCfg(this.viewfileObj, 'inline', [true, false]) || false))
      this.sortMode = getGlobalSavedConfig('sort-mode', 'name') // TODO
    } else {
      this.renderMode = getGlobalSavedConfig('render-mode', 'default')
    }

    // update loading state
    this.loadingState = LOADING_STATES.CONTENT
    this.requestUpdate()

    // read location content
    try {
      if (this.pathInfo.isDirectory()) {
        await this.readDirectory(drive)
      } else if (loc.getPath().endsWith('.view')) {
        await this.readViewfile(drive)
      }
    } catch (e) {
      console.log(e)
    }

    // update selection if needed
    if (this.selection && this.selection.length) {
      this.selection = this.selection.map(item => this.items.find(item2 => item2.path === item.path)).filter(Boolean)
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
    var drive = beaker.hyperdrive.drive(loc.getOrigin())
    var pathParts = loc.getPath().split('/').filter(Boolean)
    while (pathParts.length) {
      let name = pathParts[pathParts.length - 1]
      let path = '/' + pathParts.join('/') + '/'
      let stat = undefined
      let mount = undefined
      if (path === loc.getPath()) {
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
          () => beaker.hyperdrive.drive(stat.mount.key).getInfo()
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
    var items = await this.attempt(
      `Reading directory (${loc.getPath()})`,
      () => drive.readdir(loc.getPath(), {includeStats: true})
    )

    for (let item of items) {
      item.drive = this.currentDriveInfo
      item.path = joinPath(loc.getPath(), item.name)
      item.url = joinPath(loc.getOrigin(), item.path)
      item.realPath = this.getRealPathname(item.path)
      item.realUrl = joinPath(item.drive.url, item.realPath)
      if (item.stat.mount) {
        item.mount = await this.attempt(
          `Reading drive information (${item.stat.mount.key}) for mounted drive at ${item.path}`,
          () => beaker.hyperdrive.drive(item.stat.mount.key).getInfo()
        )
      }
      item.shareUrl = this.getShareUrl(item)
      this.setItemIcons(item)
    }
    
    this.sortItems(items)
    this.items = items
  }

  async readViewfile (drive) {
    var viewFile = await drive.readFile(loc.getPath(), 'utf8')
    this.viewfileObj = JSON.parse(viewFile)
    validateViewfile(this.viewfileObj)

    var items = await this.attempt(
      `Running .view query (${loc.getPath()})`,
      () => drive.query(this.viewfileObj.query)
    )

    // massage the items to fit same form as `readDirectory()`
    // TODO- cache the drive getInfo reads
    await this.attempt(
      `Reading .view file information (${loc.getPath()})`,
      () => Promise.all(items.map(async (item) => {
      item.name = item.path.split('/').pop()
      item.realPath = (new URL(item.url)).pathname
      item.realUrl = item.url
      item.url = joinPath(loc.getOrigin(), item.path)
      item.shareUrl = this.getShareUrl(item)
      item.drive = await beaker.hyperdrive.drive(item.drive).getInfo()
      item.mount = item.mount ? beaker.hyperdrive.drive(item.mount).getInfo() : undefined
      this.setItemIcons(item)
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
      return `hyper://${item.stat.mount.key}`
    } else if (item.name.endsWith('.goto') && item.stat.metadata.href) {
      return item.stat.metadata.href
    } else {
      return item.realUrl
    }
  }

  setItemIcons (item) {
    item.icon = item.stat.isDirectory() ? 'folder' : 'file'
    if (item.stat.isFile() && item.name.endsWith('.view')) {
      item.icon = 'layer-group'
    } else if (item.stat.isFile() && item.name.endsWith('.goto')) {
      item.icon = 'external-link-alt'
    } else {
      item.subicon = getSubicon(item)
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
      if (loc.getPath().endsWith('.md') || loc.getPath().endsWith('.goto')) {
        return [['default', 'file', 'Rendered'], ['raw', 'code', 'Source']]
      }
      if (loc.getPath().endsWith('.view')) {
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
      <link rel="stylesheet" href="/css/font-awesome.css">
      <div
        class=${classMap({
          layout: true,
          ['render-mode-' + this.renderMode]: true
        })}
        @goto=${this.onGoto}
        @change-selection=${this.onChangeSelection}
        @show-context-menu=${this.onShowMenu}
        @new-folder=${this.onNewFolder}
        @new-file=${this.onNewFile}
        @new-mount=${this.onNewMount}
        @fork-drive=${this.onForkDrive}
        @drive-properties=${this.onDriveProperties}
        @export=${this.onExport}
        @rename=${this.onRename}
        @delete=${this.onDelete}
        @update-file-metadata=${this.onUpdateFileMetadata}
      >
        ${this.loadingState === LOADING_STATES.INITIAL
          ? this.renderInitialLoading()
          : html`
            ${this.renderLeftNav()}
            <main @contextmenu=${this.onContextmenuLayout}>
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
          ${this.selection.length ?
            `${this.selection.length} ${pluralize(this.selection.length, 'item')} selected`
            : this.pathInfo.isDirectory() ? 'Folder' : 'File'
          }
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
    const isViewfile = this.pathInfo.isFile() && loc.getPath().endsWith('.view')
    if (isViewfile) {
      return html`
        <explorer-view-query
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
  
  renderLeftNav () {
    const navItem = (url, title) => html`
      <a
        class=${classMap({current: url.startsWith(this.currentDriveInfo.url)})}
        href="/${url.slice('hyper://'.length)}"
        title=${title}
      >${title}</a>
    `
    return html`
      <nav class="left">
        <section class="transparent drives-list">
          ${navItem('hyper://system/', 'My System Drive')}
          ${!this.profiles ? html`` : html`
            ${repeat(this.profiles, profile => navItem(profile.url, profile.title))}
          `}
          ${!this.drives ? html`<span>Loading...</span>` : html`
            <h5>My Drives</h4>
            ${repeat(this.drives.filter(d => d.info.writable), drive => navItem(drive.url, drive.info.title))}
            <h5>Cohosting</h4>
            ${repeat(this.drives.filter(d => !d.info.writable), drive => navItem(drive.url, drive.info.title))}
          `}
        </section>
      </nav>
    `
  }

  renderRightNav () {
    const isViewfile = this.pathInfo.isFile() && loc.getPath().endsWith('.view')
    return html`
      <nav class="right">
        <drive-info
          real-url=${this.realUrl}
          .driveInfo=${this.currentDriveInfo}
        ></drive-info>
        ${this.selection.length > 0 ? html`
          <selection-info
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
        ` : html`
          <selection-info
            .driveInfo=${this.driveInfo}
            .pathInfo=${this.pathInfo}
            .mountInfo=${this.mountInfo}
            .selection=${[this.locationAsItem]}
            no-preview
          ></selection-info>
        `}
        <contextual-help
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
    if (!this.errorState || this.errorState.error.message.includes('TimeoutError')) return undefined
    if (this.errorState.error.message.includes('NotFoundError')) {
      return html`
        <div class="error-view">
          <div class="error-title"><span class="fas fa-fw fa-exclamation-triangle"></span> File or folder not found</div>
          <div class="error-task">Check the location and try again:</div>
          <pre>${loc.getPath()}</pre>
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
    // TODO check if public?
    return true
  }

  goto (item, newWindow = false, leaveExplorer = false) {
    var url
    if (typeof item === 'string') {
      url = item
    } else if (item.stat.isFile()) {
      if (item.name.endsWith('.goto') && item.stat.metadata.href) {
        url = item.stat.metadata.href
        newWindow = true
        leaveExplorer = true
      } else {
        url = item.url
      }
    } else {
      url = joinPath(loc.getOrigin(), item.path) + '/'
    }
    if (this.attachedPane) {
      if (newWindow) window.open(url)
      else beaker.panes.navigate(this.attachedPane.id, url)
    } else {
      if (leaveExplorer) {
        if (newWindow) window.open(url)
        else window.location = url
      } else {
        if (newWindow) loc.openUrl(url)
        else loc.setUrl(url)
      }
    }
  }

  onChangeSelection (e) {
    this.selection = e.detail.selection
    this.requestUpdate()
  }

  onChangeRenderMode (e, renderMode) {
    this.renderMode = renderMode
    setGlobalSavedConfig('render-mode', this.renderMode)
    this.requestUpdate()
  }

  onToggleInlineMode (e) {
    this.inlineMode = !this.inlineMode
    setGlobalSavedConfig('inline-mode', this.inlineMode ? '1' : '')
    this.requestUpdate()
  }

  onChangeSortMode (e) {
    this.sortMode = e.target.value
    this.sortItems(this.items)
    setGlobalSavedConfig('sort-mode', this.sortMode)
    this.requestUpdate()
  }

  // NOTE All settings are saved globally now -prf
  // onApplyViewSettingsGlobally () {
  //   setGlobalSavedConfig('render-mode', this.renderMode)
  //   setGlobalSavedConfig('inline-mode', this.inlineMode ? '1' : '')
  //   setGlobalSavedConfig('sort-mode', this.sortMode)
  //   toast.create('Default view settings updated')
  // }

  async onClickActions (e) {
    let el = e.currentTarget
    if (el.classList.contains('active')) return
    e.preventDefault()
    e.stopPropagation()
    let rect = e.currentTarget.getClientRects()[0]
    el.classList.add('active')
    await this.onShowMenu({detail: {x: rect.right, y: rect.bottom, right: true}}, true)
    el.classList.remove('active')
  }

  async onClickSettings (e) {
    let el = e.currentTarget
    if (el.classList.contains('active')) return
    e.preventDefault()
    e.stopPropagation()
    let rect = el.getClientRects()[0]
    el.classList.add('active')
    await settingsMenu.create(this, {x: (rect.left + rect.right) / 2, y: rect.bottom})
    el.classList.remove('active')
  }

  async onNewFile (e) {
    if (!this.currentDriveInfo.writable) return
    var filename = prompt('Enter the name of your new file')
    if (filename) {
      var pathname = joinPath(this.realPathname, filename)
      var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
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
      var url = joinPath(loc.getUrl(), filename)
      window.open(`beaker://editor/?url=${url}`)
    }
  }

  async onNewFolder (e) {
    if (!this.currentDriveInfo.writable) return
    var foldername = prompt('Enter the name of your new folder')
    if (foldername) {
      var pathname = joinPath(this.realPathname, foldername)
      var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
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
    var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
    var targetUrl = await beaker.shell.selectDriveDialog({title: 'Select a drive'})
    var target = beaker.hyperdrive.drive(targetUrl)
    var info = await target.getInfo()
    var name = await getAvailableName(drive, this.realPathname, info.title)
    name = prompt('Enter the mount name', name)
    try {
      await drive.mount(joinPath(this.realPathname, name), target.url)
    } catch (e) {
      toast.create(e.toString(), 'error')
      console.error(e)
    }
    this.load()
  }

  async onForkDrive (e) {
    var drive = await beaker.hyperdrive.forkDrive(this.currentDriveInfo.url)
    toast.create('Drive created')
    loc.setUrl(drive.url)
  }

  async onDriveProperties (e) {
    await beaker.shell.drivePropertiesDialog(this.currentDriveInfo.url)
    this.load()
  }

  async onImportFiles (e) {
    if (!this.currentDriveInfo.writable) return
    toast.create('Importing...')
    try {
      var {numImported} = await beaker.shell.importFilesDialog(loc.getUrl())
      if (numImported > 0) toast.create('Import complete', 'success')
      else toast.destroy()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onImportFolders (e) {
    if (!this.currentDriveInfo.writable) return
    toast.create('Importing...')
    try {
      var {numImported} = await beaker.shell.importFoldersDialog(loc.getUrl())
      if (numImported > 0) toast.create('Import complete', 'success')
      else toast.destroy()
    } catch (e) {
      console.log(e)
      toast.create(e.toString(), 'error')
    }
  }

  async onExport (e) {
    var urls = (this.selection.length ? this.selection : this.items).map(item => item.url)
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

  async onRename (e) {
    if (!this.currentDriveInfo.writable) return
    var oldName = this.selection[0] ? this.selection[0].name : this.filename
    var newName = prompt('Enter the new name for this file or folder', oldName)
    if (newName) {
      var oldPath = this.selection[0] ? joinPath(this.realPathname, oldName) : this.realPathname
      var newPath = oldPath.split('/').slice(0, -1).concat([newName]).join('/')
      var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
      try {
        await drive.rename(oldPath, newPath)
      } catch (e) {
        console.error(e)
        toast.create(`Rename failed: ${e.toString()}`, 'error')
        return
      }
      if (!this.selection[0]) {
        // redirect to new location
        loc.setPath(loc.getPath().split('/').slice(0, -1).concat([newName]).join('/'))
      }
    }
  }

  async onDelete (e) {
    if (!this.currentDriveInfo.writable) return

    var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
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

        loc.setPath(loc.getPath().split('/').slice(0, -1).join('/'))
      }
    } catch (e) {
      console.error(e)
      toast.create(`Deletion failed: ${e.toString()}`, 'error')
    }
  }

  async onUpdateFileMetadata (e) {
    if (!this.currentDriveInfo.writable) return
    var {newMetadata, deletedKeys} = e.detail
    var drive = beaker.hyperdrive.drive(this.currentDriveInfo.url)
    try {
      if (this.selection.length) {
        for (let sel of this.selection) {
          await drive.updateMetadata(sel.realPath, newMetadata)
          if (deletedKeys.length) {
            await drive.deleteMetadata(sel.realPath, deletedKeys)
          }
        }
      } else {
        await drive.updateMetadata(this.realPathname, newMetadata)
        if (deletedKeys.length) {
          await drive.deleteMetadata(this.realPathname, deletedKeys)
        }
      }
      toast.create('File updated', 'success')
    } catch (e) {
      console.error(e)
      toast.create(`File update failed: ${e.toString()}`, 'error')
    }
  }

  async onShowMenu (e, useAppMenuAlways = false) {
    var items = constructContextMenuItems(this)
    if (!useAppMenuAlways && typeof beaker !== 'undefined' && typeof beaker.browser !== 'undefined') {
      let fns = {}
      for (let i = 0; i < items.length; i++) {
        if (items[i].id) continue
        let id = `item=${i}`
        if (items[i] === '-') items[i] = {type: 'separator'}
        items[i].id = id
        fns[id] = items[i].click
        delete items[i].icon
        delete items[i].click
      }
      var choice = await beaker.browser.showContextMenu(items, true)
      if (fns[choice]) fns[choice]()
    } else {
      return contextMenu.create({
        x: e.detail.x,
        y: e.detail.y,
        right: e.detail.right || (e.detail.x > document.body.scrollWidth - 300),
        top: (e.detail.y > document.body.scrollHeight / 2),
        roomy: false,
        noBorders: true,
        fontAwesomeCSSUrl: '/css/font-awesome.css',
        style: `padding: 4px 0`,
        items: items.filter(item => !item.ctxOnly)
      })
    }
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

  async doDiff (base) {
    if (this.attachedMode) beaker.browser.gotoUrl(`beaker://diff/?base=${base}`)
    else window.open(`beaker://diff/?base=${base}`)
  }

  async onSelectDrive (e) {
    e.preventDefault()
    var drive = await beaker.shell.selectDriveDialog()
    loc.setUrl(drive)
  }
}

customElements.define('explorer-app', ExplorerApp)
