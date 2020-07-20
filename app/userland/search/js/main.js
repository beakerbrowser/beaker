import { LitElement, html } from '../vendor/lit-element/lit-element.js'
import { classMap } from '../vendor/lit-element/lit-html/directives/class-map.js'
import * as contextMenu from './com/context-menu.js'
import { toSimpleItemGroups, getSubicon } from './lib/files.js'
import { constructItems as constructContextMenuItems } from './lib/context-menu.js'
import * as settingsMenu from './com/settings-menu.js'
import { getGlobalSavedConfig, setGlobalSavedConfig, getVFCfg } from './lib/config.js'
import { removeMarkdown } from '../vendor/remove-markdown.js'
import mainCSS from '../css/main.css.js'
import './view/search-results.js'

const LOADING_STATES = {
  INITIAL: 0,
  CONTENT: 1,
  LOADED: 2
}

function filterToRegex (filter) {
  return new RegExp(filter, 'gi')
}

let _driveTitleCache = {}
async function getDriveTitle (url) {
  if (_driveTitleCache[url]) return _driveTitleCache[url]
  _driveTitleCache[url] = beaker.hyperdrive.getInfo(url).then(info => info.title)
  return _driveTitleCache[url]
}

function matchAndSliceString (filter, str) {
  let re = filterToRegex(filter)
  if (!str) return false
  let match = re.exec(str)
  if (!match) return false
  let matchStart = re.lastIndex - filter.length
  let matchEnd = re.lastIndex
  let phraseStart = matchStart - 40
  let phraseEnd = matchEnd + 70
  let strLen = str.length
  str = str.slice(Math.max(0, phraseStart), matchStart) + `<mark>${str.slice(matchStart, matchEnd)}</mark>` + str.slice(matchEnd, Math.min(phraseEnd, strLen))
  if (phraseStart > 0) str = '...' + str
  if (phraseEnd < strLen) str = str + '...'
  return str
}

const DEBUG_QUERIES = [
  {
    title: 'Status updates',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/microblog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var dateFormatter = new Intl.DateTimeFormat('en-us', {day: "numeric", month: "short", year: "numeric",})
      var timeFormatter = new Intl.DateTimeFormat('en-US', {hour12: true, hour: "2-digit", minute: "2-digit"})

      var results = []
      for (let candidate of candidates) {
        let content = await beaker.hyperdrive.readFile(candidate.url, 'utf8').catch(e => undefined)
        content = removeMarkdown(content || '')
        if (filter) {
          content = matchAndSliceString(filter, content)
          if (!content) continue
        } else {
          if (content.length > 300) {
            content = content.slice(0, 300) + '...'
          }
        }
        let driveTitle = await getDriveTitle(candidate.drive)
        candidate.toHTML = () => `
          <p>
            <strong><a href=${candidate.url}>${dateFormatter.format(candidate.stat.mtime)} <small>${timeFormatter.format(candidate.stat.mtime)}</small></a></strong>
            by <a href=${candidate.drive}>${driveTitle}</a>
          </p>
          <q>${content}</q>
        `
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }

      return results
    }
  },
  {
    title: 'Blog posts',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: '/blog/*.md',
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let content = await beaker.hyperdrive.readFile(candidate.url).catch(e => undefined)
        content = removeMarkdown(content || '')
        if (filter) {
          let contentMatch = matchAndSliceString(filter, content)
          if (contentMatch) content = contentMatch
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          if (!contentMatch && !titleMatch) continue
        } else {
          if (content.length > 300) {
            content = content.slice(0, 300) + '...'
          }
        }
        let driveTitle = await getDriveTitle(candidate.drive)
        candidate.toHTML = () => `
          <p><a href=${candidate.drive}>${driveTitle}</a></p>
          <h1><a href=${candidate.url}>${title}</a></h1>
          <q>${content}</q>
        `
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    }
  },
  DEBUG_LINKS_QUERY('Modules', 'modules'),
  DEBUG_LINKS_QUERY('Apps', 'apps'),
  {
    title: 'Users',
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let candidates = addressBook.profiles.concat(addressBook.contacts)

      var results = []
      for (let candidate of candidates) {
        let {url, title, description} = await beaker.hyperdrive.getInfo(candidate.key)
        if (filter) {
          let titleMatch = matchAndSliceString(filter, title)
          if (titleMatch) title = titleMatch
          let descriptionMatch = matchAndSliceString(filter, description)
          if (descriptionMatch) description = descriptionMatch
          if (!titleMatch && !descriptionMatch) continue
        } else {
          if (description.length > 300) {
            description = description.slice(0, 300) + '...'
          }
        }
        results.push({
          url,
          title,
          description,
          toHTML: () => `
            <img src="${url}thumb" style="float: left; border-radius: 50%; width: 40px; height: 40px; object-fit: cover; margin-right: 10px">
            <h1><a href="${url}">${title}</a></h1>
            <div><q>${description}</q></div>
          `
        })
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    }
  }
]
function DEBUG_LINKS_QUERY (title, id) {
  return {
    title,
    async query ({filter, limit, offset}) {
      let addressBook = await beaker.hyperdrive.readFile('hyper://system/address-book.json', 'json')
      let drive = addressBook.profiles.concat(addressBook.contacts).map(item => item.key)
      var candidates = await beaker.hyperdrive.query({
        type: 'file',
        drive,
        path: `/links/${id}/*.goto`,
        sort: 'mtime',
        reverse: true,
        limit: filter ? undefined : limit,
        offset: filter ? undefined : offset
      })

      var results = []
      var re = filter ? filterToRegex(filter) : undefined
      for (let candidate of candidates) {
        let title = candidate.stat.metadata.title || candidate.path.split('/').pop()
        let description = candidate.stat.metadata.description || ''
        let href = candidate.stat.metadata.href || ''
        let hrefDecorated = href
        if (re) {
          if (!title || !href) continue
          let match = false
          title = title.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          description = description.replace(re, string => {
            match = true
            return `<mark>${string}</mark>`
          })
          // hrefDecorated = href.replace(re, string => {
          //   match = true
          //   return `<mark>${string}</mark>`
          // })
          if (!match) continue
        }
        let driveTitle = await getDriveTitle(candidate.drive)
        candidate.toHTML = () => `
          <div><small>Shared by <a href=${candidate.drive}>${driveTitle}</a></small></div>
          <h1><a href=${href}>${title}</a></h1>
          ${description ? `<p>${description}</p>` : ''}
        `
        results.push(candidate)
      }

      if (filter && (offset || limit)) {
        offset = offset || 0
        results = results.slice(offset, offset + limit)
      }
      return results
    }
  }
}

