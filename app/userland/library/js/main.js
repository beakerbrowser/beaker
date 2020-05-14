import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { EditBookmarkPopup } from './com/edit-bookmark-popup.js'
import { AddContactPopup } from './com/add-contact-popup.js'
import mainCSS from '../css/main.css.js'
import './views/drives.js'
import './views/bookmarks.js'
import './views/address-book.js'
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
          <input placeholder="Search my ${this.view.replace('-', ' ')}" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
        </div>
        <a class="new-btn" @click=${this.onClickNew}>
          New <span class="fas fa-fw fa-plus"></span>
        </a>
      </header>
      <div class="layout">
        <nav>
          <div class="page-nav">
            ${pageNav('drives', html`<span class="far fa-fw fa-hdd"></span> My Drives`)}
            ${pageNav('hosting', html`<span class="fas fa-fw fa-share-alt"></span> Hosting`)}
            ${pageNav('bookmarks', html`<span class="far fa-fw fa-star"></span> Bookmarks`)}
            ${pageNav('address-book', html`<span class="far fa-fw fa-address-card"></span> Address Book`)}
            ${pageNav('downloads', html`<span class="fas fa-fw fa-arrow-down"></span> Downloads`)}
          </div>
        </nav>
        <main>
          ${this.view === 'drives' ? html`
            <drives-view class="full-size" .filter=${this.filter} loadable></drives-view>
          ` : ''}
          ${this.view === 'bookmarks' ? html`
            <bookmarks-view class="full-size" .filter=${this.filter} loadable></bookmarks-view>
          ` : ''}
          ${this.view === 'address-book' ? html`
            <address-book-view class="full-size" .filter=${this.filter} loadable></address-book-view>
          ` : ''}
          ${this.view === 'hosting' ? html`
            <drives-view class="full-size" readonly .filter=${this.filter} loadable></drives-view>
          ` : ''}
          ${this.view === 'downloads' ? html`
            <downloads-view class="full-size" .filter=${this.filter} loadable></downloads-view>
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
    var rect = e.currentTarget.getClientRects()[0]
    return contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      top: false,
      roomy: true,
      noBorders: true,
      fontAwesomeCSSUrl: 'beaker://assets/font-awesome.css',
      style: `padding: 4px 0`,
      items: [
        {
          icon: 'far fa-hdd',
          label: 'Hyperdrive',
          click: async () => {
            var drive = await beaker.hyperdrive.createDrive()
            toast.create('Drive created')
            window.location = drive.url
          }
        },
        {
          icon: 'far fa-star',
          label: 'Bookmark',
          click: async () => {
            await EditBookmarkPopup.create()
            if (this.view === 'bookmarks') {
              this.shadowRoot.querySelector('bookmarks-view').load()
            }
          }
        },
        {
          icon: 'far fa-address-card',
          label: 'Contact',
          click: async () => {
            await AddContactPopup.create()
            if (this.view === 'address-book') {
              this.shadowRoot.querySelector('address-book-view').load()
            }
          }
        }
      ]
    })
  }
}

customElements.define('app-main', LibraryApp)