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
      comments: {type: Array},
      error: {type: String}
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
    this.error = false
    this.page = 0
  }

  async load () {
    try {
      var authorProfile = this.author ? await uwg.users.getByUserID(this.author) : undefined
      var comments = await uwg.comments.list({
        author: this.author ? authorProfile.url : undefined,
        offset: this.page * PAGE_SIZE,
        limit: PAGE_SIZE,
        sort: 'name',
        reverse: true
      }, {includeProfiles: true, includeContent: true})
      this.comments = comments
      console.log(this.comments)
    } catch (e) {
      this.error = e.toString()
    }
  }

  render () {
    return html`
      <link rel="stylesheet" href="/.ui/webfonts/fontawesome.css">
      <div class="feed">
        ${this.error ? html`
          <div class="error">
            ${this.error}
          </div>
        ` : typeof this.comments === 'undefined' ? html`
          <div class="empty">
            <span class="spinner"></span>
          </div>
        ` : html`
          ${repeat(this.comments, comment => {
            var contextUrl = fromPostUrlToAppRoute(comment.stat.metadata.href)
            return html`
              <div class="comment">
                <div class="content">
                  <div class="header">
                    <a class="title" href="/users/${comment.drive.id}">${comment.drive.title}</a>
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
