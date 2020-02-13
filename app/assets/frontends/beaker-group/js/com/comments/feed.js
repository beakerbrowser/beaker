import { LitElement, html } from '../../../vendor/lit-element/lit-element.js'
import { repeat } from '../../../vendor/lit-element/lit-html/directives/repeat.js'
import * as uwg from '../../lib/uwg.js'
import { writeToClipboard } from '../../lib/clipboard.js'
import * as contextMenu from '../context-menu.js'
import * as toast from '../toast.js'
import { timeDifference } from '../../lib/time.js'
import { fromPostUrlToAppRoute } from '../../lib/strings.js'
import feedCSS from '../../../css/com/comments/feed.css.js'
import '../paginator.js'

const PAGE_SIZE = 25

export class CommentsFeed extends LitElement {
  static get properties () {
    return {
      user: {type: Object},
      author: {type: String},
      comments: {type: Array}
    }
  }

  static get styles () {
    return feedCSS
  }

  constructor () {
    super()
    this.user = undefined
    this.author = undefined
    this.comments = undefined
    this.page = 0
  }

  async load () {
    var authorProfile = this.author ? await uwg.users.getByUserID(this.author) : undefined
    var comments = await uwg.comments.list({
      author: this.author ? authorProfile.url : undefined,
      offset: this.page * PAGE_SIZE,
      limit: PAGE_SIZE,
      sort: 'name',
      reverse: true
    }, {includeProfiles: true, includeContent: true})
    /* dont await */ this.loadFeedAnnotations(comments)
    this.comments = comments
    console.log(this.comments)
  }

  async loadFeedAnnotations (comments) {
    for (let comment of comments) {
      comment.votes = await uwg.votes.tabulate(comment.url)
      this.requestUpdate()
    }
  }

  getUserVote (comment) {
    var votes = comment && comment.votes
    if (!votes || !this.user) return 0
    if (votes.upvotes.find(u => u.url === this.user.url)) return 1
    if (votes.downvotes.find(u => u.url === this.user.url)) return -1
    return 0
  }

  getKarma (comment) {
    var votes = comment && comment.votes
    if (!votes) return undefined
    return votes.upvotes.length - votes.downvotes.length
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="feed">
        ${typeof this.comments === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.comments, comment => {
            var contextUrl = fromPostUrlToAppRoute(comment.stat.metadata.href)
            var userVote = this.getUserVote(comment)
            var karma = this.getKarma(comment)
            return html`
              <div class="comment">
                <div class="votectrl">
                  <a class="upvote ${userVote === 1 ? 'selected' : ''}" @click=${e => this.onClickUpvote(e, comment)}>
                    <span class="fas fa-caret-up"></span>
                  </a>
                  <div class="karma ${userVote === 1 ? 'upvoted' : userVote === -1 ? 'downvoted' : ''}">${karma}</div>
                  <a class="downvote ${userVote === -1 ? 'selected' : ''}" @click=${e => this.onClickDownvote(e, comment)}>
                    <span class="fas fa-caret-down"></span>
                  </a>
                </div>
                <div class="content">
                  <div class="header">
                    <a class="title" href="/${comment.drive.id}">${comment.drive.title}</a>
                    <a class="permalink" href="${contextUrl}">${timeDifference(comment.stat.ctime, true, 'ago')}</a>
                    <button class="menu transparent" @click=${e => this.onClickMenu(e, comment)}><span class="fas fa-fw fa-ellipsis-h"></span></button>
                  </div>
                  <div class="body">${comment.content}</div>
                  <div class="footer">
                    <a class="view-context" href=${contextUrl}>View post</a>
                  </div>
                </div>
              </div>
            `
          })}
          ${this.comments.length === 0
            ? html`
              <div class="empty">
                <div><span class="far fa-comment"></span></div>
                <div>
                  ${this.author
                    ? 'This user has not made any comments.'
                    : 'This group has not made any comments.'}
                </div>
              </div>
            ` : ''}
          ${this.page > 0 || this.comments.length === PAGE_SIZE ? html`
            <beaker-paginator
              page=${this.page}
              label="Showing comments ${(this.page * PAGE_SIZE) + 1} - ${(this.page + 1) * PAGE_SIZE}"
              @change-page=${this.onChangePage}
            ></beaker-paginator>
          ` : ''}
        `}
      </div>
    `
  }

  // events
  // =

  async onClickUpvote (e, comment) {
    e.preventDefault()
    e.stopPropagation()
    
    var userVote = this.getUserVote(comment)
    await uwg.votes.put(comment.url, userVote === 1 ? 0 : 1)
    comment.votes = await uwg.votes.tabulate(comment.url)
    this.requestUpdate()
  }

  async onClickDownvote (e, comment) {
    e.preventDefault()
    e.stopPropagation()
    
    var userVote = this.getUserVote(comment)
    await uwg.votes.put(comment.url, userVote === -1 ? 0 : -1)
    comment.votes = await uwg.votes.tabulate(comment.url)
    this.requestUpdate()
  }

  onClickMenu (e, comment) {
    e.preventDefault()
    e.stopPropagation()

    var items = [
      {
        icon: 'fas fa-fw fa-link',
        label: 'Copy comment URL',
        click: () => {
          writeToClipboard(comment.url)
          toast.create('Copied to your clipboard')
        }
      }
    ]

    if (this.user && this.user.url === comment.drive.url) {
      items.push({icon: 'fas fa-fw fa-trash', label: 'Delete comment', click: () => this.onClickDelete(comment) })
    }

    var rect = e.currentTarget.getClientRects()[0]
    contextMenu.create({
      x: rect.left,
      y: rect.bottom + 8,
      left: true,
      roomy: true,
      noBorders: true,
      style: `padding: 4px 0`,
      items
    })
  }

  onClickDelete (comment) {
    if (!confirm('Are you sure?')) return

    // TODO
    
    this.comments = this.comments.filter(c => c.url !== comment.url)
  }

  onChangePage (e) {
    this.page = e.detail.page
    this.comments = undefined
    this.load()
  }
}

customElements.define('beaker-comments-feed', CommentsFeed)
