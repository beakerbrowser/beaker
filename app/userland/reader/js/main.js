import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/qp.js'
import css from '../css/main.css.js'
import './com/indexer-state.js'
import './com/blog-feed.js'
import './com/blogpost-view.js'

class ReaderApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      currentPost: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.currentPost = undefined

    this.configFromQP()
    this.load()

    window.addEventListener('popstate', (event) => {
      this.configFromQP()
    })

    window.addEventListener('focus', e => {
      this.load()
    })
  }

  configFromQP () {
    // this.currentNav = QP.getParam('view', undefined)
  }

  async load () {
    if (this.shadowRoot.querySelector('beaker-blog-feed')) {
      this.shadowRoot.querySelector('beaker-blog-feed').load()
    }
    this.profile = await beaker.browser.getProfile()
  }

  // async setCurrentView (view) {
  //   this.currentPost = view
  //   QP.setParams({view})
  // }

  // rendering
  // =

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <nav>
        <div class="brand">
          <h1>Beaker Reader</h1>
          <button class="tooltip-left" data-tooltip="Compose new blog post">
            <span class="fas fa-edit"></span>
          </button>
        </div>
        <beaker-blog-feed current=${this.currentPost?.url} @view-post=${this.onViewPost}></beaker-blog-feed>
      </nav>
      <main>
        ${this.currentPost ? html`
          <beaker-blogpost-view .post=${this.currentPost}></beaker-blogpost-view>
        ` : html`
          <div class="empty">
          </div>
        `}
      </main>
    `
  }

  // events
  // =

  onViewPost (e) {
    this.currentPost = e.detail.post
    console.log(e)
  }
}

customElements.define('reader-app', ReaderApp)
