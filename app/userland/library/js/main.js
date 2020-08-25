import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from 'beaker://app-stdlib/js/com/toast.js'
import { findParent } from 'beaker://app-stdlib/js/dom.js'
import { EditBookmarkPopup } from 'beaker://app-stdlib/js/com/popups/edit-bookmark.js'
import { AddContactPopup } from './com/add-contact-popup.js'
import { NewPagePopup } from 'beaker://app-stdlib/js/com/popups/new-page.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import mainCSS from '../css/main.css.js'
import './views/drives.js'
import './views/bookmarks.js'
import './views/address-book.js'
import './views/history.js'
import './views/downloads.js'
import './views/pages.js'

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
    beaker.panes.setAttachable()
    beaker.panes.attachToLastActivePane()

    this.view = ''
    const getView = () => {
      var view = location.pathname.slice(1)
      return view === '' ? 'bookmarks' : view
    }
    this.setView(getView())
    window.addEventListener('popstate', (event) => {
      this.setView(getView())
    })

    this.addEventListener('click', e => {
      // route navigations to the attached pane if present
      var attachedPane = beaker.panes.getAttachedPane()
      if (!attachedPane) return
      let anchor = findParent(e.path[0], el => el.tagName === 'A')
      if (anchor) {
        if (!e.metaKey && anchor.getAttribute('target') !== '_blank') {
          e.stopPropagation()
          e.preventDefault()
          beaker.panes.navigate(attachedPane.id, anchor.getAttribute('href'))
        }
      }
    })
  }

  async setView (view) {
    if (this.view === view) return
    this.view = view

    var pathname = `/${view}`
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
          <img src="asset:favicon:beaker://library/">
          My Library
        </div>
        <div class="search-ctrl">
          <span class="fas fa-search"></span>
          <input placeholder="Search ${this.view.replace('-', ' ')}" @keyup=${e => {this.filter = e.currentTarget.value.toLowerCase()}}>
        </div>
        ${this.renderNewBtn()}
      </header>
      <div class="layout">
        <nav>
          <div class="page-nav">
            ${pageNav('bookmarks', html`<span class="far fa-fw fa-star"></span> <span class="label">Bookmarks</span>`)}
            ${pageNav('sites', html`<span class="fas fa-fw fa-sitemap"></span> <span class="label">Sites</span>`)}
            ${pageNav('pages', html`<span class="far fa-fw fa-file-alt"></span> <span class="label">Pages</span>`)}
            ${pageNav('address-book', html`<span class="far fa-fw fa-address-card"></span> <span class="label">Address Book</span>`)}
            ${pageNav('history', html`<span class="fas fa-fw fa-history"></span> <span class="label">History</span>`)}
            ${pageNav('downloads', html`<span class="fas fa-fw fa-arrow-down"></span> <span class="label">Downloads</span>`)}
          </div>
        </nav>
        <main>
          ${this.view === 'sites' ? html`
            <drives-view class="full-size" .filter=${this.filter} loadable></drives-view>
          ` : ''}
          ${this.view === 'bookmarks' ? html`
            <bookmarks-view class="full-size" .filter=${this.filter} loadable></bookmarks-view>
          ` : ''}
          ${this.view === 'address-book' ? html`
            <address-book-view class="full-size" .filter=${this.filter} loadable></address-book-view>
          ` : ''}
          ${this.view === 'history' ? html`
            <history-view class="full-size" .filter=${this.filter} loadable></history-view>
          ` : ''}
          ${this.view === 'downloads' ? html`
            <downloads-view class="full-size" .filter=${this.filter} loadable></downloads-view>
          ` : ''}
          ${this.view === 'pages' ? html`
            <pages-view class="full-size" .filter=${this.filter} loadable></pages-view>
          ` : ''}
        </main>
      </div>
    `
  }

  renderNewBtn () {
    if (this.view === 'sites') {
      return html`
        <span class="new-btn"><button @click=${this.onCreateSite}>New Site</button></span>
      `
    }
    if (this.view === 'pages') {
      return html`
        <span class="new-btn"><button @click=${this.onNewPage}>New Page</button></span>
      `
    }
    if (this.view === 'bookmarks') {
      return html`
        <span class="new-btn"><button @click=${this.onCreateBookmark}>New Bookmark</button></span>
      `
    }
    if (this.view === 'address-book') {
      return html`
        <span class="new-btn"><button @click=${this.onAddContact}>Add Contact</button></span>
      `
    }
  }

  // events
  // =

  async onCreateSite () {
    var drive = await beaker.hyperdrive.createDrive()
    toast.create('Drive created')
    beaker.browser.openUrl(drive.url, {setActive: true, addedPaneUrls: ['beaker://editor/']})
  }

  async onNewPage (e) {
    var rect = e.currentTarget.getClientRects()[0]
    e.preventDefault()
    e.stopPropagation()
    const doNewPage = async (opts) => {
      try {
        var res = await NewPagePopup.create(opts)
        beaker.browser.openUrl(res.url, {setActive: true, addedPaneUrls: ['beaker://editor/']})
        if (this.view === 'pages') {
          this.shadowRoot.querySelector('pages-view').load()
        }
      } catch (e) {
        // ignore
        console.log(e)
      }
    }
    const items = [
      {icon: 'fa-fw far fa-file-alt', label: 'New Page Draft', click: () => doNewPage({type: 'page', draft: true})},
      {

        icon: html`
          <span class="icon-stack" style="position: relative;">
            <i class="far fa-file-alt fa-fw" style="position: relative; left: -2px;"></i>
            <i class="fas fa-lock" style="position: absolute; width: 4px; font-size: 50%; bottom: 0; left: 6px; background: #fff; padding: 0 1px"></i>
          </span>
        `,
        label: 'New Private Page',
        click: () => doNewPage({type: 'page', private: true})
      }
    ]
    contextMenu.create({
      x: rect.right,
      y: rect.bottom,
      right: true,
      noBorders: true,
      roomy: true,
      style: `padding: 6px 0`,
      items
    })
  }

  async onCreateBookmark () {
    await EditBookmarkPopup.create()
    toast.create('Bookmark added')
    if (this.view === 'bookmarks') {
      this.shadowRoot.querySelector('bookmarks-view').load()
    }
  }

  async onAddContact () {
    await AddContactPopup.create()
    toast.create('Contact added')
    if (this.view === 'address-book') {
      this.shadowRoot.querySelector('address-book-view').load()
    }
  }
}

customElements.define('app-main', LibraryApp)