import { LitElement, html, css } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as toast from '../toast.js'
import feedCSS from '../../../css/com/status/feed.css.js'
import './status.js'
import './composer.js'
import { ViewStatusPopup } from '../popups/view-status.js'

const LOAD_LIMIT = 50

export class StatusFeed extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      statuses: {type: Array}
    }
  }

  static get styles () {
    return feedCSS
  }

  get feedAuthors () {
    if (!this.user) return []
    return [this.user.url].concat(this.followedUsers)
  }

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.followedUsers = []
    this.statuses = []
    this.poppedUpStatus = undefined
  }

  async load () {
    this.followedUsers = (await uwg.follows.list({author: this.user.url})).map(({topic}) => topic.url)
    var statuses = await uwg.statuses.list({
      author: this.author ? this.author : this.feedAuthors,
      limit: LOAD_LIMIT,
      reverse: true
    })
    statuses = statuses.filter(status => status.body)
    await this.loadFeedAnnotations(statuses)
    this.statuses = statuses
    console.log(this.statuses)
  }

  async refreshFeed () {
    var statuses = this.statuses.slice()
    await this.loadFeedAnnotations(statuses)
    this.statuses = [] // HACK - should find the right way to get litelement to rerender -prf
    await this.requestUpdate()
    this.statuses = statuses
  }

  async loadFeedAnnotations (statuses) {
    await Promise.all(statuses.map(async (status) => {
      var [c, r] = await Promise.all([
        uwg.comments.list({topic: status.url, author: this.feedAuthors}),
        uwg.reactions.tabulate(status.url, {author: this.feedAuthors})
      ])
      status.numComments = c.length
      status.reactions = r
    }))
  }

  async loadStatusComments (status) {
    status.comments = await uwg.comments.thread(status.url, {author: this.feedAuthors})
    await loadCommentReactions(this.feedAuthors, status.comments)
    console.log('loaded', status.comments)
  }

  async updatePopup () {
    if (this.poppedUpStatus) {
      await this.loadStatusComments(this.poppedUpStatus)
      this.shadowRoot.querySelector('beaker-view-status-popup').requestUpdate()
    }
  }

  render () {
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="feed">
        ${!this.author ? html`
          <beaker-status-composer
            @submit=${this.onSubmitStatus}
          ></beaker-status-composer>
        ` : ''}
        ${repeat(this.statuses, status => html`
          <beaker-status
            expandable
            .status=${status}
            user-url="${this.user.url}"
            @add-reaction=${this.onAddReaction}
            @delete-reaction=${this.onDeleteReaction}
            @expand=${this.onExpandStatus}
            @delete=${this.onDeleteStatus}
          ></beaker-status>
        `)}
        ${this.statuses.length === 0
          ? html`
            <div class="empty">
              <div><span class="fas fa-image"></span></div>
              <div>
                ${this.author
                  ? 'This user has not posted anything.'
                  : 'This is your feed. It will show statuses from sites you follow.'}
              </div>
            </div>
          ` : ''}
      </div>
      <div class="popup-container"
        @add-reaction=${this.onAddReaction}
        @delete-reaction=${this.onDeleteReaction}
        @submit-comment=${this.onSubmitComment}
        @delete-comment=${this.onDeleteComment}
      ></div>
    `
  }

  // events
  // =

  async onExpandStatus (e) {
    this.poppedUpStatus = e.detail.status
    await this.loadStatusComments(this.poppedUpStatus)
    try {
      await ViewStatusPopup.create(this.shadowRoot.querySelector('.popup-container'), {user: this.user, status: this.poppedUpStatus})
    } catch (e) { /* ignore */ }
    this.poppedUpStatus = null
    this.refreshFeed()
  }

  async onAddReaction (e) {
    await uwg.reactions.add(e.detail.topic, e.detail.phrase)
  }

  async onDeleteReaction (e) {
    await uwg.reactions.remove(e.detail.topic, e.detail.phrase)
  }

  async onSubmitStatus (e) {
    // add the new status
    try {
      await uwg.statuses.add({body: e.detail.body})
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to add status')
      console.error(e)
      return
    }

    // reload the feed to show the new status
    this.load()
  }

  async onDeleteStatus (e) {
    let status = e.detail.status

    // delete the status
    try {
      await uwg.statuses.remove(status.url)
    } catch (e) {
      alert('Something went wrong. Please let the Beaker team know! (An error is logged in the console.)')
      console.error('Failed to delete status')
      console.error(e)
      return
    }
    toast.create('Status deleted')

    // remove from the feed
    this.statuses = this.statuses.filter(s => s.url !== status.url)
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
    this.updatePopup()
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
    this.updatePopup()
  }
}

customElements.define('beaker-status-feed', StatusFeed)

async function loadCommentReactions (author, comments) {
  await Promise.all(comments.map(async (comment) => {
    comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    comment.reactions.sort((a, b) => b.authors.length - a.authors.length)
    if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}