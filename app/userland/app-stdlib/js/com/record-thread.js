import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { asyncReplace } from '../../vendor/lit-element/lit-html/directives/async-replace.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { repeat } from '../../vendor/lit-element/lit-html/directives/repeat.js'
import css from '../../css/com/record-thread.css.js'
import { emit } from '../dom.js'
import { fancyUrlAsync } from '../strings.js'
import * as toast from './toast.js'
import { getRecordType } from '../records.js'
import './record.js'
import './post-composer.js'

export class RecordThread extends LitElement {
  static get properties () {
    return {
      recordUrl: {type: String, attribute: 'record-url'},
      profileUrl: {type: String, attribute: 'profile-url'},
      isFullPage: {type: Boolean, attribute: 'full-page'},
      setDocumentTitle: {type: Boolean, attribute: 'set-document-title'},
      subject: {type: Object},
      replies: {type: Array},
      networkReplies: {type: Array},
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
    this.setDocumentTitle = false
    this.subjectUrl = undefined
    this.subject = undefined
    this.commentCount = 0
    this.relatedItemCount = 0
    this.replies = undefined
    this.networkReplies = undefined
    this.profileUrl = ''
    this.isCommenting = false
    this.isLoading = false
  }

  reset () {
    this.subject = undefined
    this.commentCount = 0
    this.relatedItemCount = 0
    this.replies = undefined
    this.networkReplies = undefined
  }

  async fetchRecordOrSite (url) {
    var v
    var isSite = false
    try {
      let urlp = new URL(url)
      isSite = urlp.pathname === '/' && !urlp.search
    } catch {}
    try {
      if (isSite) {
        let {site} = await beaker.index.gql(`
          site(url: "${url}") {
            url
            title
            description
            writable
          }
        `)
        v = site
        v.isSite = true
      } else {
        let {record} = await beaker.index.gql(`
          record (url: "${url}") {
            type
            path
            url
            ctime
            mtime
            rtime
            metadata
            index
            content
            site {
              url
              title
            }
            votes: backlinks(paths: ["/votes/*.goto"]) {
              url
              metadata
              site { url title }
            }
            commentCount: backlinkCount(paths: ["/comments/*.md"])
          }
        `)
        v = record
      }
    } catch {}
    return v
  }

  async load () {
    this.isLoading = true
    this.reset()
    var record = await this.fetchRecordOrSite(this.recordUrl)
    this.subjectUrl = record?.metadata?.['comment/subject'] || record?.url || this.recordUrl
    /* dont await */ this.loadSubject(record)
    /* dont await */ this.loadComments(record)
    this.isLoading = false
  }

  async loadSubject (record) {
    var subjectUrl = record?.metadata?.['comment/subject']
    var subject
    if (subjectUrl) {
      subject = await this.fetchRecordOrSite(subjectUrl)
    } else {
      subject = record
    }
    if (!subject) subject = {url: subjectUrl || this.recordUrl, notFound: true}
    this.subject = subject
    if (this.setDocumentTitle && this.subject.metadata.title) {
      document.title = this.subject.metadata.title
    }
    await this.requestUpdate()
    emit(this, 'load')
  }

  async loadComments (record) {
    // local first
    let {replies} = await beaker.index.gql(`
      replies: records (
        links: {url: "${stripUrlHash(this.subjectUrl)}"}
        indexes: ["local"]
        sort: crtime,
        reverse: true
      ) {
        type
        path
        url
        ctime
        mtime
        rtime
        metadata
        index
        content
        site {
          url
          title
        }
        votes: backlinks(paths: ["/votes/*.goto"]) {
          url
          metadata
          site { url title }
        }
        commentCount: backlinkCount(paths: ["/comments/*.md"])
      }
    `)
    this.commentCount = replies.filter(r => getRecordType(r) === 'comment').length
    this.relatedItemCount = replies.length - this.commentCount
    this.replies = toThreadTree(replies)
    await this.requestUpdate()
    this.scrollHighlightedPostIntoView()
    emit(this, 'load')

    // then try network
    var {networkReplies} = await beaker.index.gql(`
      networkReplies: records (
        links: {url: "${stripUrlHash(this.subjectUrl)}"}
        indexes: ["network"]
        sort: crtime,
        reverse: true
      ) {
        type
        path
        url
        ctime
        mtime
        rtime
        metadata
        index
        content
        site {
          url
          title
        }
        votes: backlinks(paths: ["/votes/*.goto"]) {
          url
          metadata
          site { url title }
        }
        commentCount: backlinkCount(paths: ["/comments/*.md"])
      }
    `)
    networkReplies = networkReplies.filter(reply => 
      !reply.path.startsWith('/votes/') // filter out votes
      && !replies.find(reply2 => reply.url === reply2.url) // filter out in-network items
    )
    this.networkReplies = toThreadTree(networkReplies)
    await this.requestUpdate()
    emit(this, 'load')
  }

  updated (changedProperties) {
    if (typeof this.subject === 'undefined' && !this.isLoading) {
      this.load()
    } else if (changedProperties.has('recordUrl') && changedProperties.get('recordUrl') != this.recordUrl) {
      this.load()
    }
  }

  scrollHighlightedPostIntoView () {
    try {
      this.shadowRoot.querySelector('.highlight').scrollIntoView()
    } catch {}
  }

  get actionTarget () {
    let urlp = new URL(this.subjectUrl)
    if (this.subject) {
      let desc = ({
        'microblogpost': 'this post',
        'blogpost': 'this blogpost',
      })[getRecordType(this.subject)]
      if (desc) return desc
    }
    return `this ${urlp.pathname === '/' ? 'site' : 'page'}`
  }

  // rendering
  // =

  render () {
    var mode = 'link'
    if (this.subject && ['comment', 'microblogpost'].includes(getRecordType(this.subject))) {
      mode = 'card'
    }
    return html`
      ${this.subject ? html`
        ${this.subject.isSite ? html`
          <div class="subject link">
            <a class="simple-link" href="${this.subject.url}">
              ${this.subject.title || asyncReplace(fancyUrlAsync(this.subject.url))}
            </a>
          </div>
        ` : this.isFullPage && mode === 'link' && this.subject.url.startsWith('hyper') ? html`
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
                subject=${this.subject.metadata?.['comment/subject'] || this.subject.url}
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
          <div class="extended-comments-header">
            <div class="label">
              My Network
            </div>
          </div>
          ${this.renderReplies(this.replies)}
        </div>
      ` : ''}
      ${!this.networkReplies || this.networkReplies.length ? html`
        <div class="comments">
          <div class="extended-comments-header">
            <div class="label">
              Extended Network
            </div>
          </div>
          ${this.networkReplies ? this.renderReplies(this.networkReplies) : html`<div class="comments-loading"><span class="spinner"></span></div>`}
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
        yield html`<div class="loading"><span class="spinner"></span> Loading...</div>`
        try {
          let content = await beaker.hyperdrive.readFile(self.subject.url)
          if (self.subject.url.endsWith('.md')) {
            yield html`<div class="markdown">${unsafeHTML(beaker.markdown.toHTML(content))}</div>`
          } else {
            yield html`<pre>${content}</pre>`
          }
        } catch (e) {
          if (e.message.includes('NotFoundError')) {
            yield html`
              <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
              <div class="error">
                <h2>File not found</h2>
                <div>There is no file or folder at this URL. <span class="far fa-frown"></span></div>
              </div>
            `
          } else {
            yield html`
              <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
              <div class="error">
                <h2>Uhoh!</h2>
                <p>This file wasn't able to load. <span class="far fa-frown"></span></p>
                <p>Possible causes:</p>
                <ul>
                  <li>Nobody hosting the file is online.</li>
                  <li>Connections to online peers failed.</li>
                  <li>Your Internet is down.</li>
                </ul>
                <details>
                  <summary>Error Details</summary>
                  ${e.toString()}
                </details>
              </div>
            `
          }
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
          var mode = 'action'
          if (reply.content && ['comment', 'microblogpost'].includes(getRecordType(reply))) {
            mode = 'comment'
          }
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
    if (reply.metadata['comment/parent']) {
      let parent = repliesByUrl[reply.metadata['comment/parent']]
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

function stripUrlHash (url) {
  try {
    let i = url.indexOf('#')
    if (i !== -1) return url.slice(0, i)
    return url
  } catch (e) {
    return url
  }
}