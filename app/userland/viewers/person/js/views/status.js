import { LitElement, html } from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import statusViewCSS from '../../css/views/status.css.js'
import 'beaker://app-stdlib/js/com/status/status.js'
import 'beaker://app-stdlib/js/com/comments/thread.js'

export class StatusView extends LitElement {
  static get properties() {
    return {
      user: {type: Object}
    }
  }

  static get styles () {
    return statusViewCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.status = undefined
    this.load()
  }

  async load () {
    if (!this.user) return

    var followedUsers = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
    var feedAuthors = [this.user.url].concat(followedUsers)

    this.status = await uwg.statuses.get(window.location.toString())
    this.status.comments = await uwg.comments.thread(this.status.url, {author: feedAuthors})
    this.status.numComments = this.status.comments.length
    this.status.reactions = await uwg.reactions.tabulate(this.status.url, {author: feedAuthors})
    await loadCommentReactions(feedAuthors, this.status.comments)

    console.log('loaded', this.status)
    this.requestUpdate()
  }

  // rendering
  // =

  render () {
    if (!this.status) return html``
    return html`
      <beaker-status
        expanded
        .status=${this.status}
        user-url="${this.user.url}"
        @add-reaction=${this.onAddReaction}
        @delete-reaction=${this.onDeleteReaction}
      ></beaker-status>
      <beaker-comments-thread
        .comments=${this.status.comments}
        topic-url="${this.status.url}"
        user-url="${this.user.url}"
        @add-reaction=${this.onAddReaction}
        @delete-reaction=${this.onDeleteReaction}
        @submit-comment=${this.onSubmitComment}
        @delete-comment=${this.onDeleteComment}
      ></beaker-comments-thread>
    `
  }

  // events
  // =

  async onAddReaction (e) {
    await uwg.reactions.add(e.detail.topic, e.detail.phrase)
  }

  async onDeleteReaction (e) {
    await uwg.reactions.remove(e.detail.topic, e.detail.phrase)
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
    this.load()
  }

  async onDeleteComment (e) {
    let comment = e.detail.comment
    
    // delete the comment
    try {
      await uwg.statuses.remove(comment.url)
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

customElements.define('status-view', StatusView)

async function loadCommentReactions (author, comments) {
  await Promise.all(comments.map(async (comment) => {
    comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    comment.reactions.sort((a, b) => b.authors.length - a.authors.length)
    if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}