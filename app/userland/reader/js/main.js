import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import * as QP from './lib/qp.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import css from '../css/main.css.js'
import './com/indexer-state.js'
import './com/blog-feed.js'
import './com/blogpost-view.js'
import './com/blogpost-composer.js'

class ReaderApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      composerMode: {type: Boolean},
      currentPost: {type: Object}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.composerMode = false
    this.currentPost = undefined

    this.configFromQP()
    this.load()

    window.addEventListener('popstate', (event) => {
      this.configFromQP()
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
          <button class="transparent" @click=${this.onClickDrafts}>Drafts <span class="fas fa-caret-down"></span></button>
          <button class="tooltip-left" data-tooltip="New draft" @click=${e => { this.currentPost = undefined; this.composerMode = true }}>
            <span class="fas fa-edit"></span>
          </button>
        </div>
        <beaker-blog-feed current=${this.currentPost?.url} @view-post=${this.onViewPost}></beaker-blog-feed>
      </nav>
      <main>
        ${this.composerMode ? html`
          <beaker-blogpost-composer
            .post=${this.currentPost}
            .profile=${this.profile}
            @publish=${this.onComposerPublish}
            @cancel-edit=${this.onComposerCancelEdit}
            @delete=${this.onComposerDelete}
          ></beaker-blogpost-composer>
        ` : this.currentPost ? html`
          <beaker-blogpost-view .post=${this.currentPost} .profile=${this.profile} @edit-post=${this.onEditPost}></beaker-blogpost-view>
        ` : html`
          <div class="empty">
            <h2>Beaker Reader</h2>
            <p>Read and publish blog posts on your network</p>
          </div>
        `}
      </main>
    `
  }

  // events
  // =

  onViewPost (e) {
    this.composerMode = false
    this.currentPost = e.detail.post
  }

  onEditPost (e) {
    this.composerMode = true
    this.currentPost = e.detail.post
  }

  async onComposerPublish (e) {
    this.currentPost = await beaker.index.get(e.detail.url)
    this.composerMode = false
  }

  onComposerCancelEdit (e) {
    this.composerMode = false
  }

  onComposerDelete (e) {
    location.reload()
  }

  async onClickDrafts (e) {
    e.preventDefault()
    e.stopPropagation()
    var rect = e.currentTarget.getClientRects()[0]

    var drafts = await beaker.index.query({
      origin: 'hyper://private',
      path: '/blog/*.md',
      index: 'local',
      order: 'crtime',
      reverse: true
    })
    contextMenu.create({
      x: rect.left,
      y: rect.bottom,
      noBorders: true,
      roomy: true,
      style: `padding: 6px 0`,
      items: drafts.length
        ? drafts.map(draft => ({label: draft.metadata.title, click: () => { this.composerMode = true; this.currentPost = draft }}))
        : [{label: html`<em>No drafts</em>`}]
    })
  }
}

customElements.define('reader-app', ReaderApp)