export class SearchApp extends LitElement {
  static get properties () {
    return {
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
    this.currentQuery = 0
    this.items = []
    this.filter = undefined
    
    // UI state
    this.loadingState = LOADING_STATES.INITIAL
    this.errorState = undefined
    this.renderMode = undefined
    this.inlineMode = false
    this.sortMode = undefined

    this.load()
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
    this.renderMode = getGlobalSavedConfig('render-mode', getVFCfg(this.viewfileObj, 'renderMode', ['grid', 'list']) || 'grid')
    this.inlineMode = Boolean(getGlobalSavedConfig('inline-mode', getVFCfg(this.viewfileObj, 'inline', [true, false]) || false))
    this.sortMode = getGlobalSavedConfig('sort-mode', 'name')

    // update loading state
    this.loadingState = LOADING_STATES.CONTENT
    this.requestUpdate()

    // read location content
    try {
      await this.readViewfile()
    } catch (e) {
      console.log(e)
    }

    console.log({
      items: this.items,
      itemGroups: this.itemGroups
    })

    this.loadingState = LOADING_STATES.LOADED
    this.requestUpdate()
  }

  async readViewfile () {
    var queryModule = DEBUG_QUERIES[this.currentQuery]
    var items = await this.attempt(
      `Running .view query`,
      () => queryModule.query({filter: this.filter, limit: 50})
    )

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
    return [['grid', 'th-large', 'Grid'], ['list', 'th-list', 'List']]
  }

  get itemGroups () {
    return [{id: 'results', label: 'Results', items: this.items}]
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
        @show-context-menu=${this.onShowMenu}
      >
        ${this.loadingState === LOADING_STATES.INITIAL
          ? this.renderInitialLoading()
          : html`
            ${this.renderHeader()}
            ${this.renderLeftNav()}
            <main>
              ${this.loadingState === LOADING_STATES.CONTENT ? html`
                <div class="loading-notice">Loading...</div>
              ` : ''}
              ${this.renderErrorState()}
              ${this.renderView()}
            </main>
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
        <span class="search">
          <span class="fas fa-search"></span>
          <input placeholder="Search" @keyup=${this.onSearchKeyup}>
        </span>
        <button class="transparent" @click=${this.onClickSettings}>
          <span class="fas fa-cog"></span> Settings
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
    return html`
      <search-results-view
        render-mode=${this.renderMode}
        ?inline-mode=${this.inlineMode}
        .items=${this.items}
        .itemGroups=${this.itemGroups}
      ></search-results-view>
    `
  }
  
  renderLeftNav () {
    const navItem = (index, title) => html`
      <a
        class=${classMap({current: this.currentQuery === index})}
        href="#"
        title=${title}
        @click=${e => {
          e.preventDefault()
          this.currentQuery = index
          this.load()
        }}
      >${title}</a>
    `
    return html`
      <nav class="left">
        <section class="transparent categories">
          ${DEBUG_QUERIES.map((viewfile, index) => navItem(index, viewfile.title))}
        </section>
      </nav>
    `
  }

  renderErrorState () {
    if (!this.errorState || this.errorState.error.message.includes('TimeoutError')) return undefined
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

  goto (item, newWindow = false) {
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
      url = item.url
    }
    if (newWindow) window.open(url)
    else window.location = url
  }

  onSearchKeyup (e) {
    let value = e.currentTarget.value.trim()
    if (this._searchKeyupTimeout) {
      clearTimeout(this._searchKeyupTimeout)
    }
    this._searchKeyupTimeout = setTimeout(() => {
      if (this.filter === value) return
      this.filter = value
      this.load()
    }, 500)
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

  async onClickSettings (e) {
    let el = e.currentTarget
    if (el.classList.contains('active')) return
    e.preventDefault()
    e.stopPropagation()
    let rect = el.getClientRects()[0]
    el.classList.add('active')
    await settingsMenu.create(this, {x: rect.right, y: rect.bottom})
    el.classList.remove('active')
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
}

customElements.define('search-app', SearchApp)
