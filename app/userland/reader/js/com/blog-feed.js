import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/blog-feed.css.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { isRead, markRead } from '../lib/is-read.js'

const datefmt = new Intl.DateTimeFormat('default', {month: 'short', day: 'numeric', year: 'numeric'})

class BlogFeed extends LitElement {
  static get properties () {
    return {
      currentView: {type: String},
      posts: {type: Array},
      current: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.currentView = 'feed'
    this.posts = undefined
    this.current = undefined
    this.load()
  }

  async load () {
    if (this.currentView === 'feed') {
      this.posts = (await beaker.index.query({
        path: '/blog/*.md',
        index: 'local',
        order: 'crtime',
        reverse: true,
        limit: 100
      })).filter(p => p.site.url !== 'hyper://private')
      for (let post of this.posts) {
        let [votes, commentCount] = await Promise.all([
          beaker.index.query({
            path: '/votes/*.goto',
            links: post.url,
          }),
          beaker.index.count({
            path: '/comments/*.md',
            links: post.url,
          })
        ])
        // post.myVote = votes.find(v => isSameOrigin(v.site.url, this.profileUrl) || isSameOrigin(v.site.url, 'hyper://private'))
        post.upvoteCount = (new Set(votes.filter(v => v.metadata['vote/value'] == 1).map(v => v.site.url))).size
        post.downvoteCount = (new Set(votes.filter(v => v.metadata['vote/value'] == -1).map(v => v.site.url))).size
        post.commentCount = commentCount
        this.requestUpdate()
      }
    } else {
      this.posts = await beaker.index.query({
        origin: 'hyper://private',
        path: '/blog/*.md',
        index: 'local',
        order: 'crtime',
        reverse: true
      })
    }
  }

  setCurrentView (id) {
    this.currentView = id
    this.load()
  }

  render () {
    if (!this.posts) {
      return html`<div class="loading"><span class="spinner"></span></div>`
    }
    const navItem = (id, label) => html`
      <a class=${this.currentView === id ? 'selected' : ''} @click=${e => this.setCurrentView(id)}>${label}</a>
    `
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="nav">
        ${navItem('feed', 'Feed')}
        ${navItem('drafts', 'Drafts')}
      </div>
      <div class="posts">
        ${repeat(this.posts, post => html`
          <div
            class="post ${this.current === post.url ? 'current' : ''} ${post.site.url !== 'hyper://private' && isRead(post.url) ? 'read' : ''}"
            @click=${e => this.onClickPost(e, post)}
          >
            <div class="title">${post.metadata.title || post.path}</div>
            <div class="date">${datefmt.format(new Date(post.ctime))}</div>
            <div class="author">${post.site.title}</div>
            ${post.site.url === 'hyper://private' ? html`
              <div><span class="badge">draft</span></div>
            ` : html`
              <div class="signals">
                <span><span class="fas fa-angle-up"></span> ${post.upvoteCount}</span>
                <span><span class="fas fa-angle-down"></span> ${post.downvoteCount}</span>
                <span><span class="far fa-fw fa-comment"></span> ${post.commentCount}</span>
              </div>
            `}
          </div>
        `)}
      </div>
    `
  }

  // events
  // =

  onClickPost (e, post) {
    markRead(post.url, true)
    emit(this, 'view-post', {detail: {post}})
  }
}

customElements.define('beaker-blog-feed', BlogFeed)

