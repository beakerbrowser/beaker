import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/query-params.js'
import _debounce from 'lodash.debounce'
import './com/nav.js'
import './com/side-filters.js'
import './com/filters.js'
import './views/launcher.js'
import './views/bookmarks.js'
import './views/statuses.js'
import './views/dats.js'
import './views/commands.js'
import './views/people.js'
import './views/search.js'
import mainCSS from '../css/main.css.js'

export class LibraryApp extends LitElement {
  static get properties () {
    return {
      items: {type: Array}
    }
  }

  static get styles () {
    return mainCSS
  }

  constructor () {
    super()

    this.user = undefined
    this.fs = undefined
    this.currentView = QP.getParam('view', 'launcher')
    this.currentWritableFilter = QP.getParam('writable', '')
    this.currentQuery = undefined
    this.items = []

    this.load()

    window.addEventListener('focus', _debounce(() => {
      // load latest when we're opened, to make sure we stay in sync
      if (this.currentView === 'launcher') {
        this.load()
      }
    }, 500))
  }

  async load () {
    if (!this.user) {
      this.user = await beaker.users.getCurrent()
    }
    if (!this.fs) {
      this.fs = await navigator.filesystem.get()
    }
    await this.requestUpdate()
    try {
      await this.shadowRoot.querySelector('[the-current-view]').load()
    } catch (e) {
      console.debug(e)
    }
  }

  // rendering
  // =

  render () {    
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <library-nav
        .user=${this.user}
        .fs=${this.fs}
        currentView=${this.currentView}
        @change-view=${this.onChangeView}
        @change-query=${this.onChangeQuery}
      ></library-nav>
      <div id="content">
        ${this.renderView()}
      </div>
    `
  }

  renderView () {
    switch (this.currentView) {
      case 'launcher':
        return html`
          <launcher-view the-current-view></launcher-view>
        `
      case 'bookmarks':
        return html`
          <bookmarks-view
            the-current-view
            .user=${this.user}
            currentView=${this.currentView}
          ></bookmarks-view>
        `
      case 'news-feed':
        return html`
          <statuses-view
            the-current-view
            .user=${this.user}
          ></statuses-view>
        `
      case 'people':
        return html`
          <people-view
            the-current-view
            .user=${this.user}
            currentView=${this.currentView}
          ></people-view>
        `
      case 'commands':
        return html`
          <commands-view
            the-current-view
            .user=${this.user}
          ></commands-view>
        `
      case 'websites':
      case 'trash':
        return html`
          <dats-view
            the-current-view
            .user=${this.user}
            currentView=${this.currentView}
          ></dats-view>
        `
      case 'search':
        return html`
          <search-view
            the-current-view
            .user=${this.user}
            currentView=${this.currentView}
            currentQuery=${this.currentQuery}
          ></search-view>
        `
      default:
        return html`<div class="empty"><div><span class="fas fa-toolbox"></span></div>Under Construction</div>`
    }
  }

//   <library-side-filters
//   current=${this.currentWritableFilter}
//   @change=${this.onChangeWritableFilter}
// ></library-side-filters>

  // events
  // =

  onChangeCategory (e) {
    this.currentCategory = e.detail.category
    QP.setParams({category: this.currentCategory})
    this.load()
  }

  onChangeView (e) {
    this.currentView = e.detail.view
    QP.setParams({view: this.currentView}, true)
    this.load()
  }

  onChangeQuery (e) {
    if (e.detail.value) {
      this.currentQuery = e.detail.value
      this.currentView = 'search'
      this.load()
    }
  }

  onClearType (e) {
    this.currentView = undefined
    QP.setParams({type: this.currentView})
    this.load()
  }

  onChangeWritableFilter (e) {
    this.currentWritableFilter = e.detail.writable
    QP.setParams({writable: this.currentWritableFilter})
    this.load()
  }

  onClearWritableFilter (e) {
    this.currentWritableFilter = ''
    QP.setParams({writable: this.currentWritableFilter})
    this.load()
  }
}

customElements.define('library-app', LibraryApp)