import { LitElement, html, css } from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import * as toast from '../../../app-stdlib/js/com/toast.js'
import { comments, annotations } from '../../../app-stdlib/js/uwg.js'
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
    var cs = await comments.thread(this.url)
    this.commentCount = countComments(cs)
    await loadCommentAnnotations(this.feedAuthors, cs)
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
        @add-tag=${this.onAddTag}
        @delete-tag=${this.onDeleteTag}
        @submit-comment=${this.onSubmitComment}
        @delete-comment=${this.onDeleteComment}
      >
      </beaker-comments-thread>
    `
  }

  // events
  // =

  async onAddTag (e) {
    var record = (await annotations.get(e.detail.href)) || {}
    record.tags = record.tags || []
    if (!record.tags.includes(e.detail.tag)) {
      record.tags.push(e.detail.tag)
    }
    await annotations.put(e.detail.href, record)
  }

  async onDeleteTag (e) {
    var record = (await annotations.get(e.detail.href)) || {}
    record.tags = (record.tags || []).filter(t => t !== e.detail.tag)
    await annotations.put(e.detail.href, record)
  }

  async onSubmitComment (e) {
    // add the new comment
    try {
      await comments.add(e.detail)
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
      await comments.remove(comment.path)
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

async function loadCommentAnnotations (author, comments) {
  await Promise.all(comments.map(async (comment) => {
    comment.annotations = await annotations.tabulate(comment.url)
    if (comment.replies) await loadCommentAnnotations(author, comment.replies)
  }))
}