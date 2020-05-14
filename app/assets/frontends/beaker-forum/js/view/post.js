import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import * as uwg from '../lib/uwg.js'
import * as isreadDb from '../lib/isread-db.js'
import * as toast from '../com/toast.js'
import '../com/profiles/aside.js'
import '../com/posts/post.js'
import '../com/comments/thread.js'
import '../com/about.js'

export class PostView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      filename: {type: String},
      post: {type: Object}
    }
  }
 
  createRenderRoot () {
    return this // no shadow dom
  }

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.filename = undefined
    this.post = undefined
  }

  get path () {
    return `/beaker-forum/posts/${this.filename}`
  }

  async load () {
    var authorProfile = await uwg.users.getByUserID(this.author)
    var post = await uwg.posts.get(authorProfile.url, this.path)
    ;[post.numComments] = await Promise.all([
      uwg.comments.count({href: post.url})
    ])
    this.post = post
    console.log(this.post)

    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())

    var comments = await uwg.comments.thread(post.url)
    await loadCommentAnnotations(comments)
    post.comments = comments
    await this.requestUpdate()

    /* dont await */ isreadDb.put(`${post.drive.id}:${post.path.split('/').pop()}`)
  }

  render () {
    if (!this.post) return html``
    return html`
      <style>
        beaker-post {
          margin: 20px 0 16px;
        }
        beaker-profile-aside {
          width: 260px;
          margin: 0 auto 16px;
        }
        beaker-comments-thread {
          margin-left: 50px;
          margin-bottom: 100px;
        }
      </style>
      <div class="layout right-col">
        <main>
          <nav class="pills">
            <a class="selected" href="/" title="Posts">Posts</a>
            <a href="/comments" title="Comments">Comments</a>
            <a href="/users" title="Users">Users</a>
          </nav>
          <beaker-post
            fullpage
            expanded
            .post=${this.post}
            user-url="${this.user ? this.user.url : ''}"
            @deleted=${this.onPostDeleted}
          ></beaker-post>
          ${this.post.comments ? html`
            <beaker-comments-thread
              .comments=${this.post ? this.post.comments : undefined}
              href="${this.post ? this.post.url : ''}"
              user-url="${this.user ? this.user.url : ''}"
              @submit-comment=${this.onSubmitComment}
              @delete-comment=${this.onDeleteComment}
            ></beaker-comments-thread>
          ` : html`<div class="spinner" style="margin-left: 40px"></div>`}
        </main>
        <nav>
          <beaker-about loadable></beaker-about>
        </nav>
      </div>
    `
  }

  // events
  // =

  async onClickNav (id) {
    this.subview = id
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  async onSubmitComment (e) {
    // add the new comment
    try {
      var {isEditing, editTarget, href, parent, content} = e.detail
      if (isEditing) {
        await uwg.comments.update(editTarget, {content})
      } else {
        await uwg.comments.add({href, parent, content})
      }
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to add comment')
      console.error(e)
      return
    }
    this.load()
  }

  async onDeleteComment (e) {
    let comment = e.detail.comment

    // delete the comment
    try {
      await uwg.comments.remove(comment)
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to delete comment')
      console.error(e)
      return
    }
    toast.create('Comment deleted')
    this.load()
  }

  async onPostDeleted (e) {
    window.location = `/users/${this.author}`
  }
}

customElements.define('beaker-post-view', PostView)

async function loadCommentAnnotations (comments) {
  await Promise.all(comments.map(async (comment) => {
    if (comment.replies) await loadCommentAnnotations(comment.replies)
  }))
}