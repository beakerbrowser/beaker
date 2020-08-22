import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/record-thread.css.js'
import { emit } from '../dom.js'
import { toNiceDomain } from '../strings.js'
import * as toast from './toast.js'
import './record.js'
import './post-composer.js'

export class RecordThread extends LitElement {
  static get properties () {
    return {
      recordUrl: {type: String, attribute: 'record-url'},
      profileUrl: {type: String, attribute: 'profile-url'},
      subject: {type: Object},
      replies: {type: Array},
      isCommenting: {type: Boolean}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.recordUrl = ''
    this.subject = undefined
    this.replies = undefined
    this.profileUrl = ''
    this.isCommenting = false
  }

  async load () {
    var record = await beaker.database.getRecord(this.recordUrl)
    var subjectUrl = record?.metadata?.['beaker/subject']
    var subject
    if (subjectUrl) {
      subject = await beaker.database.getRecord(subjectUrl)
    } else {
      subject = record
    }
    if (!subject) subject = {url: subjectUrl || this.recordUrl, notFound: true}
    var replies = await beaker.database.listRecords({
      filter: {
        linksTo: subject.url
      },
      sort: 'ctime',
      reverse: true
    })
    this.subject = subject
    this.replies = toThreadTree(replies)
    await this.updateComplete
    emit(this, 'load')
  }

  updated (changedProperties) {
    if (typeof this.subject === 'undefined') {
      this.load()
    } else if (changedProperties.has('recordUrl') && changedProperties.get('recordUrl') != this.recordUrl) {
      this.load()
    }
  }

  scrollHighlightedPostIntoView () {
    try {
      this.shadowRoot.querySelector('.highlighted').scrollIntoView()
    } catch {}
  }

  get actionTarget () {
    let urlp = new URL(this.subject.url)
    return ({
      'beaker/index/microblogposts': 'this post',
      'beaker/index/blogposts': 'this blogpost',
    })[this.subject.index] || `this ${urlp.pathname === '/' ? 'site' : 'page'}`
  }

  // rendering
  // =

  render () {
    if (!this.subject) {
      return html``
    }
    var mode = 'link'
    if (['beaker/index/comments', 'beaker/index/microblogposts'].includes(this.subject.index)) {
      mode = 'card'
    }
    return html`
      <div class="subject">
        ${this.subject.notFound ? html`
          <a class="not-found" href="${this.subject.url}">${fancyUrl(this.subject.url)}</a>
        ` : html`
          <beaker-record
            .record=${this.subject}
            render-mode=${mode}
            noborders
            view-content-on-click
            profile-url=${this.profileUrl}
            @publish-reply=${this.onPublishReply}
          ></beaker-record>
        `}
      </div>
      ${this.isCommenting ? html`
        <beaker-post-composer
          subject=${this.subject.metadata?.['beaker/subject'] || this.subject.url}
          parent=${this.subject.url}
          placeholder="Write your comment"
          @publish=${this.onPublishComment}
          @cancel=${this.onCancelComment}
        ></beaker-post-composer>
      ` : html`
        <div class="comment-prompt" @click=${this.onStartComment}>
          Write your comment
        </div>
      `}
      ${this.renderReplies(this.replies)}
    `
  }

  renderReplies (replies) {
    if (!replies?.length) return ''
    return html`
      <div class="replies">
        ${repeat(replies, r => r.url, reply => {
          var mode = ({
            'beaker/index/comments': 'comment'
          })[reply.index] || 'action'
          return html`
            <beaker-record
              .record=${reply}
              render-mode=${mode}
              thread-view
              action-target=${this.actionTarget}
              profile-url=${this.profileUrl}
              @publish-reply=${this.onPublishReply}
            ></beaker-record>
            ${reply.replies?.length ? this.renderReplies(reply.replies) : ''}
          `
        })}
      </div>
    `
  }

  // events
  // =

  onStartComment (e) {
    this.isCommenting = true
  }

  onPublishComment (e) {
    toast.create('Comment published', '', 10e3)
    this.load()
    this.isCommenting = false
  }

  onCancelComment (e) {
    this.isCommenting = false
  }
  

  onPublishReply (e) {
    toast.create('Reply published', '', 10e3)
    this.load()
  }
}

customElements.define('beaker-record-thread', RecordThread)

function toThreadTree (replies) {
  var repliesByUrl = {}
  replies.forEach(reply => { repliesByUrl[reply.url] = reply })

  var rootReplies = []
  replies.forEach(reply => {
    if (reply.metadata['beaker/parent']) {
      let parent = repliesByUrl[reply.metadata['beaker/parent']]
      if (!parent) {
        reply.isMissingParent = true
        rootReplies.push(reply)
        return
      }
      if (!parent.replies) {
        parent.replies = []
        parent.replyCount = 0
      }
      parent.replies.push(reply)
    } else {
      rootReplies.push(reply)
    }
  })
  return rootReplies
}

function fancyUrl (str) {
  try {
    let url = new URL(str)
    let parts = [toNiceDomain(url.hostname)].concat(url.pathname.split('/').filter(Boolean))
    return parts.join(' › ')
  } catch (e) {
    return str
  }
}