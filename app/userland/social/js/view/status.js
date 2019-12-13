import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../lib/uwg.js'
import * as toast from '../com/toast.js'
import '../com/profiles/aside.js'
import '../com/status/status.js'
import '../com/comments/thread.js'

export class StatusView extends LitElement {
  static get properties () {
    return {
      subNav: {type: String},
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
    this.subNav = 'comments'
    this.user = undefined
    this.author = undefined
    this.filename = undefined
    this.status = undefined
  }

  async load () {
    var status = await uwg.feed.get(this.author, this.filename)
    ;[status.likedBy, status.comments] = await Promise.all([
      await uwg.likes.tabulate(status.url),
      await uwg.comments.thread(status.url)
    ])
    status.numComments = status.comments.length
    this.status = status
    console.log(this.status)
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  render () {
    if (!this.status) return html``
    const navItem = (id, label) => html`
      <a
        class=${classMap({selected: id === this.subNav})}
        @click=${e => this.onClickNav(id)}
      >${label}</a>
    `
    return html`
      <div class="layout wide right-col">
        <main>
          <beaker-status
            expanded
            inline-avi
            .status=${this.status}
            user-url="${this.user ? this.user.url : undefined}"
            @toggle-like=${this.onToggleLike}
          ></beaker-status>
          <nav class="pills">
            ${navItem('comments', 'Comments')}
            ${navItem('likedBy', 'Liked by')}
          </nav>
          ${this.subNav === 'comments' ? html`
            <beaker-comments-thread
              .comments=${this.status ? this.status.comments : undefined}
              href="${this.status ? this.status.url : undefined}"
              user-url="${this.user ? this.user.url : undefined}"
              @submit-comment=${this.onSubmitComment}
              @delete-comment=${this.onDeleteComment}
            ></beaker-comments-thread>
          ` : this.subNav === 'likedBy' ? html`
            <div class="layout split-col">
              ${repeat(this.status.likedBy, drive => html`
                <beaker-profile-aside loadable .user=${this.user} id=${drive.url.slice('dat://'.length)}></beaker-profile-header>
              `)}
            </div>
          ` : ''}
        </main>
        <aside>
          <beaker-profile-aside class="dark" loadable .user=${this.user} id=${this.author}></beaker-profile-header>
        </aside>
      </div>
    `
  }

  // events
  // =

  async onClickNav (id) {
    this.subNav = id
    await this.requestUpdate()
    Array.from(this.querySelectorAll('[loadable]'), el => el.load())
  }

  async onToggleLike (e) {
    let statusEl = e.target
    let status = e.detail.status
    try {
      let i = status.likedBy.findIndex(drive => drive.url === this.user.url)
      if (i !== -1) {
        await uwg.likes.remove(status.url)
      } else {
        await uwg.likes.put(status.url)
      }
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to add/remove like')
      console.error(e)
      return
    }

    status.likedBy = await uwg.likes.tabulate(status.url)
    statusEl.requestUpdate()
  }

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