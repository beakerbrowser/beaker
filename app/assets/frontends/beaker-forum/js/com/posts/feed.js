import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import * as isreadDb from '../../lib/isread-db.js'
import feedCSS from '../../../css/com/posts/feed.css.js'
import './post.js'
import '../paginator.js'

const PAGE_SIZE = 25

export class PostsFeed extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      posts: {type: Array},
      error: {type: String}
    }
  }

  static get styles () {
    return feedCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.posts = undefined
    this.error = false
    this.page = 0
  }

  async load () {
    try {
      var authorProfile = this.author ? await uwg.users.getByUserID(this.author) : undefined
      var posts = await uwg.posts.list({
        author: this.author ? authorProfile.url : undefined,
        offset: this.page * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort: 'name',
        reverse: true
      }, {includeProfiles: true})
      for (let post of posts) {
        post.isRead = await isreadDb.get(`${post.drive.id}:${post.path.split('/').pop()}`)
      }
      /* dont await */ this.loadFeedAnnotations(posts)
      this.posts = posts
    } catch (e) {
      this.error = e.toString()
    }
    console.log(this.posts)
  }

  requestFeedPostsUpdate () {
    Array.from(this.shadowRoot.querySelectorAll('beaker-post'), el => el.requestUpdate())
  }

  async refreshFeed () {
    this.loadFeedAnnotations(this.posts)
  }

  async loadFeedAnnotations (posts) {
    for (let post of posts) {
      ;[post.numComments] = await Promise.all([
        uwg.comments.count({href: post.url})
      ])
      this.requestFeedPostsUpdate()
    }
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="feed">
        ${this.error ? html`
          <div class="error">
            ${this.error}
          </div>
        ` : typeof this.posts === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.posts, post => html`
            <beaker-post
              class="${post.isRead ? 'read' : 'unread'}"
              .post=${post}
              user-url="${this.user ? this.user.url : ''}"
              @deleted=${this.onPostDeleted}
            ></beaker-post>
          `)}
          ${this.posts.length === 0
            ? html`
              <div class="empty">
                <div><span class="far fa-comment"></span></div>
                <div>
                  ${this.author
                    ? 'This user has not posted anything.'
                    : 'This group has not posted anything.'}
                </div>
              </div>
            ` : ''}
          ${this.page > 0 || this.posts.length === PAGE_SIZE ? html`
            <beaker-paginator
              page=${this.page}
              label="Showing posts ${(this.page * PAGE_SIZE) + 1} - ${(this.page + 1) * PAGE_SIZE}"
              @change-page=${this.onChangePage}
            ></beaker-paginator>
          ` : ''}
        `}
      </div>
    `
  }

  // events
  // =

  onChangePage (e) {
    this.page = e.detail.page
    this.posts = undefined
    this.load()
  }

  async onPostDeleted (e) {
    let post = e.detail.post
    this.posts = this.posts.filter(p => p.url !== post.url)
  }
}

customElements.define('beaker-posts-feed', PostsFeed)
