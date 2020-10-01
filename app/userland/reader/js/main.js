import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import * as QP from './lib/qp.js'
import * as contextMenu from 'beaker://app-stdlib/js/com/context-menu.js'
import { pluralize, getOrigin } from 'beaker://app-stdlib/js/strings.js'
import css from '../css/main.css.js'
import './com/indexer-state.js'
import './com/blog-feed.js'
import './com/blogpost-view.js'
import './com/blogpost-composer.js'

class ReaderApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      suggestedSites: {type: Array},
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
    this.suggestedSites = undefined
    this.composerMode = false
    this.currentPost = undefined

    this.configFromQP()
    this.load().then(() => {
      this.loadSuggestions()
    })

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

  async loadSuggestions () {
    const getSite = async (url) => {
      let {site} = await beaker.index.gql(`
        site(url: "${url}") {
          url
          title
          description
          subCount: backlinkCount(paths: ["/subscriptions/*.goto"] indexes: ["local", "network"])
        }
      `)
      return site
    }
    let {allSubscriptions} = await beaker.index.gql(`
      allSubscriptions: records(paths: ["/subscriptions/*.goto"] limit: 100 sort: crtime reverse: true) {
        metadata
      }
    `)
    var currentSubs = new Set((await beaker.subscriptions.list()).map(source => (getOrigin(source.href))))
    currentSubs.add(getOrigin(this.profile.url))
    var candidates = allSubscriptions.filter(sub => !currentSubs.has((getOrigin(sub.metadata.href))))
    var suggestedSiteUrls = candidates.reduce((acc, candidate) => {
      var url = candidate.metadata.href
      if (!acc.includes(url)) acc.push(url)
      return acc
    }, [])
    suggestedSiteUrls.sort(() => Math.random() - 0.5)
    var suggestedSites = await Promise.all(suggestedSiteUrls.slice(0, 12).map(url => getSite(url).catch(e => undefined)))
    suggestedSites = suggestedSites.filter(site => site && site.title)
    if (suggestedSites.length < 12) {
      let {moreSites} = await beaker.index.gql(`
        moreSites: sites(indexes: ["network"] limit: 12) { url }
      `)
      moreSites = moreSites.filter(site => !currentSubs.has(site.url))

      // HACK
      // the network index for listSites() currently doesn't pull from index.json
      // (which is stupid but it's the most efficient option atm)
      // so we need to call getSite()
      // -prf
      moreSites = await Promise.all(moreSites.map(s => getSite(s.url).catch(e => undefined)))
      suggestedSites = suggestedSites.concat(moreSites).filter(Boolean)
    }
    suggestedSites.sort(() => Math.random() - 0.5)
    this.suggestedSites = suggestedSites.slice(0, 12)
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
            ${this.suggestedSites?.length > 0 ? html`
              <h3>Suggested Sites</h3>
              <section class="suggested-sites">
                ${repeat(this.suggestedSites.slice(0, 3), site => html`
                  <div class="site">
                    <div class="title">
                      <a href=${site.url} title=${site.title} target="_blank">${site.title}</a>
                    </div>
                    <div class="subscribers">
                      ${site.subCount} ${pluralize(site.subCount, 'subscriber')}
                    </div>
                    ${site.subscribed ? html`
                      <button class="block transparent" disabled><span class="fas fa-check"></span> Subscribed</button>
                    ` : html`
                      <button class="block" @click=${e => this.onClickSuggestedSubscribe(e, site)}>Subscribe</button>
                    `}
                  </div>
                `)}
              </section>
            ` : ''}
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
    var {currentPost} = await beaker.index.gql(`
      currentPost: record (url: "${e.detail.url}") {
        path
        url
        ctime
        mtime
        rtime
        metadata
        site {
          url
          title
        }
        commentCount: backlinkCount(paths: ["/comments/*.md"])
      }
    `)
    this.currentPost = currentPost
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

    var {drafts} = await beaker.index.gql(`
      drafts: records (paths: ["/blog/*.md"] origins: ["hyper://private"] sort: crtime reverse: true) {
        path
        url
        ctime
        mtime
        rtime
        metadata
        site {
          url
          title
        }
        commentCount: backlinkCount(paths: ["/comments/*.md"])
      }
    `)
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

  async onClickSuggestedSubscribe (e, site) {
    e.preventDefault()
    site.subscribed = true
    this.requestUpdate()
    await beaker.subscriptions.add({
      href: site.url,
      title: site.title,
      site: this.profile.url
    })
    // wait 1s then replace/remove the suggestion
    setTimeout(() => {
      this.suggestedSites = this.suggestedSites.filter(s => s !== site)
    }, 1e3)
  }
}

customElements.define('reader-app', ReaderApp)
