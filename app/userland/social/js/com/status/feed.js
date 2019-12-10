import { LitElement, html, css } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
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

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.followedUsers = []
    this.statuses = undefined
    this.poppedUpStatus = undefined
  }

  async load () {
    var statuses = await uwg.feed.list({
      author: this.author ? this.author : undefined,
      limit: LOAD_LIMIT,
      sort: 'ctime',
      reverse: true
    })
    statuses = statuses.filter(status => status.content)
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
      status.numComments = await uwg.comments.count({href: status.url})
    }))
  }

  async loadStatusComments (status) {
    status.comments = await uwg.comments.thread(status.url)
    await loadCommentReactions(status.comments)
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
      <link rel="stylesheet" href="/webfonts/fontawesome.css">
      <div class="feed">
        ${!this.author ? html`
          <beaker-status-composer
            @submit=${this.onSubmitStatus}
          ></beaker-status-composer>
        ` : ''}
        ${typeof this.statuses === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.statuses, status => html`
            <beaker-status
              expandable
              .status=${status}
              user-url="${this.user.url}"
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
                    : 'This is your feed. It will show statuses from users you follow.'}
                </div>
              </div>
            ` : ''}
        `}
      </div>
      <div class="popup-container"
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

  async onSubmitStatus (e) {
    // add the new status
    try {
      await uwg.feed.add(e.detail.body)
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
      await uwg.feed.remove(status.path)
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
      var {href, replyTo, body} = e.detail
      await uwg.comments.add({href, replyTo, body})
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
      await uwg.comments.remove(comment.path)
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

async function loadCommentReactions (comments) {
  await Promise.all(comments.map(async (comment) => {
    // comment.reactions = await uwg.reactions.tabulate(comment.url, {author})
    // comment.reactions.sort((a, b) => b.authors.length - a.authors.length)
    // if (comment.replies) await loadCommentReactions(author, comment.replies)
  }))
}