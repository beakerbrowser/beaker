import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import * as newDriveDropdown from 'beaker://app-stdlib/js/com/new-drive-dropdown.js'
import mainCSS from '../css/main.css.js'
import './views/drives.js'
import './views/bookmarks.js'
import './views/downloads.js'

export class LibraryApp extends LitElement {
  static get properties () {
    return {
      view: {type: String},
      filter: {type: String}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()
    this.view = ''
    const getView = () => {
      var view = location.pathname.slice(1)
      return view === '' ? 'drives' : view
    }
    this.setView(getView())
    this.addEventListener('contextmenu', this.onContextmenu.bind(this))
    window.addEventListener('popstate', (event) => {
      this.setView(getView())
    })
  }

  async setView (view) {
    if (this.view === view) return
    this.view = view

    var pathname = view === 'drives' ? '/' : `/${view}`
    if (location.pathname !== pathname) {
      window.history.pushState({}, '', pathname)
    }

    await this.requestUpdate()
    this.shadowRoot.querySelector('[loadable]').load()
  }

  newDriveMenu (x, y, right = false) {
    contextMenu.create({
      x,
      y,
      right: right || (x > document.body.scrollWidth - 300),
      top: (y > window.innerHeight / 2),
      roomy: false,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        html`<div class="section-header light small">New drive</a>`,
        {
          icon: 'fas fa-fw fa-desktop',
          label: 'Website',
          click: () => this.newDrive('website')
        },
        {
          icon: 'fas fa-fw fa-users',
          label: 'User Group',
          click: () => this.newDrive('group')
        },
        {
          icon: 'far fa-fw fa-folder-open',
          label: 'Files drive',
          click: () => this.newDrive()
        },
        {
          icon: 'fas fa-fw fa-cube',
          label: 'Module',
          click: () => this.newDrive('module')
        }
      ]
    })
  }

  async newDrive (type) {
    var drive = await Hyperdrive.create({type})
    toast.create('Drive created')
    window.location = drive.url
  }

  // rendering
  // =

  render () {
    const pageNav = (view, label) => html`
      <a class="${this.view === view ? 'current' : ''}" @click=${e => this.setView(view)}>
        ${label}
      </a>
    `
    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <header>
        <div class="brand">
          <span class="fas fa-fw fa-list"></span>
          My Library
        </div>
        <div class="search-ctrl">
          <span class="fas fa-search"></span>
          <input placeholder="Search my drives" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
        </div>
        <a class="new-btn" @click=${this.onClickNew}>
          New <span class="fas fa-fw fa-plus"></span>
        </a>
      </header>
      <div class="layout">
        <nav>
          <div class="page-nav">
            ${pageNav('drives', html`<span class="far fa-fw fa-hdd"></span> Drives`)}
            ${pageNav('bookmarks', html`<span class="far fa-fw fa-star"></span> Bookmarks`)}
            ${pageNav('downloads', html`<span class="fas fa-fw fa-arrow-down"></span> Downloads`)}
          </div>
        </nav>
        <main>
          ${this.view === 'drives' ? html`
            <drives-view .filter=${this.filter} loadable></drives-view>
          ` : ''}
          ${this.view === 'bookmarks' ? html`
            <bookmarks-view .filter=${this.filter} loadable></bookmarks-view>
          ` : ''}
          ${this.view === 'downloads' ? html`
            <downloads-view .filter=${this.filter} loadable></downloads-view>
          ` : ''}
        </main>
      </div>
    `
  }

  // events
  // =

  async onClickNew (e) {
    e.preventDefault()
    e.stopPropagation()

    var btn = e.currentTarget
    var rect = btn.getClientRects()[0]
    btn.classList.add('pressed')
    await newDriveDropdown.create({
      x: rect.left - 5,
      y: 8
    })
    btn.classList.remove('pressed')
  }

  onContextmenu (e) {
    e.preventDefault()
    e.stopPropagation()
    this.newDriveMenu(e.clientX, e.clientY)
  }
}

customElements.define('app-main', LibraryApp)