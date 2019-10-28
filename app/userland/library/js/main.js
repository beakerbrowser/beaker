import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/query-params.js'
import _debounce from 'lodash.debounce'
import './views/bookmarks.js'
import './views/drives.js'
import './views/trash.js'
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
    this.currentWritableFilter = QP.getParam('writable', '')
    this.currentQuery = undefined
    this.items = []

    this.load()
  }

  async load () {
    if (!this.user) {
      this.user = await beaker.users.getCurrent()
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
      <div id="content" @change-view=${this.onChangeView}>
        <drives-view
          the-current-view
          .user=${this.user}
        ></drives-view>
      </div>
    `
  }

//   <library-side-filters
//   current=${this.currentWritableFilter}
//   @change=${this.onChangeWritableFilter}
// ></library-side-filters>

  // events
  // =

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