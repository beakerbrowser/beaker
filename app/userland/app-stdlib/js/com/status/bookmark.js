import {LitElement, html} from '../../../vendor/lit-element/lit-element.js'
import feedBookmarkCSS from '../../../css/com/feed/bookmark.css.js'
import {timeDifference} from '../../time.js'
import { toNiceDomain } from '../../strings.js'
import '../reactions/reactions.js'

export class FeedBookmark extends LitElement {
  static get properties () {
    return {
      bookmark: {type: Object},
      userUrl: {type: String, attribute: 'user-url'},
      viewProfileBaseUrl: {type: String, attribute: 'view-profile-base-url'}
    }
  }

  constructor () {
    super()
    this.bookmark = null
    this.userUrl = ''
    this.viewProfileBaseUrl = 'intent:unwalled.garden/view-profile?url='
  }

  render () {
    if (!this.bookmark) return
    var isOwner = this.userUrl === this.bookmark.author.url
    var viewProfileUrl = `${this.viewProfileBaseUrl}${encodeURIComponent(this.bookmark.author.url)}`
    return html`
      <link rel="stylesheet" href="beaker://assets/font-awesome.css">
      <div class="inner">
        <div class="content-column">
          <div class="body">
            <div class="title">
              <a class="link" href="${this.bookmark.href}">${this.bookmark.title || 'Untitled'}</a>
              <span class="domain">${toNiceDomain(this.bookmark.href)}</span>
            </div>
            ${this.bookmark.description ? html`<div class="description">${this.bookmark.description}</div>` : ''}
          </div>
          <div class="bottom-ctrls">
            <div class="">
              <a class="author" href="${viewProfileUrl}">${this.bookmark.author.title}</a>
              <a class="permalink" href="${this.bookmark.record.url}" target="_blank">${timeDifference(this.bookmark.createdAt, true, '')} ago</a>
            </div>
            <div>
              <a class="link disabled"><span class="far fa-comment"></span> Comment (0)</a>
            </div>
            <beaker-reactions .reactions=${this.bookmark.reactions} topic="${this.bookmark.record.url}" user-url="${this.userUrl}"></beaker-reactions>
          </div>
        </div>
      </div>
    `
  }
}
FeedBookmark.styles = feedBookmarkCSS

customElements.define('beaker-feed-bookmark', FeedBookmark)