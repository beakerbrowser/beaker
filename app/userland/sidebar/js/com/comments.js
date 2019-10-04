import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import '../../../app-stdlib/js/com/comments/thread.js'

class SidebarComments extends LitElement {
  static get properties () {
    return {
      url: {type: String},
      user: {type: Object},
      feedAuthors: {type: Array},
      comments: {type: Array},
      commentCount: {type: Array}
    }
  }

  static get styles () {
    return css`
    :host {
      display: block;
    }

    h5 {
      margin-bottom: 5px;
    }

    beaker-comments-thread {
      border-color: transparent;
      padding: 0 0 100px;
    
      --body-font-size: 13px;
      --header-font-size: 11px;
      --title-font-size: 12px;
      --footer-font-size: 11px;
      --comment-top-margin: 10px;
      --comment-left-margin: 8px;
      --composer-padding: 10px 14px;
    }
    `
  }

  constructor () {
    super()
    this.url = null
    this.user = null
    this.feedAuthors = []
    this.comments = []
    this.commentCount = 0
  }

  attributeChangedCallback (name, oldval, newval) {
    super.attributeChangedCallback(name, oldval, newval)
    if (name === 'url' && this.url) {
      this.load()
    }
  }

  async load () {
    var cs = await uwg.comments.thread(this.url, {author: this.feedAuthors})
    this.commentCount = countComments(cs)
    await loadCommentReactions(this.feedAuthors, cs)
    this.comments = cs
  }

  // rendering
  // =

  render () {
    return html`
      <h5><span class="far fa-fw fa-comment-alt"></span> Comments (${this.commentCount})</h5>
      <beaker-comments-thread
        .comments=${this.comments}
        topic-url="${this.url}"
        user-url="${this.user.url}"
        composer-placeholder="Add a comment about this site"
        @add-reaction=${this.onAddReaction}
        @delete-reaction=${this.onDeleteReaction}
        @submit-comment=${this.onSubmitComment}
        @delete-comment=${this.onDeleteComment}
      >
      </beaker-comments-thread>
    `
  }

  // events
  // =

  async onAddReaction (e) {
    await uwg.reactions.add(e.detail.topic, e.detail.emoji)
  }

  async onDeleteReaction (e) {
    await uwg.reactions.remove(e.detail.topic, e.detail.emoji)
  }

  async onSubmitComment (e) {
    // add the new comment
    try {
      var {topic, replyTo, body} = e.detail
      await uwg.comments.add(topic, {replyTo, body})
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to add comment')
      console.error(e)
      return
    }

    // reload the comments
    await this.load()
  }

  async onDeleteComment (e) {
    let comment = e.detail.comment

    // delete the comment
    try {
      await uwg.comments.remove(comment.url)
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to delete comment')
      console.error(e)
      return
    }
    toast.create('Comment deleted')

    // reload the comments
    await this.load()
  }
}

customElements.define('sidebar-comments', SidebarComments)

function countComments (comments) {
  return comments.reduce((acc, comment) => acc + 1 + (comment.replies ? countComments(comment.replies) : 0), 0)
}

async function loadCommentReactions (author, comments) {
  await Promise.all(comments.map(async (comment) => {
    comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}