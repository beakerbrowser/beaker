import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../lib/uwg.js'
import * as toast from '../com/toast.js'
import '../com/profiles/aside.js'
import '../com/posts/post.js'
import '../com/comments/thread.js'
import '../com/post-buttons.js'
import '../com/topics.js'

export class PostView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      topic: {type: String},
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
    this.topic = undefined
    this.filename = undefined
    this.post = undefined
  }

  get path () {
    return `/posts/${this.topic}/${this.filename}`
  }

  async load () {
    var post = await uwg.posts.get(this.author, this.path)
    ;[post.votes, post.numComments, post.comments] = await Promise.all([
      uwg.votes.tabulate(post.url),
      uwg.comments.count({href: post.url}),
      uwg.comments.thread(post.url)
    ])
    this.post = post
    console.log(this.post)
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    if (!this.post) return html``
    return html`
      <style>
        beaker-post {
          margin-bottom: 16px;
        }
        beaker-comments-thread {
          margin-left: 40px;
          margin-bottom: 100px;
        }
      </style>
      <div class="layout right-col">
        <main>
          <beaker-post
            expanded
            .post=${this.post}
            user-url="${this.user ? this.user.url : undefined}"
          ></beaker-post>
          ${this.post.votes.upvotes.length || this.post.votes.upvotes.length ? html`
            <div class="votes">
              ${this.post.votes.upvotes.length ? html`
                <div>
                  <strong>Upvoted by:</strong>
                  ${this.post.votes.upvotes.map(profile => html`
                    <a href=${profile.url} title=${profile.title}>${profile.title}</a>
                  `)}
                </div>
              ` : ''}
              ${this.post.votes.downvotes.length ? html`
                <div>
                  <strong>Downvoted by:</strong>
                  ${this.post.votes.downvotes.map(profile => html`
                    <a href=${profile.url} title=${profile.title}>${profile.title}</a>
                  `)}
                </div>
              ` : ''}
            </div>
          ` : ''}
          <beaker-comments-thread
            .comments=${this.post ? this.post.comments : undefined}
            href="${this.post ? this.post.url : undefined}"
            user-url="${this.user ? this.user.url : undefined}"
            @submit-comment=${this.onSubmitComment}
            @delete-comment=${this.onDeleteComment}
          ></beaker-comments-thread>
        </main>
        <aside>
          <beaker-profile-aside class="dark" loadable .user=${this.user} id=${this.author}></beaker-profile-aside>
          <beaker-post-buttons></beaker-post-buttons>
          <beaker-topics loadable></beaker-topics>
        </aside>
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

  async onToggleLike (e) {
    let statusEl = e.target
    let post = e.detail.post
    try {
      let i = post.likedBy.findIndex(drive => drive.url === this.user.url)
      if (i !== -1) {
        await uwg.likes.remove(post.url)
      } else {
        await uwg.likes.put(post.url)
      }
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to add/remove like')
      console.error(e)
      return
    }

    post.likedBy = await uwg.likes.tabulate(post.url)
    statusEl.requestUpdate()
  }

  async onSubmitComment (e) {
    // add the new comment
    try {
      var {href, parent, content} = e.detail
      await uwg.comments.add({href, parent, content})
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
      await uwg.comments.remove(comment.path)
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to delete comment')
      console.error(e)
      return
    }
    toast.create('Comment deleted')
    this.load()
  }
}

customElements.define('beaker-post-view', PostView)

async function loadCommentReactions (comments) {
  await Promise.all(comments.map(async (comment) => {
    // comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    // comment.reactions.sort((a, b) => b.authors.length - a.authors.length)
    // if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}