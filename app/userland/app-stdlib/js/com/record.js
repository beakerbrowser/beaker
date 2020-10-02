import { LitElement, html } from '../../vendor/lit-element/lit-element.js'
import { classMap } from '../../vendor/lit-element/lit-html/directives/class-map.js'
import { unsafeHTML } from '../../vendor/lit-element/lit-html/directives/unsafe-html.js'
import { asyncReplace } from '../../vendor/lit-element/lit-html/directives/async-replace.js'
import { SitesListPopup } from './popups/sites-list.js'
import css from '../../css/com/record.css.js'
import { removeMarkdown } from '../../vendor/remove-markdown.js'
import { shorten, makeSafe, toNiceDomain, pluralize, fancyUrlAsync, isSameOrigin } from '../strings.js'
import { getRecordType, getPreferredRenderMode } from '../records.js'
import { emit } from '../dom.js'
import './post-composer.js'

export class Record extends LitElement {
  static get properties () {
    return {
      record: {type: Object},
      loadRecordUrl: {type: String, attribute: 'record-url'},
      renderMode: {type: String, attribute: 'render-mode'},
      isNotification: {type: Boolean, attribute: 'is-notification'},
      isUnread: {type: Boolean, attribute: 'is-unread'},
      searchTerms: {type: String, attribute: 'search-terms'},
      showContext: {type: Boolean, attribute: 'show-context'},
      constrainHeight: {type: Boolean, attribute: 'constrain-height'},
      profileUrl: {type: String, attribute: 'profile-url'},
      actionTarget: {type: String, attribute: 'action-target'},
      isReplyOpen: {type: Boolean},
      viewContentOnClick: {type: Boolean, attribute: 'view-content-on-click'},
      showReadMore: {type: Boolean}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.record = undefined
    this.loadRecordUrl = undefined
    this.renderMode = undefined
    this.isNotification = false
    this.isUnread = false
    this.searchTerms = undefined
    this.showContext = false
    this.constrainHeight = false
    this.profileUrl = undefined
    this.actionTarget = undefined
    this.isReplyOpen = false
    this.viewContentOnClick = false
    this.showReadMore = false

    // helper state
    this.hasLoadedSignals = false
    this.hasCheckedOverflow = false
    this.isMouseDown = false
    this.isMouseDragging = false
  }

  updated (changedProperties) {
    let markdownEl = this.shadowRoot.querySelector('.markdown')
    if (markdownEl) {
      this.attachImageLoaders(markdownEl)
    }

    if (this.record && this.constrainHeight && !this.hasCheckedOverflow && document.visibilityState === 'visible') {
      this.hasCheckedOverflow = true
      this.whenContentLoaded().then(r => {
        if (this.isContentOverflowing) {
          this.showReadMore = true
        }
      })
    }
    if ((!this.record && this.loadRecordUrl) || changedProperties.has('loadRecordUrl') && changedProperties.get('loadRecordUrl') != this.recordUrl) {
      this.load()
    }
  }

  async load () {
    let {record} = await beaker.index.gql(`
      record (url: "${this.loadRecordUrl}") {
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
    this.record = record
    if (!this.renderMode) {
      this.renderMode = getPreferredRenderMode(this.record)
      this.setAttribute('render-mode', this.renderMode)
    }
  }

  async reloadSignals () {
    let {votes, commentCount} = await beaker.index.gql(`
      votes: records(paths: ["/votes/*.goto"] links: {url: "${this.record.url}"}) {
        url
        metadata
        site { url title }
      }
      commentCount: recordCount(paths: ["/comments/*.md"] links: {url: "${this.record.url}"})
    `)
    this.record.votes = votes
    this.record.commentCount = commentCount
    this.requestUpdate()
  }

  get myVote () {
    return this.record?.votes.find(v => isSameOrigin(v.site.url, this.profileUrl) || isSameOrigin(v.site.url, 'hyper://private'))
  }

  get upvoteCount () {
    return (new Set(this.record?.votes.filter(v => v.metadata['vote/value'] == 1).map(v => v.site.url))).size
  }

  get downvoteCount () {
    return (new Set(this.record?.votes.filter(v => v.metadata['vote/value'] == -1).map(v => v.site.url))).size    
  }

  async whenContentLoaded () {
    let images = Array.from(this.shadowRoot.querySelectorAll('.content img'))
    images = images.filter(el => !el.complete)
    while (images.length) {
      await new Promise(r => setTimeout(r, 10))
      images = images.filter(el => !el.complete)
    }
  }

  get isContentOverflowing () {
    try {
      let content = this.shadowRoot.querySelector('.content')
      if (this.renderMode === 'card') {
        return content.clientHeight >= 50 || content.scrollHeight >= 50
      }
      if (this.renderMode === 'comment') {
        return content.clientHeight >= 50 || content.scrollHeight >= 50
      }
    } catch {}
    return false
  }

  attachImageLoaders (el) {
    for (let img of Array.from(el.querySelectorAll('img'))) {
      if (!img.complete) {
        img.classList.add('image-loading')
        img.addEventListener('load', e => img.classList.remove('image-loading'))
        img.addEventListener('error', e => img.classList.remove('image-loading'))
      }
    }
  }

  // rendering
  // =

  render () {
    if (!this.record) {
      if (this.loadRecordUrl) {
        return html`
          <a class="unknown-link" href=${this.loadRecordUrl}>
            ${asyncReplace(fancyUrlAsync(this.loadRecordUrl))}
          </a>
        `
      }
      return html``
    }
    switch (this.renderMode) {
      case 'card': return this.renderAsCard()
      case 'comment': return this.renderAsComment()
      case 'action': return this.renderAsAction()
      case 'expanded-link': return this.renderAsExpandedLink()
      case 'wrapper': return this.renderResultAsWrapper()
      case 'link':
      default:
        return this.renderResultAsLink()
    }
  }

  renderAsCard () {
    const res = this.record
    const rtype = getRecordType(res)

    var context = undefined
    switch (rtype) {
      case 'comment':
        context = res.metadata['comment/parent'] || res.metadata['comment/subject']
        break
    }

    var shouldShowContent = ['comment', 'microblogpost'].includes(rtype)
    if (shouldShowContent && !res.content) {
      return html`
        <a class="unknown-link" href=${res.url}>
          ${asyncReplace(fancyUrlAsync(res.url))}
        </a>
      `
    }

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.isNotification ? this.renderNotification() : ''}
      ${this.showContext && context ? html`
        <div class="card-context">
          <beaker-record
            record-url=${context}
            constrain-height
            noborders
            nothumb
            as-context
            profile-url=${this.profileUrl}
          ></beaker-record>
        </div>
      ` : ''}
      <div
        class=${classMap({
          record: true,
          card: true,
          'private': res.url.startsWith('hyper://private'),
          'constrain-height': this.constrainHeight,
          'is-notification': this.isNotification,
          unread: this.isUnread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          ${res.url.startsWith('hyper://private') ? html`
            <span class="sysicon fas fa-lock"></span>
          ` : html`
            <img class="favicon" src="asset:thumb:${res.site.url}">
          `}
        </a>
        <span class="arrow"></span>
        <div
          class="container"
          @mousedown=${this.onMousedownCard}
          @mouseup=${this.onMouseupCard}
          @mousemove=${this.onMousemoveCard}
        >
          <div class="header">
            <div class="origin">
              ${res.url.startsWith('hyper://private/') ? html`
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  Private
                  ${getRecordType(res)}
                </a>
              ` : html`
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  ${res.site.title}
                </a>
              `}
            </div>
            <span>&middot;</span>
            <div class="date">
              <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
                ${relativeDate(res.ctime)}
              </a>
            </div>
          </div>
          <div class="content markdown">
            ${res.content ? (this.renderMatchText('content') || unsafeHTML(beaker.markdown.toHTML(res.content))) : ''}
          </div>
          ${this.showReadMore ? html`
            <div class="read-more">
              <a @click=${this.onClickReadMore}>Read more <span class="fas fa-angle-down"></span></a>
            </div>
          ` : ''}
          <div class="ctrls">
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
        </div>
      </div>
    `
  }

  renderAsComment () {
    const res = this.record

    var context = undefined
    switch (getRecordType(res)) {
      case 'comment':
        context = res.metadata['comment/subject'] || res.metadata['comment/parent']
        break
    }

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.isNotification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          record: true,
          comment: true,
          'private': res.url.startsWith('hyper://private'),
          'constrain-height': this.constrainHeight,
          'is-notification': this.isNotification,
          unread: this.isUnread
        })}
      >
        <div class="header">
          <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
            <img class="favicon" src="asset:thumb:${res.site.url}">
          </a>
          <div class="origin">
            ${res.url.startsWith('hyper://private/') ? html`
              <a class="author" href=${res.site.url} title=${res.site.title}>Private comment</a>
            ` : html`
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.title}
              </a>
            `}
          </div>
          ${this.actionTarget ? html`
            <span class="action">mentioned ${this.actionTarget}</span>
          ` : ''}
          <div class="date">
            <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
              ${relativeDate(res.ctime)}
            </a>
          </div>
          ${this.showContext && context ? html`
            <span>&middot;</span>
            <div class="context">
              <a href=${context}>
                ${asyncReplace(fancyUrlAsync(context))}
              </a>
            </div>
          ` : ''}
        </div>
        <div class="content markdown">
          ${this.renderMatchText('content') || unsafeHTML(beaker.markdown.toHTML(res.content))}
        </div>
        ${this.showReadMore ? html`
          <div class="read-more">
            <a @click=${this.onClickReadMore}>Read more <span class="fas fa-angle-down"></span></a>
          </div>
        ` : ''}
        <div class="ctrls">
          ${this.renderVoteCtrl()}
          <a @click=${this.onClickReply}><span class="fas fa-fw fa-reply"></span> <small>Reply</small></a>
        </div>
        ${this.isReplyOpen ? html`
          <beaker-post-composer
            subject=${this.record.metadata['comment/subject'] || this.record.url}
            parent=${this.record.url}
            placeholder="Write your comment"
            @publish=${this.onPublishReply}
            @cancel=${this.onCancelReply}
          ></beaker-post-composer>
        ` : ''}
      </div>
    `
  }

  renderAsAction () {
    const res = this.record
    const rtype = getRecordType(res)
   
    var subject
    if (['subscription', 'vote'].includes(rtype)) {
      subject = isSameOrigin(res.metadata.href, this.profileUrl) ? 'you' : fancyUrlAsync(res.metadata.href)
    } else {
      if (!res.path.endsWith('.goto') && res.metadata.title) subject = res.metadata.title
      else if (res.content) subject = shorten(removeMarkdown(res.content), 150)
      else if (rtype !== 'unknown') subject = `a ${rtype}`
      else subject = fancyUrlAsync(res.url)
    }
    var showContentAfter = res.content && ['microblogpost', 'comment'].includes(rtype)

    return html`
      <div
        class=${classMap({
          record: true,
          action: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': this.isNotification,
          unread: this.isUnread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          <img class="favicon" src="asset:thumb:${res.site.url}">
        </a>
        <div>
          <a class="author" href=${res.site.url} title=${res.site.title}>
            ${res.site.url === 'hyper://private' ? 'I privately' : res.site.title}
          </a>
          ${rtype === 'subscription' ? html`
            <span class="action">subscribed to</span>
            <a class="subject" href=${res.metadata.href}>${typeof subject === 'string' ? subject : asyncReplace(subject)}</a>
          ` : this.actionTarget ? html`
            ${rtype === 'vote' ? html`
              <span class="action">${res.metadata['vote/value'] == -1 ? 'downvoted' : 'upvoted'}</span>
              <a class="subject" href=${res.metadata.href}>${this.actionTarget}</a>
            ` : rtype === 'bookmark' ? html`
              <span class="action">bookmarked ${this.actionTarget}</span>
            ` : rtype === 'comment' ? html`
              <span class="action">commented on ${this.actionTarget}</span>
            ` : showContentAfter ? html`
              <span class="action">mentioned ${this.actionTarget}</span>
            ` : html`
              <span class="action">mentioned ${this.actionTarget} in</span>
              <a class="subject" href=${res.url}>${typeof subject === 'string' ? subject : asyncReplace(subject)}</a>
            `}
          ` : html`
            ${rtype === 'vote' ? html`
              <span class="action">${res.metadata['vote/value'] == -1 ? 'downvoted' : 'upvoted'}</span>
              <a class="subject" href=${res.metadata.href}>${subject}</a>
            ` : rtype === 'bookmark' ? html`
              <span class="action">bookmarked <a href=${res.metadata.href} target="_blank">${res.metadata.title || res.metadata.href}</a></span>
            ` : rtype === 'blogpost' ? html`
              <span class="action">published <a href=${res.url} target="_blank">${res.metadata.title || res.path}</a></span>
            ` : ''}
          `}
          ${res.mergedItems ? html`
            <span>and</span>
            <a
              class="others"
              href="#"
              data-tooltip=${shorten(res.mergedItems.map(r => r.metadata.title || 'Untitled').join(', '), 100)}
              @click=${e => this.onClickShowSites(e, res.mergedItems)}
            >${res.mergedItems.length} other ${pluralize(res.mergedItems.length, 'site')}</a>
          ` : ''}
          <a class="date" href=${res.url}>${relativeDate(res.ctime)}</a>
        </div>
      </div>
      ${showContentAfter ? html`
        <div class="action-content">
          <a href=${res.url} title=${subject}>${subject}</a>
        </div>
      ` : ''}
    `
  }

  renderAsExpandedLink () {
    const res = this.record

    var title = res.metadata.title || res.url.split('/').pop()
    var content = res.content
    var isBookmark = false
    var href = undefined
    var recordType = getRecordType(res)
    switch (recordType) {
      case 'bookmark':
        isBookmark = true
        href = res.metadata.href
        break
      case 'comment':
      case 'microblogpost':
        title = removeMarkdown(removeFirstMdHeader(res.content))
        break
    }
    href = href || res.url

    return html`
    <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div class="record expanded-link ${res.url.startsWith('hyper://private') ? 'private' : ''}">
        <a class="thumb" href=${href} title=${res.site.title}>
          ${this.renderThumb(res)}
        </a>
        <div class="info">
          <div class="title"><a href=${href}>${this.renderMatchText('title') || shorten(title, 150)}</a></div>
          <div class="origin">
            ${isBookmark ? html`
              <span class="origin-note"><span class="far fa-fw fa-star"></span> Bookmarked by</span>
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.url === 'hyper://private/' ? 'Me (Private)' : res.site.title}
              </a>
            ` : (
              res.site.url === 'hyper://private/' ? html`
                <span class="sysicon fas fa-fw fa-lock"></span>
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  Me (Private)
                </a>
              ` : html`
                <img class="favicon" src="asset:thumb:${res.site.url}">
                <a class="author" href=${res.site.url} title=${res.site.title}>
                  ${res.site.title}
                </a>
              `)
            }
            <span>|</span>
            ${recordType === 'bookmark' ? html`<span class="type"><span class="far fa-star"></span> Bookmark</span>` : ''}
            ${recordType === 'page' ? html`<span class="type"><span class="far fa-file"></span> Page</span>` : ''}
            ${recordType === 'blogpost' ? html`<span class="type"><span class="fas fa-blog"></span> Blogpost</span>` : ''}
            ${recordType === 'comment' ? html`<span class="type"><span class="far fa-comments"></span> Comment</span>` : ''}
            ${recordType === 'microblogpost' ? html`<span class="type"><span class="far fa-comment-alt"></span> Post</span>` : ''}
            <span>|</span>
            <a class="date" href=${href}>${niceDate(res.ctime)}</a>
            <span>|</span>
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
          ${content ? html`
            <div class="excerpt">
              ${this.renderMatchText('content') || shorten(removeMarkdown(removeFirstMdHeader(content)), 300)}
            </div>
          ` : ''}
        </div>
      </a>
    `
  }

  renderResultAsLink () {
    const res = this.record
    var recordType = getRecordType(res)

    var href = undefined
    switch (recordType) {
      case 'comment': href = res.metadata['comment/subject']; break
      case 'bookmark': href = res.metadata.href; break
    }
    href = href || res.url

    var hrefp
    if (recordType === 'bookmark' && href) {
      try {
        hrefp = new URL(href)
      } catch {}
    }

    var title = res.metadata['title'] || ({
      'bookmark': niceDate(res.ctime),
      'blogpost': niceDate(res.ctime),
      'microblogpost': niceDate(res.ctime),
      'page': niceDate(res.ctime),
      'comment': niceDate(res.ctime)
    })[recordType] || res.url.split('/').pop() || niceDate(res.ctime)

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      ${this.isNotification ? this.renderNotification() : ''}
      <div
        class=${classMap({
          record: true,
          link: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': this.isNotification,
          unread: this.isUnread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          ${res.url.startsWith('hyper://private') ? html`
            <span class="sysicon fas fa-lock"></span>
          ` : html`
            <img class="favicon" src="asset:thumb:${res.site.url}">
          `}
        </a>
        <div class="container">
          <div class="title">
            <a class="link-title" href=${href}>${shorten(title, 500)}</a>
            ${hrefp ? html`
              <a class="link-origin" href=${hrefp.origin}>${toNiceDomain(hrefp.hostname)}</a>
            ` : ''}
          </div>
          <div class="ctrls">
            ${recordType === 'bookmark' ? html`<span class="far fa-star"></span>` : ''}
            ${recordType === 'page' ? html`<span class="far fa-file"></span>` : ''}
            ${recordType === 'blogpost' ? html`<span class="fas fa-blog"></span>` : ''}
            by
            <span class="origin">
              <a class="author" href=${res.site.url} title=${res.site.title}>
                ${res.site.url === 'hyper://private' ? 'Me (Private)' : res.site.title}
              </a>
            </span>
            <span class="date">
              <a href=${res.url} data-tooltip=${(new Date(res.ctime)).toLocaleString()}>
                ${relativeDate(res.ctime)}
              </a>
            </span>
            ${this.renderVoteCtrl()}
            ${this.renderCommentsCtrl()}
          </div>
        </div>
      </div>
    `
  }

  renderResultAsWrapper () {
    const res = this.record
    var recordType = getRecordType(res)

    return html`
      <link rel="stylesheet" href="beaker://app-stdlib/css/fontawesome.css">
      <div
        class=${classMap({
          record: true,
          wrapper: true,
          'private': res.url.startsWith('hyper://private'),
          'is-notification': this.isNotification,
          unread: this.isUnread
        })}
      >
        <a class="thumb" href=${res.site.url} title=${res.site.title} data-tooltip=${res.site.title}>
          ${res.url.startsWith('hyper://private') ? html`
            <span class="sysicon fas fa-lock"></span>
          ` : html`
            <img class="favicon" src="asset:thumb:${res.site.url}">
          `}
        </a>
        <div class="container">
          ${this.isNotification ? this.renderNotification() : ''}
          <a class="subject" href=${res.metadata.href} @click=${this.onViewWrapperThread}>
            ${asyncReplace(loadAndSimpleRender(res.metadata.href))}
          </a>
        </div>
      </div>
    `
  }

  renderThumb (url = undefined) {
    url = url || this.record.url
    if (url && /\.(png|jpe?g|gif)$/.test(url)) {
      return html`<img src=${url}>`
    }
    var icon = 'far fa-file-alt'
    switch (getRecordType(this.record)) {
      case 'blogpost': icon = 'fas fa-blog'; break
      case 'page': icon = 'far fa-file-alt'; break
      case 'bookmark': icon = 'fas fa-star'; break
      case 'microblogpost': icon = 'fas fa-stream'; break
      case 'comment': icon = 'far fa-comment'; break
    }
    return html`
      <span class="icon">
        <span class="fa-fw ${icon}"></span>
      </span>
    `
  }

  renderVoteCtrl () {
    var myVote = this.myVote?.metadata['vote/value']
    return html`
      <span class="vote-ctrl">
        <a class="up ${myVote == 1 ? 'pressed' : ''}" data-tooltip="Upvote" @click=${e => this.onToggleVote(e, 1)}>
          <span class="far fa-thumbs-up"></span>
          <span class="count">${this.upvoteCount}</span>
        </a>
        <a class="down ${myVote == -1 ? 'pressed' : ''}" data-tooltip="Downvote" @click=${e => this.onToggleVote(e, -1)}>
          <span class="far fa-thumbs-down"></span>
          <span class="count">${this.downvoteCount}</span>
        </a>
      </span>
    `
  }

  renderCommentsCtrl () {
    return html`
      <a class="comment-ctrl" @click=${this.onViewThread}>
        <span class="far fa-comment"></span>
        ${this.record?.commentCount}
      </a>
    `
  }

  renderMatchText (key) {
    if (!this.searchTerms) return undefined
    let v = key === 'content' ? this.record.content : this.record.metadata[key]
    if (!v) return undefined
    let re = new RegExp(`(${this.searchTerms.replace(/([\s]+)/g, '|')})`, 'gi')
    let text = removeMarkdown(v).replace(re, match => `<b>${match}</b>`)

    // if there were no facet highlights then it was a link url (or similar) that matched
    // and `removeMarkdown()` has hidden that, which makes the result confusing
    // so we need to show the markdown syntax if that's the case
    let start = text.indexOf('<b>')
    if (start === -1) {
      text = v.replace(re, match => `<b>${match}</b>`)
      start = text.indexOf('<b>')
    }

    // slice to the matched text
    if (start > 50) text = `...${text.slice(start - 50)}`
    let end = text.indexOf('</b>')
    if ((text.length - end) > 200) text = `${text.slice(0, end + 200)}...`

    return unsafeHTML(text)
  }

  renderNotification () {
    const res = this.record
    const link = res.links.find(l => l.url.startsWith(this.profileUrl))
    var type = getRecordType(res)
    var description = 'linked to'
    if (type === 'vote') {
      if (res.metadata['vote/value'] == '1') {
        description = 'upvoted'
      } else if (res.metadata['vote/value'] == '-1') {
        description = 'downvoted'
      } else {
        description = 'linked to'
      }
    } else if (link.source === 'content') {
      if (type === 'microblogpost' || type === 'comment') {
        description = 'mentioned'
      }
    } else if (link.source === 'metadata:href') {
      if (type === 'bookmark') {
        description = 'bookmarked'
      } else if (type === 'subscription') {
        description = 'subscribed to'
      }
    } else if (link.source === 'metadata:comment/subject') {
      description = 'commented on'
    } else if (link.source === 'metadata:comment/parent') {
      description = 'replied to'
    }
    var where = ({
      'page': 'in',
      'blogpost': 'in'
    })[type] || ''
    return html`
      <div class="notification">
        ${res.site.title}
        ${description}
        <a href=${link.url}>
          ${asyncReplace(getNotificationSubjectStream(link.url, this.profileUrl))}
        </a>
        ${where}
      </div>
    `
  }

  // events
  // =

  onClickReply (e) {
    e.preventDefault()
    this.isReplyOpen = true
  }

  onPublishReply (e) {
    e.preventDefault()
    e.stopPropagation()
    this.isReplyOpen = false
    emit(this, 'publish-reply')
  }

  onCancelReply (e) {
    this.isReplyOpen = false
  }

  onViewThread (e, record) {
    if (!this.viewContentOnClick && e.button === 0 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      emit(this, 'view-thread', {detail: {record: this.record}})
    }
  }

  async onViewWrapperThread (e) {
    if (!this.viewContentOnClick && e.button === 0 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      e.stopPropagation()
      let {record} = await beaker.index.gql(`
        record (url: "${this.record.metadata.href}") {
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
      emit(this, 'view-thread', {detail: {record}})
    }
  }

  onClickReadMore () {
    this.constrainHeight = false
    this.showReadMore = false
  }

  onMousedownCard (e) {
    for (let el of e.path) {
      if (el.tagName === 'A' || el.tagName === 'BEAKER-POST-COMPOSER') return
    }
    this.isMouseDown = true
    this.isMouseDragging = false
  }

  onMousemoveCard (e) {
    if (this.isMouseDown) {
      this.isMouseDragging = true
    }
  }

  onMouseupCard (e) {
    if (!this.isMouseDown) return
    if (!this.isMouseDragging) {
      e.preventDefault()
      e.stopPropagation()
      emit(this, 'view-thread', {detail: {record: this.record}})
    }
    this.isMouseDown = false
    this.isMouseDragging = false
  }

  onClickShowSites (e, results) {
    e.preventDefault()
    SitesListPopup.create('Subscribed Sites', results.map(r => ({
      url: r.metadata.href,
      title: r.metadata.title || 'Untitled'
    })))
  }

  async onToggleVote (e, value) {
    if (this.myVote) {
      if (this.myVote.metadata['vote/value'] == value) {
        await beaker.hyperdrive.unlink(this.myVote.url)
      } else {
        await beaker.hyperdrive.updateMetadata(this.myVote.url, {'vote/value': value})
      }
    } else {
      var drive = this.record.url.startsWith('hyper://private')
        ? beaker.hyperdrive.drive('hyper://private')
        : beaker.hyperdrive.drive(this.profileUrl)
      await drive.writeFile(`/votes/${Date.now()}.goto`, '', {
        metadata: {
          href: this.record.url,
          'vote/value': value
        }
      })
    }
    this.reloadSignals()
  }
}

customElements.define('beaker-record', Record)

function removeFirstMdHeader (str = '') {
  return str.replace(/(^#\s.*\r?\n)/, '').trim()
}

var _notificationSubjectCache = {}
async function getNotificationSubject (url) {
  if (_notificationSubjectCache[url]) {
    return _notificationSubjectCache[url]
  }
  try {
    let {record} = await beaker.index.gql(`
      record (url: "${url}") {
        path
        metadata
      }
    `)
    if (record.metadata.title) {
      return `"${record.metadata.title}"`
    }
    switch (getRecordType(record)) {
      case 'comment': return 'your comment'
      case 'page': return 'your page'
      case 'blogpost': return 'your blog post'
      case 'microblogpost': return 'your post'
    }
  } catch {}
  return 'your page'
}

async function* getNotificationSubjectStream (url, profileUrl) {
  if (isRootUrl(url)) {
    if (url === profileUrl) {
      yield 'you'
    } else {
      yield 'your site'
    }
  } else {
    yield await getNotificationSubject(url)
  }
}

var _loadAndSimpleRenderCache = {}
async function* loadAndSimpleRender (url) {
  if (_loadAndSimpleRenderCache[url]) {
    yield _loadAndSimpleRenderCache[url]
    return
  }
  yield html`Loading...`
  try {
    let st = await beaker.hyperdrive.stat(url)
    if (st.metadata.title) {
      _loadAndSimpleRenderCache[url] = st.metadata.title
      yield st.metadata.title
      return
    }
    if (url.endsWith('.md')) {
      let content = await beaker.hyperdrive.readFile(url)
      _loadAndSimpleRenderCache[url] = shorten(removeMarkdown(content), 200)
      yield _loadAndSimpleRenderCache[url]
      return
    }
  } catch {}
  for await (let v of fancyUrlAsync(url)) {
    yield v
  }
}

function isRootUrl (url) {
  try {
    return (new URL(url)).pathname === '/'
  } catch {
    return false
  }
}

const today = (new Date()).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
const yesterday = (new Date(Date.now() - 8.64e7)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
function niceDate (ts, {largeIntervals} = {largeIntervals: false}) {
  var date = (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'short', day: 'numeric' })
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  if (largeIntervals) {
    return (new Date(ts)).toLocaleDateString('default', { year: 'numeric', month: 'long' })
  }
  return date
}

const MINUTE = 1e3 * 60
const HOUR = 1e3 * 60 * 60
const DAY = HOUR * 24

const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'})
function relativeDate (d) {
  const nowMs = Date.now()
  const endOfTodayMs = +((new Date).setHours(23,59,59,999))
  var diff = nowMs - d
  var dayDiff = Math.floor((endOfTodayMs - d) / DAY)
  if (diff < (MINUTE * 5)) return 'just now'
  if (diff < HOUR) return rtf.format(Math.ceil(diff / MINUTE * -1), 'minute')
  if (dayDiff < 1) return rtf.format(Math.ceil(diff / HOUR * -1), 'hour')
  if (dayDiff <= 30) return rtf.format(dayDiff * -1, 'day')
  if (dayDiff <= 365) return rtf.format(Math.floor(dayDiff / 30) * -1, 'month')
  return rtf.format(Math.floor(dayDiff / 365) * -1, 'year')
}