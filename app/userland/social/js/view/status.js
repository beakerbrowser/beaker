import { LitElement, html, css } from '../../vendor/lit-element/lit-element.js'
import * as uwg from '../lib/uwg.js'
import * as toast from '../com/toast.js'
import '../com/profiles/aside.js'
import '../com/status/status.js'
import '../com/comments/thread.js'

export class StatusView extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      filename: {type: String},
      status: {type: Object}
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
    this.status = undefined
  }

  async load () {
    var status = await uwg.feed.get(this.author, this.filename)
    status.comments = await uwg.comments.thread(status.url)
    this.status = status
    console.log(this.status)
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    if (!this.status) return html``
    return html`
      <div class="layout wide right-col">
        <main>
          <beaker-status
            expanded
            inline-avi
            .status=${this.status}
            user-url="${this.user ? this.user.url : undefined}"
          ></beaker-status>
          <beaker-comments-thread
            .comments=${this.status ? this.status.comments : undefined}
            href="${this.status ? this.status.url : undefined}"
            user-url="${this.user ? this.user.url : undefined}"
            @submit-comment=${this.onSubmitComment}
            @delete-comment=${this.onDeleteComment}
          ></beaker-comments-thread>
        </main>
        <aside>
          <beaker-profile-aside class="dark" loadable .user=${this.user} id=${this.author}></beaker-profile-header>
        </aside>
      </div>
    `
  }

  // events
  // =

  async onSubmitComment (e) {
    // add the new comment
    try {
      var {href, replyTo, body} = e.detail
      await uwg.comments.add({href, replyTo, body})
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

customElements.define('beaker-status-view', StatusView)

async function loadCommentReactions (comments) {
  await Promise.all(comments.map(async (comment) => {
    // comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    // comment.reactions.sort((a, b) => b.authors.length - a.authors.length)
    // if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}