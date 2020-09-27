import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'beaker://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/blog-feed.css.js'
import { emit } from 'beaker://app-stdlib/js/dom.js'
import { isRead, markRead } from '../lib/is-read.js'

const datefmt = new Intl.DateTimeFormat('default', {month: 'short', day: 'numeric', year: 'numeric'})

class BlogFeed extends LitElement {
  static get properties () {
    return {
      posts: {type: Array},
      current: {type: String}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.posts = undefined
    this.current = undefined
    this.load()
  }

  async load () {
    this.posts = (await beaker.index.query({
      path: '/blog/*.md',
      index: 'local',
      order: 'crtime',
      reverse: true,
      limit: 100
    })).filter(p => p.site.url !== 'hyper://private')
    for (let post of this.posts) {
      let commentCount = await beaker.index.count({
        path: '/comments/*.md',
        links: post.url,
      })
      post.commentCount = commentCount
      this.requestUpdate()
    }
  }

  render () {
    if (!this.posts) {
      return html`<div class="loading"><span class="spinner"></span></div>`
    }
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
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

