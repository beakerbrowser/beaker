import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { asyncReplace } from '../../vendor/lit-element/lit-html/directives/async-replace.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/record-thread.css.js'
import { emit } from '../dom.js'
import { fancyUrlAsync } from '../strings.js'
import * as toast from './toast.js'
import './record.js'
import './post-composer.js'

export class RecordThread extends LitElement {
  static get properties () {
    return {
      recordUrl: {type: String, attribute: 'record-url'},
      profileUrl: {type: String, attribute: 'profile-url'},
      isFullPage: {type: Boolean, attribute: 'full-page'},
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
    this.isFullPage = false
    this.subjectUrl = undefined
    this.subject = undefined
    this.commentCount = 0
    this.relatedItemCount = 0
    this.replies = undefined
    this.profileUrl = ''
    this.isCommenting = false
  }

  async load () {
    var record = await beaker.database.getRecord(this.recordUrl)
    this.subjectUrl = record?.metadata?.['beaker/subject'] || record?.url || this.recordUrl
    /* dont await */ this.loadSubject(record)
    /* dont await */ this.loadComments(record)
  }

  async loadSubject (record) {
    var subjectUrl = record?.metadata?.['beaker/subject']
    var subject
    if (subjectUrl) {
      let isSubjectSite = false
      try {
        let urlp = new URL(subjectUrl)
        isSubjectSite = urlp.pathname === '/' && !urlp.search
      } catch {}
      try {
        if (isSubjectSite) {
          subject = await beaker.database.getSite(subjectUrl)
          subject.isSite = true
        } else {
          subject = await beaker.database.getRecord(subjectUrl)
        }
      } catch {}
    } else {
      subject = record
    }
    if (!subject) subject = {url: subjectUrl || this.recordUrl, notFound: true}
    this.subject = subject
    await this.requestUpdate()
    emit(this, 'load')
  }

  async loadComments (record) {
    var replies = await beaker.database.listRecords({
      filter: {
        linksTo: this.subjectUrl
      },
      sort: 'ctime',
      reverse: true
    })
    this.commentCount = replies.filter(r => r.index === 'beaker/index/comments').length
    this.relatedItemCount = replies.length - this.commentCount
    this.replies = toThreadTree(replies)
    await this.requestUpdate()
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
    let urlp = new URL(this.subjectUrl)
    return ({
      'beaker/index/microblogposts': 'this post',
      'beaker/index/blogposts': 'this blogpost',
    })[this.subject?.index] || `this ${urlp.pathname === '/' ? 'site' : 'page'}`
  }

  // rendering
  // =

  render () {
    var mode = 'link'
    if (['beaker/index/comments', 'beaker/index/microblogposts'].includes(this.subject?.index)) {
      mode = 'card'
    }
    console.log(this.subject)
    return html`
      ${this.subject ? html`
        ${this.subject.isSite ? html`
          <a class="simple-link" href="${this.subject.url}">
            ${this.subject.title || asyncReplace(fancyUrlAsync(this.subject.url))}
          </a>
        ` : this.isFullPage && mode === 'link' ? html`
          <div class="subject-content">${this.renderSubjectContent()}</div>
        ` : html`
          <div class="subject ${mode}">
            ${this.subject.notFound ? html`
              <a class="simple-link" href="${this.subject.url}">
                ${asyncReplace(fancyUrlAsync(this.subject.url))}
              </a>
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
        `}
      ` : html`
        <div class="subject link">
          <a class="simple-link" href="${this.subjectUrl}">
            <span class="spinner"></span>
            ${asyncReplace(fancyUrlAsync(this.subjectUrl))}
          </a>
        </div>
      `}
      ${this.replies ? html`
        <div class="comments">
          <div class="comments-header">
            <div>
              <strong>Comments (${this.commentCount})</strong>
              and related items (${this.relatedItemCount}) from your network
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
          </div>
          ${this.renderReplies(this.replies)}
        </div>
      ` : ''}
    `
  }

  renderSubjectContent () {
    if (/\.(png|jpe?g|gif|svg|webp)$/i.test(this.subject.url)) {
      return html`<img src=${this.subject.url} title=${this.subject.url}>`
    } else if (/\.(mp4|webm|mov)$/i.test(this.subject.url)) {
      return html`<video controls><source src=${this.subject.url}></video>`
    } else if (/\.(mp3|ogg)$/i.test(this.subject.url)) {
      return html`<audio controls><source src=${this.subject.url}></audio>`
    } else if (/\.(pdf|doc|zip|docx|rar|gz|tar)$/i.test(this.subject.url)) {
      let filename = this.subject.url.split('/').pop()
      return html`
        <p>Download: <a href=${this.subject.url} download=${filename} title=${`Download ${filename}`}>${filename}</a></p>
      `
    } else {
      let self = this
      const loadFile = async function* () {
        yield ''
        let content = await beaker.hyperdrive.readFile(self.subject.url)
        if (self.subject.url.endsWith('.md')) {
          yield html`<div class="markdown">${unsafeHTML(beaker.markdown.toHTML(content))}</div>`
        } else {
          yield html`<pre>${content}</pre>`
        }
      }
      return html`
        ${asyncReplace(loadFile())}
      `
    }
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
              class=${this.recordUrl === reply.url ? 'highlight' : ''}
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