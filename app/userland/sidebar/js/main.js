import { LitElement, html } from '../../app-stdlib/vendor/lit-element/lit-element.js'
import { classMap } from '../../app-stdlib/vendor/lit-element/lit-html/directives/class-map.js'
import sidebarAppCSS from '../css/main.css.js'
import './views/editor.js'
import './views/terminal.js'

class SidebarApp extends LitElement {
  static get properties () {
    return {
      currentUrl: {type: String},
      view: {type: String}
    }
  }

  constructor () {
    super()

    this.isLoading = true
    this.currentUrl = ''
    this.view = 'editor'
    this.rootUrl = null

    const globalAnchorClickHandler = (isPopup) => e => {
      e.preventDefault()
      var a = e.path.reduce((acc, v) => acc || (v.tagName === 'A' ? v : undefined), undefined)
      if (a) {
        var href = a.getAttribute('href')
        if (href && href !== '#' && !href.startsWith('beaker://')) {
          if (isPopup || e.metaKey) {
            beaker.browser.openUrl(href, {setActive: true, isSidebarActive: true})
          } else {
            beaker.browser.gotoUrl(href)
          }
        }
      }
    }
    document.body.addEventListener('auxclick', globalAnchorClickHandler(true))
    document.body.addEventListener('click', globalAnchorClickHandler(false))
    document.body.addEventListener('contextmenu', e => {
      // e.preventDefault()
    })

    // export an API which is called by the browser
    window.sidebarGetCurrentPanel = () => this.view
    window.sidebarLoad = async (url, panel) => {
      this.currentUrl = url
      this.setView(panel || this.view || 'editor')
      this.load()
    }
    window.sidebarShow = () => {
      // TODO anything needed on open
    }
  }

  async load () {
    this.isLoading = true
    if (!this.rootUrl) {
      this.rootUrl = navigator.filesystem.url
    }

    this.isLoading = false
    this.requestUpdate()
  }

  setView (id) {
    this.view = id
    if (id === 'editor') {
      document.querySelector('#monaco-editor').style.display = 'block'
    } else {
      document.querySelector('#monaco-editor').style.display = 'none'
    }
    document.querySelector('#monaco-diff-editor').style.display = 'none'
  }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <a class="close-btn" href="#" @click=${this.onClickClose}><span class="fas fa-fw fa-times"></span></a>
      ${this.renderView()}
    `
  }

  renderView () {
    if (this.view === 'editor') {
      return html`
        <sidebar-editor-view
          url=${this.currentUrl}
        ></sidebar-editor-view>
      `
    }
    if (this.view === 'terminal') {
      return html`
        <web-term
          url=${this.currentUrl}
        ></web-term>
      `
    }
    return html``
  }

  // events
  // =

  onClickClose () {
    beaker.browser.toggleSidebar()
  }

  onRequestView (e) {
    this.setView(e.detail.view)
  }
}
SidebarApp.styles = sidebarAppCSS

customElements.define('sidebar-app', SidebarApp)
